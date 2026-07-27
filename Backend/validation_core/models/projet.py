from django.db import models
from validation_core.models.user import CustomUser
from validation_core.models.config import Role
from validation_core.models.config.architecture import Architecture
from validation_core.models.config.motorisation import Motorisation


class Projet(models.Model):
    nom_projet = models.CharField(max_length=255)

    architectures = models.ManyToManyField(
        Architecture,
        related_name="projets",
        blank=True
    )

    motorisations = models.ManyToManyField(
        Motorisation,
        related_name="projets",
        blank=True
    )

    nombre_vehicules = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nom_projet

class Affectation(models.Model):
    projet = models.ForeignKey(Projet, on_delete=models.CASCADE, null=True, blank=True, related_name="affectations")
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="affectations")