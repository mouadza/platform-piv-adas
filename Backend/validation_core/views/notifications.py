from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from validation_core.models import Notification
from validation_core.serializers.notification_serializers import (
    NotificationSerializer,
)


@extend_schema(
    tags=["Notifications"],
    summary="Lister les notifications",
    description="Retourne les notifications de l'utilisateur connecte.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    limit = request.query_params.get("limit")
    unread = request.query_params.get("unread")

    notifications = Notification.objects.filter(
        recipient=request.user
    ).select_related("projet")

    if str(unread).lower() in {"1", "true", "yes"}:
        notifications = notifications.filter(is_read=False)

    if limit:
        try:
            notifications = notifications[: max(1, min(int(limit), 50))]
        except ValueError:
            notifications = notifications[:10]

    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=["Notifications"],
    summary="Compter les notifications non lues",
    description="Retourne le nombre de notifications non lues.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_notifications_count(request):
    count = Notification.objects.filter(
        recipient=request.user,
        is_read=False,
    ).count()
    return Response({"count": count})


@extend_schema(
    tags=["Notifications"],
    summary="Marquer une notification comme lue",
    description="Marque une notification de l'utilisateur connecte comme lue.",
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    updated = Notification.objects.filter(
        id=notification_id,
        recipient=request.user,
        is_read=False,
    ).update(is_read=True, read_at=timezone.now())

    if not updated and not Notification.objects.filter(
        id=notification_id,
        recipient=request.user,
    ).exists():
        return Response(
            {"detail": "Notification introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({"status": "ok"})


@extend_schema(
    tags=["Notifications"],
    summary="Marquer toutes les notifications comme lues",
    description="Marque toutes les notifications de l'utilisateur connecte comme lues.",
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(
        recipient=request.user,
        is_read=False,
    ).update(is_read=True, read_at=timezone.now())

    return Response({"status": "ok"})
