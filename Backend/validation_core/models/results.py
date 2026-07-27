from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from validation_core.models.gamme import Gamme


class ResultatChoices(models.TextChoices):
    NON_COTE = "Non_coté", "Non coté"
    OK = "OK", "OK"
    NOK_MINEUR = "NOK mineur", "NOK mineur"
    NOK = "NOK", "NOK"
    A_COTER = "A_coter", "À coter"


class BlocResultat(models.Model):
    titre_bloc = models.CharField(max_length=255)
    resultat = models.CharField(max_length=20, choices=ResultatChoices.choices)
    commentaires = models.JSONField(default=list)
    date_sauvegarde = models.DateTimeField(auto_now=True)


class LigneBloc(models.Model):
    bloc = models.ForeignKey(BlocResultat, on_delete=models.CASCADE, related_name="lignes")
    numero_ligne = models.PositiveIntegerField()
    resultat = models.CharField(max_length=20, choices=ResultatChoices.choices)
    commentaires = models.JSONField(default=list)
    date_sauvegarde = models.DateTimeField(auto_now=True)


class StepValidation(models.Model):
    COTATION_CHOICES = [
        ("A_coter", "À coter"),
        ("OK", "OK"),
        ("NOK_mineur", "NOK Mineur"),
        ("NOK", "NOK"),
        ("Non_coté", "Non coté"),
    ]

    gamme = models.ForeignKey(
        Gamme,
        on_delete=models.CASCADE,
        related_name="step_validations"
    )

    ev_code = models.CharField(
        max_length=150,
        db_index=True,
        blank=True
    )

    step_code = models.CharField(max_length=150, db_index=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="step_validations"
    )

    cotation = models.CharField(
        max_length=50,
        choices=COTATION_CHOICES
    )

    commentaire = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["gamme", "ev_code"]),
            models.Index(fields=["gamme", "ev_code", "step_code"]),
            models.Index(fields=["step_code"]),
        ]

    def clean(self):
        if self.cotation != "OK" and not self.commentaire:
            raise ValidationError({
                "commentaire": "Le commentaire est obligatoire pour une cotation différente de OK."
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ev_code} - {self.step_code} - {self.cotation}"
