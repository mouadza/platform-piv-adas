from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        USER_AFFECTED = "USER_AFFECTED", "Utilisateur affecte"
        PROJECT_ASSIGNED = "PROJECT_ASSIGNED", "Projet affecte"
        GAMME_ADDED_TO_PROJECT = "GAMME_ADDED_TO_PROJECT", "Gamme ajoutee au projet"
        GAMME_STARTED = "GAMME_STARTED", "Debut de gamme"
        GAMME_FINISHED = "GAMME_FINISHED", "Fin de gamme"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=50, choices=Type.choices)
    projet = models.ForeignKey(
        "admin_config.Projet",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    target_url = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "created_at"]),
            models.Index(fields=["type"]),
        ]

    def __str__(self):
        return f"{self.recipient_id} - {self.type} - {self.title}"
