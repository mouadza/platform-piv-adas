from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from validation_core.audit_actions import VISIBLE_AUDIT_ACTIONS
from validation_core.models import AuditLog
from validation_core.permissions import IsAdminUserOnly
from validation_core.serializers.audit_serializers import AuditLogSerializer


@extend_schema(
    tags=["Audit"],
    summary="Lister les logs d'audit",
    description="Retourne les actions auditees avec filtres par action, entite, projet, gamme ou utilisateur.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUserOnly])
def list_audit_logs(request):
    logs = AuditLog.objects.select_related(
        "user",
        "projet",
        "gamme",
    ).filter(
        action__in=VISIBLE_AUDIT_ACTIONS,
    ).order_by("-created_at")

    action = request.query_params.get("action")
    entity_type = request.query_params.get("entity_type")
    projet_id = request.query_params.get("projet")
    gamme_id = request.query_params.get("gamme")
    user_id = request.query_params.get("user")

    if action:
        logs = logs.filter(action=action)

    if entity_type:
        logs = logs.filter(entity_type=entity_type)

    if projet_id:
        logs = logs.filter(projet_id=projet_id)

    if gamme_id:
        logs = logs.filter(gamme_id=gamme_id)

    if user_id:
        logs = logs.filter(user_id=user_id)

    try:
        limit = min(int(request.query_params.get("limit", 100)), 500)
    except ValueError:
        limit = 100

    serializer = AuditLogSerializer(logs[:limit], many=True)
    return Response(serializer.data)
