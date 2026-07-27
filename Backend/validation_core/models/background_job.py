import uuid

from django.conf import settings
from django.db import models


class BackgroundJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        STARTED = "STARTED", "En cours"
        SUCCESS = "SUCCESS", "Termine"
        FAILURE = "FAILURE", "Echoue"

    class JobType(models.TextChoices):
        PROJECT_KPI = "PROJECT_KPI", "Export KPI Projet"
        GAMME_KPI = "GAMME_KPI", "Export KPI Gamme"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    job_type = models.CharField(max_length=50, choices=JobType.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    progress = models.PositiveSmallIntegerField(default=0)
    celery_task_id = models.CharField(max_length=255, blank=True)
    result_file = models.FileField(
        upload_to="jobs/kpi/",
        null=True,
        blank=True,
    )
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)