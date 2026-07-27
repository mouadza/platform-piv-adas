from types import SimpleNamespace
from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings

from validation_core.models import EmailJob
from validation_core.services.email_jobs import (
    create_email_job,
    deliver_email_job,
    enqueue_email_job,
    send_email_message,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="platform@example.com",
)
class EmailJobsServiceTests(TestCase):
    def _create_job(self, **overrides):
        values = {
            "email_type": EmailJob.Type.NOTIFICATION,
            "recipient_email": "recipient@example.com",
            "subject": "Notification",
            "body_text": "Plain body",
        }
        values.update(overrides)
        return create_email_job(**values)

    def test_send_email_message_builds_plain_and_html_email(self):
        send_email_message(
            recipient_email="recipient@example.com",
            subject="Subject",
            body_text="Plain body",
            body_html="<strong>HTML body</strong>",
        )

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["recipient@example.com"])
        self.assertEqual(message.from_email, "platform@example.com")
        self.assertEqual(message.alternatives[0].content, "<strong>HTML body</strong>")

    def test_create_email_job_applies_defaults(self):
        job = self._create_job()

        self.assertEqual(job.status, EmailJob.Status.PENDING)
        self.assertEqual(job.from_email, "platform@example.com")
        self.assertEqual(job.metadata, {})
        self.assertEqual(job.max_attempts, 3)

    @patch("validation_core.services.email_jobs.send_email_message")
    def test_deliver_email_job_marks_job_as_sent(self, send_mock):
        job = self._create_job(body_html="<p>Body</p>")

        result = deliver_email_job(job.id)

        job.refresh_from_db()
        self.assertEqual(job.status, EmailJob.Status.SENT)
        self.assertEqual(job.attempts, 1)
        self.assertIsNotNone(job.sent_at)
        self.assertEqual(result["status"], EmailJob.Status.SENT)
        send_mock.assert_called_once_with(
            recipient_email=job.recipient_email,
            subject=job.subject,
            body_text=job.body_text,
            body_html=job.body_html,
            from_email=job.from_email,
        )

    @patch("validation_core.services.email_jobs.send_email_message")
    def test_deliver_email_job_is_idempotent_after_success(self, send_mock):
        job = self._create_job()
        job.status = EmailJob.Status.SENT
        job.attempts = 1
        job.save(update_fields=["status", "attempts"])

        result = deliver_email_job(job.id)

        self.assertEqual(result["attempts"], 1)
        send_mock.assert_not_called()

    @patch(
        "validation_core.services.email_jobs.send_email_message",
        side_effect=RuntimeError("SMTP unavailable"),
    )
    def test_delivery_failure_moves_job_from_retry_to_failed(self, _send_mock):
        retry_job = self._create_job(max_attempts=2)

        with self.assertRaisesMessage(RuntimeError, "SMTP unavailable"):
            deliver_email_job(retry_job.id)
        retry_job.refresh_from_db()
        self.assertEqual(retry_job.status, EmailJob.Status.RETRY)
        self.assertEqual(retry_job.attempts, 1)
        self.assertEqual(retry_job.error_message, "SMTP unavailable")

        with self.assertRaisesMessage(RuntimeError, "SMTP unavailable"):
            deliver_email_job(retry_job.id)
        retry_job.refresh_from_db()
        self.assertEqual(retry_job.status, EmailJob.Status.FAILED)
        self.assertEqual(retry_job.attempts, 2)

    @patch("validation_core.tasks.send_email_job_task.apply_async")
    def test_enqueue_async_saves_celery_task_identifier(self, apply_async_mock):
        apply_async_mock.return_value = SimpleNamespace(id="task-123")

        job = enqueue_email_job(
            email_type=EmailJob.Type.NOTIFICATION,
            recipient_email="recipient@example.com",
            subject="Subject",
            body_text="Body",
            queue="priority-email",
        )

        job.refresh_from_db()
        self.assertEqual(job.celery_task_id, "task-123")
        apply_async_mock.assert_called_once_with(args=[job.id], queue="priority-email")

    @patch("validation_core.services.email_jobs.send_email_message")
    def test_enqueue_can_deliver_synchronously(self, send_mock):
        job = enqueue_email_job(
            email_type=EmailJob.Type.NOTIFICATION,
            recipient_email="recipient@example.com",
            subject="Subject",
            body_text="Body",
            async_enabled=False,
        )

        self.assertEqual(job.status, EmailJob.Status.SENT)
        send_mock.assert_called_once()

    @patch(
        "validation_core.tasks.send_email_job_task.apply_async",
        side_effect=RuntimeError("broker unavailable"),
    )
    def test_queue_failure_without_fallback_marks_job_failed(self, _apply_async_mock):
        with self.assertRaisesMessage(RuntimeError, "broker unavailable"):
            enqueue_email_job(
                email_type=EmailJob.Type.NOTIFICATION,
                recipient_email="recipient@example.com",
                subject="Subject",
                body_text="Body",
                fallback_sync=False,
            )

        job = EmailJob.objects.get()
        self.assertEqual(job.status, EmailJob.Status.FAILED)
        self.assertEqual(job.error_message, "Email queue unavailable.")

    @patch("validation_core.services.email_jobs.send_email_message")
    @patch(
        "validation_core.tasks.send_email_job_task.apply_async",
        side_effect=RuntimeError("broker unavailable"),
    )
    def test_queue_failure_uses_synchronous_fallback(
        self,
        _apply_async_mock,
        send_mock,
    ):
        job = enqueue_email_job(
            email_type=EmailJob.Type.NOTIFICATION,
            recipient_email="recipient@example.com",
            subject="Subject",
            body_text="Body",
        )

        self.assertEqual(job.status, EmailJob.Status.SENT)
        send_mock.assert_called_once()
