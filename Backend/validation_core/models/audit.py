from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    user_email = models.EmailField(blank=True)
    action = models.CharField(max_length=100, db_index=True)
    entity_type = models.CharField(max_length=100, blank=True, db_index=True)
    entity_id = models.CharField(max_length=100, blank=True, db_index=True)
    projet = models.ForeignKey(
        "admin_config.Projet",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    gamme = models.ForeignKey(
        "admin_config.Gamme",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["created_at", "action"],
                name="admin_confi_created_0ebb90_idx",
            ),
            models.Index(
                fields=["entity_type", "entity_id"],
                name="admin_confi_entity__53be8e_idx",
            ),
        ]

    def __str__(self):
        actor = self.user_email or "system"
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} - {actor} - {self.action}"
