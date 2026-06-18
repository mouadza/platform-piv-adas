# models/config.py
from django.db import models

class Config(models.Model):
    architecture = models.CharField(max_length=255)
    procedure = models.TextField()
    boitiers = models.CharField(max_length=255)
    piste = models.CharField(max_length=255)
    nombre_jours = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.architecture} - {self.procedure}"