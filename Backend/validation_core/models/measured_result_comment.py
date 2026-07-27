from django.db import models
from django.conf import settings
from validation_core.models.gamme import Gamme


class StepMeasuredResultComment(models.Model):
    gamme = models.ForeignKey(
        Gamme,
        on_delete=models.CASCADE,
        related_name="measured_result_comments"
    )

    ev_code = models.CharField(max_length=255)
    step_code = models.CharField(max_length=255)

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