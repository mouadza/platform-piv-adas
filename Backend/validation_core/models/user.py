from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    username = models.CharField(
        max_length=150,
        unique=True,
        blank=False,
        null=False,
        help_text="Nom utilisateur. Les espaces sont autorisés.",
        validators=[],  # important : supprime le validateur Django par défaut
        error_messages={
            "unique": "Un utilisateur avec ce nom existe déjà.",
        },
    )

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return self.username