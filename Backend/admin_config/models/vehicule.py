from django.db import models
from admin_config.models import Projet
from admin_config.models.config.motorisation import Motorisation


class Vehicule(models.Model):
    projet = models.ForeignKey(
        Projet,
        on_delete=models.CASCADE,
        related_name="vehicules"
    )

    cmq = models.CharField(max_length=100, unique=True)
    vin = models.CharField(max_length=100, unique=True)

    motorisation = models.ForeignKey(
        Motorisation,
        on_delete=models.PROTECT,
        related_name="vehicules"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vin} - {self.cmq}"