from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from admin_config.models.gamme import Gamme
from admin_config.models.measured_result_comment import StepMeasuredResultComment
from admin_config.serializers.measured_result_comment_serializer import (
    StepMeasuredResultCommentSerializer
)
from admin_config.services.audit_service import log_audit_event
from admin_config.services.access_control import (
    can_comment_gamme,
    can_read_gamme,
    forbidden_response,
    is_super_admin,
)


@extend_schema(
    tags=["Validations"],
    summary="Lister les commentaires de resultat mesure",
    description="Liste les commentaires associes a un EV/step d'une gamme.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_measured_result_comments(request, gamme_id):
    ev_code = request.GET.get("ev_code")
    step_code = request.GET.get("step_code")

    if not ev_code or not step_code:
        return Response(
            {"detail": "ev_code et step_code sont obligatoires."},
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

    comments = StepMeasuredResultComment.objects.filter(
        gamme_id=gamme_id,
        ev_code=ev_code,
        step_code=step_code,
    )

    serializer = StepMeasuredResultCommentSerializer(
        comments,
        many=True,
        context={"request": request}
    )

    return Response(serializer.data)


@extend_schema(
    tags=["Validations"],
    summary="Creer un commentaire de resultat mesure",
    description="Ajoute un commentaire sur un resultat mesure pour un EV/step.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_measured_result_comment(request, gamme_id):
    ev_code = request.data.get("ev_code")
    step_code = request.data.get("step_code")
    commentaire = request.data.get("commentaire", "").strip()

    if not ev_code or not step_code:
        return Response(
            {"detail": "ev_code et step_code sont obligatoires."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not commentaire:
        return Response(
            {"detail": "Le commentaire est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        gamme = Gamme.objects.select_related("projet").get(id=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"detail": "Gamme introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_comment_gamme(request.user, gamme):
        return forbidden_response()

    obj = StepMeasuredResultComment.objects.create(
        gamme_id=gamme_id,
        ev_code=ev_code,
        step_code=step_code,
        commentaire=commentaire,
        user=request.user,
    )

    log_audit_event(
        request=request,
        action="MEASURED_RESULT_COMMENT_CREATED",
        entity_type="measured_result_comment",
        entity_id=obj.id,
        projet=gamme.projet,
        gamme=gamme,
        metadata={
            "ev_code": ev_code,
            "step_code": step_code,
        },
    )

    serializer = StepMeasuredResultCommentSerializer(
        obj,
        context={"request": request}
    )

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Validations"],
    summary="Modifier un commentaire de resultat mesure",
    description="Modifie un commentaire de resultat mesure existant.",
)
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_measured_result_comment(request, comment_id):
    commentaire = request.data.get("commentaire", "").strip()

    if not commentaire:
        return Response(
            {"detail": "Le commentaire est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        obj = StepMeasuredResultComment.objects.select_related(
            "gamme__projet"
        ).get(id=comment_id)
    except StepMeasuredResultComment.DoesNotExist:
        return Response(
            {"detail": "Commentaire introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_comment_gamme(request.user, obj.gamme):
        return forbidden_response()

    if not is_super_admin(request.user) and obj.user_id != request.user.id:
        return Response(
            {"detail": "Vous ne pouvez modifier que vos propres commentaires."},
            status=status.HTTP_403_FORBIDDEN
        )

    obj.commentaire = commentaire
    obj.user = request.user
    obj.save()

    log_audit_event(
        request=request,
        action="MEASURED_RESULT_COMMENT_UPDATED",
        entity_type="measured_result_comment",
        entity_id=obj.id,
        projet=obj.gamme.projet,
        gamme=obj.gamme,
        metadata={
            "ev_code": obj.ev_code,
            "step_code": obj.step_code,
        },
    )

    serializer = StepMeasuredResultCommentSerializer(
        obj,
        context={"request": request}
    )

    return Response(serializer.data)


@extend_schema(
    tags=["Validations"],
    summary="Supprimer un commentaire de resultat mesure",
    description="Supprime un commentaire de resultat mesure existant.",
)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_measured_result_comment(request, comment_id):
    try:
        obj = StepMeasuredResultComment.objects.select_related(
            "gamme__projet"
        ).get(id=comment_id)
    except StepMeasuredResultComment.DoesNotExist:
        return Response(
            {"detail": "Commentaire introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_comment_gamme(request.user, obj.gamme):
        return forbidden_response()

    if not is_super_admin(request.user) and obj.user_id != request.user.id:
        return Response(
            {"detail": "Vous ne pouvez supprimer que vos propres commentaires."},
            status=status.HTTP_403_FORBIDDEN
        )

    log_audit_event(
        request=request,
        action="MEASURED_RESULT_COMMENT_DELETED",
        entity_type="measured_result_comment",
        entity_id=obj.id,
        projet=obj.gamme.projet,
        gamme=obj.gamme,
        metadata={
            "ev_code": obj.ev_code,
            "step_code": obj.step_code,
        },
    )

    obj.delete()

    return Response(
        {"message": "Commentaire supprimé avec succès."},
        status=status.HTTP_200_OK
    )
