from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db import transaction

from validation_core.models import EmailJob


def send_email_message(
    *,
    recipient_email,
    subject,
    body_text,
    body_html="",
    from_email=None,
):
    connection = get_connection(timeout=getattr(settings, "EMAIL_TIMEOUT", 5))
    message = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=from_email or settings.DEFAULT_FROM_EMAIL,
        to=[recipient_email],
        connection=connection,
    )

    if body_html:
        message.attach_alternative(body_html, "text/html")

    message.send(fail_silently=False)


def create_email_job(
    *,
    email_type,
    recipient_email,
    subject,
    body_text,
    body_html="",
    from_email=None,
    metadata=None,
    max_attempts=3,
):
    return EmailJob.objects.create(
        email_type=email_type,
        recipient_email=recipient_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        from_email=from_email or settings.DEFAULT_FROM_EMAIL,
        metadata=metadata or {},
        max_attempts=max_attempts,
    )


def deliver_email_job(email_job_id):
    with transaction.atomic():
        job = EmailJob.objects.select_for_update().get(pk=email_job_id)

        if job.status == EmailJob.Status.SENT:
            return {
                "email_job_id": job.id,
                "status": job.status,
                "attempts": job.attempts,
            }

        job.status = EmailJob.Status.SENDING
        job.attempts += 1
        job.error_message = ""
        job.save(update_fields=["status", "attempts", "error_message", "updated_at"])

    try:
        send_email_message(
            recipient_email=job.recipient_email,
            subject=job.subject,
            body_text=job.body_text,
            body_html=job.body_html,
            from_email=job.from_email,
        )
    except Exception as exc:
        job.status = (
            EmailJob.Status.RETRY
            if job.attempts < job.max_attempts
            else EmailJob.Status.FAILED
        )
        job.error_message = str(exc)
        job.save(update_fields=["status", "error_message", "updated_at"])
        raise

    job.mark_sent()
    job.save(update_fields=["status", "error_message", "sent_at", "updated_at"])

    return {
        "email_job_id": job.id,
        "status": job.status,
        "attempts": job.attempts,
    }


def enqueue_email_job(
    *,
    email_type,
    recipient_email,
    subject,
    body_text,
    body_html="",
    from_email=None,
    metadata=None,
    queue="email",
    async_enabled=True,
    fallback_sync=True,
):
    job = create_email_job(
        email_type=email_type,
        recipient_email=recipient_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        from_email=from_email,
        metadata=metadata,
    )

    if not async_enabled:
        deliver_email_job(job.id)
        job.refresh_from_db()
        return job

    try:
        from validation_core.tasks import send_email_job_task

        result = send_email_job_task.apply_async(args=[job.id], queue=queue)
        job.celery_task_id = result.id
        job.save(update_fields=["celery_task_id", "updated_at"])
    except Exception:
        if not fallback_sync:
            job.status = EmailJob.Status.FAILED
            job.error_message = "Email queue unavailable."
            job.save(update_fields=["status", "error_message", "updated_at"])
            raise

        deliver_email_job(job.id)
        job.refresh_from_db()

    return job
