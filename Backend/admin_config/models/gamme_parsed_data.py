from django.db import models


class GammeParsedData(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        STARTED = "STARTED", "En cours"
        SUCCESS = "SUCCESS", "Termine"
        FAILURE = "FAILURE", "Echoue"

    gamme = models.OneToOneField(
        "admin_config.Gamme",
        on_delete=models.CASCADE,
        related_name="parsed_data",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    progress = models.PositiveSmallIntegerField(default=0)
    parser_version = models.PositiveIntegerField(default=1)
    file_fingerprint = models.CharField(max_length=64, blank=True, db_index=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    parsed_json = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    parsed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["parser_version", "file_fingerprint"]),
        ]

    def __str__(self):
        return f"GammeParsedData({self.gamme_id}, {self.status})"
