from django.db import models
from django.utils import timezone


class EmailJob(models.Model):
    class Type(models.TextChoices):
        LOGIN_OTP = "LOGIN_OTP", "Login OTP"
        ACCOUNT_AUTHORIZED = "ACCOUNT_AUTHORIZED", "Account authorized"
        NOTIFICATION = "NOTIFICATION", "Notification"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENDING = "SENDING", "Sending"
        SENT = "SENT", "Sent"
        RETRY = "RETRY", "Retry"
        FAILED = "FAILED", "Failed"

    email_type = models.CharField(
        max_length=32,
        choices=Type.choices,
        db_index=True,
    )
    recipient_email = models.EmailField(db_index=True)
    subject = models.CharField(max_length=255)
    body_text = models.TextField()
    body_html = models.TextField(blank=True)
    from_email = models.EmailField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=3)
    celery_task_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["email_type", "status"]),
            models.Index(fields=["recipient_email", "-created_at"]),
        ]

    def mark_sent(self):
        self.status = self.Status.SENT
        self.error_message = ""
        self.sent_at = timezone.now()
