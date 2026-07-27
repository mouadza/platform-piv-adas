from django.conf import settings
from django.db import models


class GammeGeneralComment(models.Model):
    TYPE_CHOICES = [
        ("BESOINS", "Besoins techniques"),
        ("PISTES", "Pistes"),
    ]

    gamme = models.ForeignKey(
        "Gamme",
        on_delete=models.CASCADE,
        related_name="general_comments"
    )

    type_commentaire = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gamme_general_comments"
    )

    commentaire = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["gamme", "type_commentaire"]),
        ]

    def __str__(self):
        return f"{self.gamme_id} - {self.type_commentaire} - {self.user}"