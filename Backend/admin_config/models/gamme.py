from django.db import models
from django.conf import settings

from admin_config.models import Projet
from admin_config.models.config.type_procedure import TypeProcedure
from admin_config.models.config.fonction_gamme import FonctionGamme
from admin_config.models.vehicule import Vehicule

class Gamme(models.Model):

    nom_gamme = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    projet = models.ForeignKey(
        Projet,
        on_delete=models.CASCADE,
        related_name="gammes"
    )

    vehicule = models.ForeignKey(
        Vehicule,
        on_delete=models.CASCADE,
        related_name="gammes",
        null=True, 
        blank=True 
    )

    nom = models.CharField(max_length=100)

    type_procedure = models.ForeignKey(
        TypeProcedure,
        on_delete=models.PROTECT,
        blank=True,
        null=True
        
    )

    fonction_gamme = models.ForeignKey(
        FonctionGamme,
        on_delete=models.PROTECT,
        blank=True,
        null=True
    )

    pistes = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    boitiers = models.CharField(max_length=255, blank=True)

    nombre_jours = models.PositiveIntegerField(null=True, blank=True)

    date_debut = models.DateField(null=True, blank=True)

    date_fin = models.DateField(null=True, blank=True)

    
    STATUS_CHOICES = [
            ("CONFIG", "Configurer"),
            ("NOT_CONFIG", "Non configuré"),
            ("CANCEL", "Annulé"),
        ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NOT_CONFIG"
    )

    ordre = models.IntegerField(default=0)

    fichier_gamme = models.FileField(
        upload_to="gammes/fichiers/",
        null=True,
        blank=True
    )

    fichier_associe = models.FileField(
        upload_to="gammes/fichiers_associes/",
        null=True,
        blank=True
    )

    original_filename = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True
    )

    original_associe_filename = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom} - V{self.vehicule_id}"
    
    def save(self, *args, **kwargs):

        if not self.pk:

            last_order = Gamme.objects.filter(
                projet=self.projet
            ).aggregate(
                max_ordre=models.Max("ordre")
            )["max_ordre"]

            self.ordre = (last_order or 0) + 1

        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['ordre']

class GlobalEVComment(models.Model):
    ev_code = models.CharField(max_length=255)

    commentaire = models.TextField()

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ev_code} - {self.commentaire[:30]}"

