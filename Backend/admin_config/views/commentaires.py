from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from admin_config.models.gamme import Gamme, GlobalEVComment
from admin_config.models.results import StepValidation
from admin_config.serializers.gamme_serializers import GlobalEVCommentSerializer
from admin_config.serializers.result_serilaizers import StepValidationSerializer
from drf_spectacular.utils import extend_schema
from admin_config.services.audit_service import log_audit_event
from admin_config.services.gamme_validation_dates import sync_gamme_validation_dates
from admin_config.services.access_control import (
    COMMENT_WRITE_LEVELS,
    can_comment_gamme,
    can_comment_gamme_id,
    can_read_gamme,
    can_read_gamme_id,
    can_validate_gamme,
    filter_queryset_by_project_access,
    forbidden_response,
    gamme_exists,
    has_any_role_level,
)
from rest_framework import status, permissions


class StepValidationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Validations"],
        summary="Creer une validation de step",
        description="Enregistre une cotation pour un EV/step et synchronise les dates de validation.",
    )
    def post(self, request):
        gamme_id = request.data.get("gamme")

        if gamme_id:
            try:
                gamme = Gamme.objects.select_related("projet").get(id=gamme_id)
            except (Gamme.DoesNotExist, ValueError):
                return Response(
                    {"detail": "Gamme introuvable."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not can_validate_gamme(request.user, gamme):
                return forbidden_response()

        serializer = StepValidationSerializer(data=request.data)

        if serializer.is_valid():
            validation = serializer.save(user=request.user)
            sync_gamme_validation_dates(validation.gamme)
            log_audit_event(
                request=request,
                action="STEP_VALIDATION_CREATED",
                entity_type="step_validation",
                entity_id=validation.id,
                projet=validation.gamme.projet,
                projet_id=validation.gamme.projet_id,
                gamme=validation.gamme,
                gamme_id=validation.gamme_id,
                metadata={
                    "ev_code": validation.ev_code,
                    "step_code": validation.step_code,
                    "cotation": validation.cotation,
                    "nom_gamme": validation.gamme.nom_gamme or validation.gamme.nom,
                    "has_commentaire": bool(validation.commentaire),
                },
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StepHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Validations"],
        summary="Historique d'un step",
        description="Retourne l'historique des cotations d'un step.",
    )
    def get(self, request, step_code):
        validations = StepValidation.objects.filter(
            step_code=step_code
        ).order_by("-created_at")
        validations = filter_queryset_by_project_access(
            validations,
            request.user,
            "gamme__projet",
        )

        serializer = StepValidationSerializer(validations, many=True)
        return Response(serializer.data)


class GammeStepValidationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Validations"],
        summary="Historique des validations d'une gamme",
        description="Retourne toutes les validations enregistrees pour une gamme.",
    )
    def get(self, request, gamme_id):
        if not can_read_gamme_id(request.user, gamme_id):
            if not gamme_exists(gamme_id):
                return Response(
                    {"detail": "Gamme introuvable."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return forbidden_response()

        validations = StepValidation.objects.filter(
            gamme_id=gamme_id
        ).order_by("-created_at")

        serializer = StepValidationSerializer(validations, many=True)
        return Response(serializer.data)

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
    summary="Creer un commentaire global EV",
    description="Ajoute un commentaire global pour un EV.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_global_ev_comment(request):
    ev_code = request.data.get("ev_code")
    gamme_id = request.data.get("gamme") or request.data.get("gamme_id")
    commentaire = request.data.get("commentaire", "").strip()

    if not ev_code:
        return Response(
            {"detail": "ev_code est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not commentaire:
        return Response(
            {"detail": "Le commentaire est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if gamme_id:
        try:
            gamme = Gamme.objects.select_related("projet").get(id=gamme_id)
        except (Gamme.DoesNotExist, ValueError):
            return Response(
                {"detail": "Gamme introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not can_comment_gamme(request.user, gamme):
            return forbidden_response()
    elif not has_any_role_level(request.user, COMMENT_WRITE_LEVELS):
        return forbidden_response()

    comment = GlobalEVComment.objects.create(
        ev_code=ev_code,
        commentaire=commentaire,
        user=request.user,
    )

    log_audit_event(
        request=request,
        action="GLOBAL_EV_COMMENT_CREATED",
        entity_type="global_ev_comment",
        entity_id=comment.id,
        gamme=gamme if gamme_id else None,
        projet=gamme.projet if gamme_id else None,
        metadata={
            "ev_code": ev_code,
            "gamme_id": gamme_id,
        },
    )

    serializer = GlobalEVCommentSerializer(
        comment,
        context={"request": request}
    )

    return Response(serializer.data, status=status.HTTP_201_CREATED)

@extend_schema(
    tags=["Validations"],
    summary="Modifier un commentaire global EV",
    description="Modifie un commentaire global EV existant.",
)
@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_global_ev_comment(request, comment_id):
    gamme_id = request.data.get("gamme") or request.data.get("gamme_id")
    commentaire = request.data.get("commentaire", "").strip()

    if not commentaire:
        return Response(
            {"detail": "Le commentaire est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        comment = GlobalEVComment.objects.get(id=comment_id)
    except GlobalEVComment.DoesNotExist:
        return Response(
            {"detail": "Commentaire introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not request.user.is_superuser and comment.user_id != request.user.id:
        return Response(
            {"detail": "Vous ne pouvez modifier que vos propres commentaires."},
            status=status.HTTP_403_FORBIDDEN
        )

    if gamme_id and not can_comment_gamme_id(request.user, gamme_id):
        return forbidden_response()

    comment.commentaire = commentaire
    comment.save()

    log_audit_event(
        request=request,
        action="GLOBAL_EV_COMMENT_UPDATED",
        entity_type="global_ev_comment",
        entity_id=comment.id,
        gamme_id=gamme_id,
        metadata={
            "ev_code": comment.ev_code,
            "gamme_id": gamme_id,
        },
    )

    serializer = GlobalEVCommentSerializer(
        comment,
        context={"request": request}
    )

    return Response(serializer.data)

@extend_schema(
    tags=["Validations"],
    summary="Lister les commentaires globaux EV",
    description="Retourne les commentaires globaux associes a un EV.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_global_ev_comments(request):
    ev_code = request.GET.get("ev_code")
    gamme_id = request.GET.get("gamme") or request.GET.get("gamme_id")

    if not ev_code:
        return Response(
            {"detail": "ev_code est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if gamme_id and not can_read_gamme_id(request.user, gamme_id):
        if not gamme_exists(gamme_id):
            return Response(
                {"detail": "Gamme introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return forbidden_response()

    comments = GlobalEVComment.objects.filter(
        ev_code=ev_code
    ).order_by("-created_at")

    serializer = GlobalEVCommentSerializer(
        comments,
        many=True,
        context={"request": request}
    )

    return Response(serializer.data)


@extend_schema(
    tags=["Validations"],
    summary="Supprimer un commentaire global EV",
    description="Supprime un commentaire global EV existant.",
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_global_ev_comment(request, comment_id):
    gamme_id = request.GET.get("gamme") or request.GET.get("gamme_id")

    try:
        comment = GlobalEVComment.objects.get(id=comment_id)
    except GlobalEVComment.DoesNotExist:
        return Response(
            {"detail": "Commentaire introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not request.user.is_superuser and comment.user_id != request.user.id:
        return Response(
            {"detail": "Vous ne pouvez supprimer que vos propres commentaires."},
            status=status.HTTP_403_FORBIDDEN
        )

    if gamme_id and not can_comment_gamme_id(request.user, gamme_id):
        return forbidden_response()

    log_audit_event(
        request=request,
        action="GLOBAL_EV_COMMENT_DELETED",
        entity_type="global_ev_comment",
        entity_id=comment.id,
        gamme_id=gamme_id,
        metadata={
            "ev_code": comment.ev_code,
            "gamme_id": gamme_id,
        },
    )

    comment.delete()

    return Response(
        {"message": "Commentaire supprimé avec succès."},
        status=status.HTTP_200_OK
    )

