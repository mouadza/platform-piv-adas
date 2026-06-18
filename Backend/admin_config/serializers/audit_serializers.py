from rest_framework import serializers

from admin_config.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    projet_nom = serializers.CharField(source="projet.nom_projet", read_only=True)
    gamme_nom = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "created_at",
            "action",
            "entity_type",
            "entity_id",
            "user",
            "username",
            "user_email",
            "projet",
            "projet_nom",
            "gamme",
            "gamme_nom",
            "metadata",
            "ip_address",
            "user_agent",
        ]

    def get_gamme_nom(self, obj):
        if obj.gamme:
            return obj.gamme.nom_gamme or obj.gamme.nom or str(obj.gamme)

        gamme_id = (obj.metadata or {}).get("gamme_id")

        if not gamme_id:
            return ""

        from admin_config.models import Gamme

        gamme = Gamme.objects.filter(id=gamme_id).only(
            "nom_gamme",
            "nom",
        ).first()

        if not gamme:
            return ""

        return gamme.nom_gamme or gamme.nom or str(gamme)
