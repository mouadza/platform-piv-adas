from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from validation_core.models.gamme import Gamme
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from drf_spectacular.utils import extend_schema
from validation_core.models.commentaire import GammeGeneralComment
from validation_core.models.results import StepValidation
from validation_core.services.audit_service import log_audit_event
from validation_core.services.access_control import (
    can_comment_gamme,
    can_read_gamme,
    forbidden_response,
    is_super_admin,
)


def is_admin_user(CustomUser):
    return is_super_admin(CustomUser)

def get_user_display_name(user):
    if hasattr(user, "get_full_name") and user.get_full_name():
        return user.get_full_name()

    if hasattr(user, "username") and user.username:
        return user.username

    if hasattr(user, "email") and user.email:
        return user.email

    return str(user)

@extend_schema(
    tags=["Validations"],
    summary="Lister les commentaires generaux d'une gamme",
    description="Liste les commentaires de type BESOINS ou PISTES d'une gamme.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lister_gamme_general_comments(request, gamme_id, type_commentaire):
    type_commentaire = type_commentaire.upper()

    if type_commentaire not in ["BESOINS", "PISTES"]:
        return Response(
            {"detail": "Type commentaire invalide."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        gamme = Gamme.objects.select_related("projet").get(id=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"detail": "Gamme introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    commentaires = GammeGeneralComment.objects.filter(
        gamme_id=gamme_id,
        type_commentaire=type_commentaire
    ).order_by("-created_at")

    data = [
        {
            "id": c.id,
            "auteur": get_user_display_name(c.user),
            "texte": c.commentaire,
            "date": c.created_at,
            "updated_at": c.updated_at,
            "type_commentaire": c.type_commentaire,
            "can_edit": c.user_id == request.user.id or is_admin_user(request.user),
        }
        for c in commentaires
    ]

    return Response(data)


@extend_schema(
    tags=["Validations"],
    summary="Ajouter un commentaire general de gamme",
    description="Ajoute un commentaire de type BESOINS ou PISTES.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ajouter_gamme_general_comment(request):
    gamme_id = request.data.get("gamme")
    type_commentaire = request.data.get("type_commentaire")
    commentaire = request.data.get("commentaire") or request.data.get("texte")

    if not gamme_id:
        return Response(
            {"detail": "gamme est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not type_commentaire:
        return Response(
            {"detail": "type_commentaire est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    type_commentaire = type_commentaire.upper()

    if type_commentaire not in ["BESOINS", "PISTES"]:
        return Response(
            {"detail": "Type commentaire invalide."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not commentaire or not commentaire.strip():
        return Response(
            {"detail": "commentaire est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        gamme = Gamme.objects.select_related("projet").get(id=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"detail": "Gamme introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_comment_gamme(request.user, gamme):
        return forbidden_response()

    obj = GammeGeneralComment.objects.create(
        gamme=gamme,
        type_commentaire=type_commentaire,
        user=request.user,
        commentaire=commentaire.strip()
    )

    log_audit_event(
        request=request,
        action="GAMME_GENERAL_COMMENT_CREATED",
        entity_type="gamme_general_comment",
        entity_id=obj.id,
        projet=gamme.projet,
        gamme=gamme,
        metadata={"type_commentaire": type_commentaire},
    )

    return Response(
        {
            "id": obj.id,
            "auteur": get_user_display_name(obj.user),
            "texte": obj.commentaire,
            "date": obj.created_at,
            "updated_at": obj.updated_at,
            "type_commentaire": obj.type_commentaire,
            "can_edit": True,
        },
        status=status.HTTP_201_CREATED
    )

@extend_schema(
    tags=["Validations"],
    summary="Modifier un commentaire general de gamme",
    description="Modifie un commentaire general existant.",
)
@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def modifier_gamme_general_comment(request, commentaire_id):
    texte = request.data.get("commentaire") or request.data.get("texte")

    if not texte or not texte.strip():
        return Response(
            {"detail": "Le commentaire ne peut pas être vide."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        commentaire = GammeGeneralComment.objects.select_related(
            "gamme__projet"
        ).get(id=commentaire_id)
    except GammeGeneralComment.DoesNotExist:
        return Response(
            {"detail": "Commentaire introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_comment_gamme(request.user, commentaire.gamme):
        return forbidden_response()

    if commentaire.user_id != request.user.id and not is_admin_user(request.user):
        return Response(
            {"detail": "Vous ne pouvez modifier que vos propres commentaires."},
            status=status.HTTP_403_FORBIDDEN
        )

    commentaire.commentaire = texte.strip()
    commentaire.save()

    log_audit_event(
        request=request,
        action="GAMME_GENERAL_COMMENT_UPDATED",
        entity_type="gamme_general_comment",
        entity_id=commentaire.id,
        projet=commentaire.gamme.projet,
        gamme=commentaire.gamme,
        metadata={"type_commentaire": commentaire.type_commentaire},
    )

    return Response({
        "id": commentaire.id,
        "auteur": get_user_display_name(commentaire.user),
        "texte": commentaire.commentaire,
        "date": commentaire.created_at,
        "updated_at": commentaire.updated_at,
        "type_commentaire": commentaire.type_commentaire,
        "can_edit": True,
    })

@extend_schema(
    tags=["Validations"],
    summary="Supprimer un commentaire general de gamme",
    description="Supprime un commentaire general existant.",
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def supprimer_gamme_general_comment(request, commentaire_id):
    try:
        commentaire = GammeGeneralComment.objects.select_related(
            "gamme__projet"
        ).get(id=commentaire_id)
    except GammeGeneralComment.DoesNotExist:
        return Response(
            {"detail": "Commentaire introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_comment_gamme(request.user, commentaire.gamme):
        return forbidden_response()

    if commentaire.user_id != request.user.id and not is_admin_user(request.user):
        return Response(
            {"detail": "Vous ne pouvez supprimer que vos propres commentaires."},
            status=status.HTTP_403_FORBIDDEN
        )

    log_audit_event(
        request=request,
        action="GAMME_GENERAL_COMMENT_DELETED",
        entity_type="gamme_general_comment",
        entity_id=commentaire.id,
        projet=commentaire.gamme.projet,
        gamme=commentaire.gamme,
        metadata={"type_commentaire": commentaire.type_commentaire},
    )

    commentaire.delete()

    return Response(
        {"detail": "Commentaire supprimé avec succès."},
        status=status.HTTP_200_OK
    )

@extend_schema(
    tags=["Validations"],
    summary="Etat de validation d'une gamme",
    description="Indique si la validation d'une gamme a deja commence.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gamme_validation_state(request, gamme_id):
    try:
        gamme = Gamme.objects.select_related("projet").get(id=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"detail": "Gamme introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    started = StepValidation.objects.filter(gamme_id=gamme_id).exists()

    return Response({
        "gamme_id": gamme_id,
        "started": started,
        "can_download_kpi": started,
    })

