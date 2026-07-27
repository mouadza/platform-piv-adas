from django.http import HttpResponse
import os
from urllib.parse import quote

from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from validation_core.services.gamme_service import (
    list_gammes_by_projet_service,
)
from validation_core.services.gamme_validation_dates import sync_gamme_validation_dates
from validation_core.services.gamme_modified_excel_service import (
    generate_modified_gamme_excel,
)
from validation_core.services.gamme_parse_storage import (
    get_ready_parsed_gamme,
    schedule_gamme_parsing,
)
from validation_core.services.audit_service import log_audit_event
from validation_core.services.notification_service import (
    notify_admins_gamme_finished,
    notify_admins_gamme_started,
    notify_project_gamme_added,
)
from validation_core.services.access_control import (
    can_manage_gamme,
    can_manage_project_gammes,
    can_read_gamme,
    can_read_project,
    forbidden_response,
    has_any_role_level,
    has_project_access,
    project_exists,
)

from validation_core.models import Affectation, Gamme, GammeParsedData
from validation_core.services.excel_gamme_service import extract_nom_gamme_from_excel
from validation_core.serializers.gamme_serializers import (
    GammeCreateSerializer,
    GammeDatesSerializer,
    GammeListSerializer,
    GammeValideurSerializer,
)

def normalize_filename(filename):
    return os.path.basename(filename).strip()


GAMME_DATE_FIELDS = ("date_debut", "date_fin")


def can_update_gamme_dates(user, gamme=None):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    affectations = Affectation.objects.filter(user=user)

    if gamme is not None:
        affectations = affectations.filter(projet=gamme.projet)

    return (
        affectations.filter(role__code__iexact="ADMIN").exists()
        or affectations.filter(role__access_level__iexact="ADMIN").exists()
    )


def request_has_gamme_date_fields(data):
    return any(field in data for field in GAMME_DATE_FIELDS)


def request_has_gamme_date_values(data):
    return any(data.get(field) not in [None, ""] for field in GAMME_DATE_FIELDS)


def _parse_status_payload(record, *, queued=False):
    if not record:
        return {
            "parse_status": "NOT_STARTED",
            "progress": 0,
            "ready": False,
            "queued": queued,
            "error_message": "",
        }

    return {
        "parse_status": record.status,
        "progress": record.progress,
        "ready": record.status == GammeParsedData.Status.SUCCESS,
        "queued": queued,
        "error_message": record.error_message,
        "updated_at": record.updated_at,
        "parsed_at": record.parsed_at,
    }


@extend_schema(
    tags=["Gammes"],
    summary="Importer des gammes",
    description="Importe un ou plusieurs fichiers Excel de gammes pour un projet.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def import_gammes(request):
    fichiers = request.FILES.getlist("fichierGamme")

    if not fichiers:
        return Response(
            {"detail": "Au moins un fichier de gamme est requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    projet_id = request.data.get("projet")

    if not projet_id:
        return Response(
            {"detail": "projet est requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not project_exists(projet_id):
        return Response(
            {"detail": "Projet introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_manage_project_gammes(request.user, projet_id):
        return forbidden_response()

    if request_has_gamme_date_values(request.data) and not has_project_access(request.user, projet_id, ["ADMIN"]):
        return Response(
            {"error": "Vous n'avez pas le droit de modifier les dates de cette gamme."},
            status=status.HTTP_403_FORBIDDEN,
        )

    fichiers_associe = request.FILES.getlist("fichierAssocie")
    vehicules = request.data.getlist("vehicules")

    # Nettoyer les véhicules vides
    vehicules = [
        v for v in vehicules
        if v not in ["", None, "null", "undefined"]
    ]

    OPTIONAL_FIELDS = [
        "nom",
        "type_procedure",
        "fonction_gamme",
        "nombre_jours",
        "date_debut",
        "date_fin",
        "boitiers",
        "pistes",
    ]

    extra_data = {}

    for key in OPTIONAL_FIELDS:
        value = request.data.get(key)

        if value is not None and value != "":
            extra_data[key] = value

    created_ids = []

    # Un seul fichier associé appliqué à toutes les gammes
    associe = fichiers_associe[0] if fichiers_associe else None
    associe_original_name = normalize_filename(associe.name) if associe else None

    # Si aucun véhicule sélectionné, on crée une gamme sans véhicule
    targets = vehicules if vehicules else [None]

    for fichier in fichiers:
        original_name = normalize_filename(fichier.name)
        nom_gamme_extracted = extract_nom_gamme_from_excel(fichier)

        for vehicule_id in targets:
            gamme_data = {
                "projet": projet_id,
                "fichier_gamme": fichier,
            }

            if vehicule_id is not None:
                gamme_data["vehicule"] = vehicule_id

            if associe:
                gamme_data["fichier_associe"] = associe

            gamme_data.update(extra_data)

            serializer = GammeCreateSerializer(data=gamme_data)

            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )

            gamme = serializer.save(
                original_filename=original_name,
                original_associe_filename=associe_original_name,
                nom_gamme=nom_gamme_extracted
            )
            schedule_gamme_parsing(gamme)
            notify_project_gamme_added(gamme, actor=request.user)

            created_ids.append(gamme.id)

    log_audit_event(
        request=request,
        action="GAMMES_IMPORTED",
        entity_type="project",
        entity_id=projet_id,
        projet_id=projet_id,
        metadata={
            "created_count": len(created_ids),
            "gamme_ids": created_ids,
            "file_count": len(fichiers),
            "vehicule_count": len(targets),
        },
    )

    return Response(
        {
            "created": len(created_ids),
            "ids": created_ids,
        },
        status=status.HTTP_201_CREATED,
    )

@extend_schema(
    tags=["Gammes"],
    summary="Creer une gamme",
    description="Cree une gamme dans un projet avec fichier Excel et metadonnees.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_gamme(request, projet_id):
    data = request.data.copy()
    data["projet"] = projet_id

    if not project_exists(projet_id):
        return Response(
            {"detail": "Projet introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_manage_project_gammes(request.user, projet_id):
        return forbidden_response()

    if request_has_gamme_date_values(request.data) and not has_project_access(request.user, projet_id, ["ADMIN"]):
        return Response(
            {"error": "Vous n'avez pas le droit de modifier les dates de cette gamme."},
            status=status.HTTP_403_FORBIDDEN,
        )

    fichier_gamme = (
        request.FILES.get("fichier_gamme")
        or request.FILES.get("fichierGamme")
    )

    fichier_associe = (
        request.FILES.get("fichier_associe")
        or request.FILES.get("fichierAssocie")
    )

    if not fichier_gamme:
        return Response(
            {"detail": "Le fichier de la gamme est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    original_name = normalize_filename(fichier_gamme.name)

    associe_original_name = (
        normalize_filename(fichier_associe.name)
        if fichier_associe
        else None
    )

    data["fichier_gamme"] = fichier_gamme

    if fichier_associe:
        data["fichier_associe"] = fichier_associe

    nom_gamme_extracted = extract_nom_gamme_from_excel(fichier_gamme)

    serializer = GammeCreateSerializer(data=data)
    serializer.is_valid(raise_exception=True)

    gamme = serializer.save(
        original_filename=original_name,
        original_associe_filename=associe_original_name,
        nom_gamme=nom_gamme_extracted
    )
    schedule_gamme_parsing(gamme)
    notify_project_gamme_added(gamme, actor=request.user)

    log_audit_event(
        request=request,
        action="GAMME_CREATED",
        entity_type="gamme",
        entity_id=gamme.id,
        projet_id=projet_id,
        gamme=gamme,
        metadata={
            "nom": gamme.nom,
            "nom_gamme": gamme.nom_gamme,
            "original_filename": gamme.original_filename,
        },
    )

    return Response(
        GammeCreateSerializer(gamme).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    tags=["Gammes"],
    summary="Recuperer un template de gamme",
    description="Retourne les champs reutilisables d'une gamme existante selon type procedure et fonction.",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_gamme_template(request):
    if not has_any_role_level(request.user, ["ADMIN", "PPL"]):
        return forbidden_response()

    type_id = request.GET.get("type_procedure")
    fonction_id = request.GET.get("fonction_gamme")

    if not type_id or not fonction_id:
        return Response({"detail": "Missing params"}, status=400)

    gamme = Gamme.objects.filter(
        type_procedure_id=type_id,
        fonction_gamme_id=fonction_id
    ).order_by("-created_at").first() 

    if not gamme:
        return Response({})

    return Response({
        "boitiers": gamme.boitiers,
        "pistes": gamme.pistes,
        "nombre_jours": gamme.nombre_jours,
    })

@extend_schema(
    tags=["Gammes"],
    summary="Lister les gammes d'un projet",
    description="Retourne les gammes d'un projet accessible a l'utilisateur.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_gammes_by_projet(request, projet_id):
    if not project_exists(projet_id):
        return Response(
            {"detail": "Projet introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_project(request.user, projet_id):
        return forbidden_response()

    gammes = list_gammes_by_projet_service(projet_id)
    serializer = GammeListSerializer(gammes, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Gammes"],
    summary="Lister les gammes pour un valideur",
    description="Retourne les gammes d'un projet dans l'espace valideur.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_gammes_valideur(request, projet_id):
    if not project_exists(projet_id):
        return Response(
            {"detail": "Projet introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_project(request.user, projet_id):
        return forbidden_response()

    gammes = list_gammes_by_projet_service(projet_id)
    serializer = GammeValideurSerializer(gammes, many=True)
    return Response(serializer.data)

@extend_schema(
    tags=["Gammes"],
    summary="Detail d'une gamme",
    description="Retourne les informations detaillees d'une gamme.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gamme_detail(request, gamme_id):
    try:
        gamme = Gamme.objects.select_related(
            "type_procedure",
            "fonction_gamme",
            "projet",
            "vehicule"
        ).get(pk=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    sync_gamme_validation_dates(gamme, overwrite=False)

    serializer = GammeListSerializer(gamme)
    return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Gammes"],
    summary="Supprimer une gamme",
    description="Supprime une gamme et journalise l'action dans l'audit.",
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_gamme(request, gamme_id):
    try:
        gamme = Gamme.objects.select_related("projet").get(pk=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_manage_gamme(request.user, gamme):
        return forbidden_response()

    log_audit_event(
        request=request,
        action="GAMME_DELETED",
        entity_type="gamme",
        entity_id=gamme.id,
        projet=gamme.projet,
        gamme=gamme,
        metadata={
            "nom": gamme.nom,
            "nom_gamme": gamme.nom_gamme,
            "status": gamme.status,
            "original_filename": gamme.original_filename,
        },
    )

    gamme.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["Gammes"],
    summary="Modifier une gamme",
    description="Modifie les metadonnees et fichiers associes d'une gamme.",
)
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_gamme(request, gamme_id):
    try:
        gamme = Gamme.objects.get(pk=gamme_id)
    except Gamme.DoesNotExist:
        return Response({"error": "Gamme introuvable"}, status=status.HTTP_404_NOT_FOUND)

    if not can_manage_gamme(request.user, gamme):
        return forbidden_response()

    audit_metadata = {
        "nom": gamme.nom,
        "status": gamme.status,
        "date_debut": str(gamme.date_debut) if gamme.date_debut else None,
        "date_fin": str(gamme.date_fin) if gamme.date_fin else None,
        "fichier_gamme_changed": bool(
            request.FILES.get("fichierGamme")
            or request.FILES.get("fichier_gamme")
        ),
        "fichier_associe_changed": bool(
            request.FILES.get("fichierAssocie")
            or request.FILES.get("fichier_associe")
        ),
    }

    if request_has_gamme_date_fields(request.data) and not can_update_gamme_dates(request.user, gamme):
        return Response(
            {"error": "Vous n'avez pas le droit de modifier les dates de cette gamme."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Construire data sans les fichiers
    data = {"projet": gamme.projet_id}  # garder le projet existant
    
    OPTIONAL_FIELDS = [
        "nom",
        "type_procedure",
        "fonction_gamme",
        "nombre_jours",
        "date_debut",
        "date_fin",
        "boitiers",
        "pistes",
    ]
    for key in OPTIONAL_FIELDS:
        value = request.data.get(key)
        if value is not None:
            data[key] = value if value != "" else None

    vehicule_value = request.data.get("vehicule", None)
    vehicules_raw = request.data.getlist("vehicules")

    if "vehicule" in request.data:
        if vehicule_value in ["", None, "null", "undefined"]:
            data["vehicule"] = None
        else:
            data["vehicule"] = vehicule_value

    elif "vehicules" in request.data:
        vehicules = [
            v for v in vehicules_raw
            if v not in ["", None, "null", "undefined"]
        ]

        data["vehicule"] = vehicules[0] if vehicules else None


    serializer = GammeCreateSerializer(gamme, data=data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    gamme = serializer.save()

    if not audit_metadata["date_debut"] and gamme.date_debut:
        notify_admins_gamme_started(gamme, actor=request.user)

    if not audit_metadata["date_fin"] and gamme.date_fin:
        notify_admins_gamme_finished(gamme, actor=request.user)

    # Fichiers
    fichier_gamme = (
    request.FILES.get("fichierGamme")
        or request.FILES.get("fichier_gamme")
    )

    fichier_associe = (
        request.FILES.get("fichierAssocie")
        or request.FILES.get("fichier_associe")
    )

    if fichier_gamme:
        gamme.fichier_gamme = fichier_gamme
        gamme.original_filename = normalize_filename(fichier_gamme.name)

    if fichier_associe:
        gamme.fichier_associe = fichier_associe
        gamme.original_associe_filename = normalize_filename(fichier_associe.name)

    if fichier_gamme or fichier_associe:
        gamme.save()

    if fichier_gamme:
        schedule_gamme_parsing(gamme, force=True)

    log_audit_event(
        request=request,
        action="GAMME_UPDATED",
        entity_type="gamme",
        entity_id=gamme.id,
        projet=gamme.projet,
        gamme=gamme,
        metadata={
            **audit_metadata,
            "updated_fields": [
                key for key in OPTIONAL_FIELDS if key in request.data
            ],
        },
    )

    return Response(GammeCreateSerializer(gamme).data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Gammes"],
    summary="Modifier les dates d'une gamme",
    description="Met a jour les dates de debut et de fin d'une gamme.",
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_gamme_dates(request, gamme_id):
    try:
        gamme = Gamme.objects.select_related("projet").get(pk=gamme_id)
    except Gamme.DoesNotExist:
        return Response({"error": "Gamme introuvable"}, status=status.HTTP_404_NOT_FOUND)

    if not can_update_gamme_dates(request.user, gamme):
        return Response(
            {"error": "Vous n'avez pas le droit de modifier les dates de cette gamme."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = GammeDatesSerializer(gamme, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    old_dates = {
        "date_debut": str(gamme.date_debut) if gamme.date_debut else None,
        "date_fin": str(gamme.date_fin) if gamme.date_fin else None,
    }
    gamme = serializer.save()

    if not old_dates["date_debut"] and gamme.date_debut:
        notify_admins_gamme_started(gamme, actor=request.user)

    if not old_dates["date_fin"] and gamme.date_fin:
        notify_admins_gamme_finished(gamme, actor=request.user)

    log_audit_event(
        request=request,
        action="GAMME_DATES_UPDATED",
        entity_type="gamme",
        entity_id=gamme.id,
        projet=gamme.projet,
        gamme=gamme,
        metadata={
            "old_dates": old_dates,
            "new_dates": {
                "date_debut": str(gamme.date_debut) if gamme.date_debut else None,
                "date_fin": str(gamme.date_fin) if gamme.date_fin else None,
            },
        },
    )

    return Response(GammeListSerializer(gamme).data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Gammes"],
    summary="Modifier le statut d'une gamme",
    description="Met a jour le statut fonctionnel d'une gamme.",
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_gamme_status(request, gamme_id):
    try:
        gamme = Gamme.objects.select_related("projet").get(id=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_manage_gamme(request.user, gamme):
        return forbidden_response()

    new_status = request.data.get("status")
    old_status = gamme.status

    gamme.status = new_status
    gamme.save()

    log_audit_event(
        request=request,
        action="GAMME_STATUS_UPDATED",
        entity_type="gamme",
        entity_id=gamme.id,
        projet=gamme.projet,
        gamme=gamme,
        metadata={
            "old_status": old_status,
            "new_status": new_status,
        },
    )

    return Response({"status": "ok"})


@extend_schema(
    tags=["Gammes"],
    summary="Reordonner les gammes",
    description="Met a jour l'ordre d'affichage des gammes.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_gammes(request):
    ordre_list = request.data.get("ordre", [])
    gamme_ids = [item.get("id") for item in ordre_list if item.get("id")]
    gammes = Gamme.objects.select_related("projet").filter(id__in=gamme_ids)
    gammes_by_id = {gamme.id: gamme for gamme in gammes}

    if len(gammes_by_id) != len(set(gamme_ids)):
        return Response(
            {"detail": "Une ou plusieurs gammes sont introuvables."},
            status=status.HTTP_404_NOT_FOUND,
        )

    for gamme in gammes_by_id.values():
        if not can_manage_gamme(request.user, gamme):
            return forbidden_response()

    for item in ordre_list:
        Gamme.objects.filter(id=item["id"]).update(ordre=item["ordre"])

    project_ids = sorted({gamme.projet_id for gamme in gammes_by_id.values()})
    log_audit_event(
        request=request,
        action="GAMMES_REORDERED",
        entity_type="gamme",
        metadata={
            "project_ids": project_ids,
            "ordre": ordre_list,
        },
    )

    return Response({"status": "ok"})

@extend_schema(
    tags=["Gammes"],
    summary="Parser une gamme Excel",
    description="Parse le fichier Excel d'une gamme pour l'affichage et la validation.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_new_gamme(request, gamme_id):
    try:
        gamme = Gamme.objects.get(id=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    if not gamme.fichier_gamme:
        return Response(
            {"error": "Pas de fichier"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        parsed, record = get_ready_parsed_gamme(gamme)
    except (OSError, ValueError) as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if parsed is not None:
        return Response(parsed)

    record, queued = schedule_gamme_parsing(gamme)

    if record.status == GammeParsedData.Status.FAILURE:
        return Response(
            {
                "error": record.error_message or "Le parsing Excel a echoue.",
                **_parse_status_payload(record),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "detail": "Parsing Excel en cours.",
            **_parse_status_payload(record, queued=queued),
        },
        status=status.HTTP_202_ACCEPTED,
    )


@extend_schema(
    tags=["Gammes"],
    summary="Consulter l'etat du parsing d'une gamme",
    description="Retourne la progression du parsing Excel asynchrone.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gamme_parse_status(request, gamme_id):
    try:
        gamme = Gamme.objects.get(id=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    if not gamme.fichier_gamme:
        return Response(
            {"error": "Pas de fichier"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        parsed, record = get_ready_parsed_gamme(gamme)
    except (OSError, ValueError) as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if parsed is not None:
        return Response(_parse_status_payload(record))

    record, queued = schedule_gamme_parsing(gamme)
    response_status = (
        status.HTTP_500_INTERNAL_SERVER_ERROR
        if record.status == GammeParsedData.Status.FAILURE
        else status.HTTP_200_OK
    )
    return Response(
        _parse_status_payload(record, queued=queued),
        status=response_status,
    )


@extend_schema(
    tags=["Gammes"],
    summary="Exporter l'Excel modifie d'une gamme",
    description="Genere et telecharge le fichier Excel modifie apres validations.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_modified_gamme_excel(request, gamme_id):
    try:
        gamme = Gamme.objects.get(pk=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    try:
        result = generate_modified_gamme_excel(gamme)
    except ValueError as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    log_audit_event(
        request=request,
        action="GAMME_EXPORTED",
        entity_type="gamme",
        entity_id=gamme.id,
        projet=gamme.projet,
        gamme=gamme,
        metadata={
            "filename": result["filename"],
            "extension": result["extension"],
        },
    )

    content_types = {
        ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    filename = result["filename"]

    response = HttpResponse(
        result["content"].getvalue(),
        content_type=content_types.get(
            result["extension"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
    )
    response["Content-Disposition"] = (
        f"attachment; filename*=UTF-8''{quote(filename)}"
    )

    return response


