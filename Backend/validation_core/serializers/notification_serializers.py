from rest_framework import serializers

from validation_core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    projet_nom = serializers.CharField(
        source="projet.nom_projet",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "type",
            "projet",
            "projet_nom",
            "target_url",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields
