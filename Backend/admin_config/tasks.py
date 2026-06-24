import re

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile

from admin_config.models import BackgroundJob, CustomUser, GammeParsedData, Projet
from admin_config.services.email_service import send_account_authorized_email
from admin_config.services.gamme_parse_storage import parse_and_store_gamme
from admin_config.services.project_kpi_excel_service import (
    generate_project_kpi_excel,
)


JOB_CACHE_TIMEOUT = 24 * 60 * 60


def _job_cache_key(job_id):
    return f"background-job:{job_id}"


def _cache_job(job):
    payload = {
        "id": str(job.id),
        "status": job.status,
        "progress": job.progress,
        "error_message": job.error_message,
        "download_ready": bool(job.result_file),
    }
    try:
        cache.set(_job_cache_key(job.id), payload, JOB_CACHE_TIMEOUT)
    except Exception:
        pass
    return payload


def get_cached_job_state(job_id):
    try:
        return cache.get(_job_cache_key(job_id))
    except Exception:
        return None


def _update_job(job, *, status=None, progress=None, error_message=None):
    update_fields = ["updated_at"]
    if status is not None:
        job.status = status
        update_fields.append("status")
    if progress is not None:
        job.progress = max(0, min(int(progress), 100))
        update_fields.append("progress")
    if error_message is not None:
        job.error_message = error_message
        update_fields.append("error_message")
    job.save(update_fields=update_fields)
    _cache_job(job)


def _safe_excel_filename(project_name):
    safe_name = re.sub(r'[\\/:*?"<>|]', "_", str(project_name or "Projet"))
    return f"KPI_Projet_{safe_name}.xlsx"


@shared_task(name="admin_config.celery_health_check")
def celery_health_check():
    return {"status": "ok"}


@shared_task(
    bind=True,
    name="admin_config.send_account_authorized_email",
    max_retries=3,
    default_retry_delay=60,
)
def send_account_authorized_email_task(self, user_id):
    try:
        user = CustomUser.objects.get(pk=user_id)
        login_link = send_account_authorized_email(user)
        return {
            "user_id": user.id,
            "email": user.email,
            "login_link": login_link,
        }
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, name="admin_config.parse_gamme_excel")
def parse_gamme_excel_task(self, gamme_id):
    try:
        def on_progress(progress):
            self.update_state(state="PROGRESS", meta={"progress": progress})

        parsed = parse_and_store_gamme(gamme_id, progress_callback=on_progress)
        return {
            "gamme_id": gamme_id,
            "status": GammeParsedData.Status.SUCCESS,
            "progress": 100,
            "blocs": len(parsed.get("blocs", [])),
        }
    except Exception as exc:
        GammeParsedData.objects.filter(gamme_id=gamme_id).update(
            status=GammeParsedData.Status.FAILURE,
            progress=100,
            error_message=str(exc),
        )
        raise


@shared_task(bind=True, name="admin_config.generate_project_kpi")
def generate_project_kpi_task(self, job_id):
    job = BackgroundJob.objects.get(id=job_id)

    try:
        _update_job(
            job,
            status=BackgroundJob.Status.STARTED,
            progress=5,
            error_message="",
        )
        self.update_state(state="PROGRESS", meta={"progress": 5})

        project = Projet.objects.get(id=job.metadata["project_id"])

        def on_gamme_processed(current, total):
            progress = 10 + round((current / max(total, 1)) * 70)
            _update_job(job, progress=progress)
            self.update_state(state="PROGRESS", meta={"progress": progress})

        excel_buffer = generate_project_kpi_excel(
            project,
            progress_callback=on_gamme_processed,
        )
        _update_job(job, progress=90)

        filename = _safe_excel_filename(project.nom_projet)
        job.result_file.save(
            filename,
            ContentFile(excel_buffer.getvalue()),
            save=False,
        )
        job.status = BackgroundJob.Status.SUCCESS
        job.progress = 100
        job.error_message = ""
        job.save()
        _cache_job(job)

        return {
            "job_id": str(job.id),
            "status": job.status,
            "progress": job.progress,
            "filename": job.result_file.name.rsplit("/", 1)[-1],
        }
    except Exception as exc:
        _update_job(
            job,
            status=BackgroundJob.Status.FAILURE,
            error_message=str(exc),
        )
        raise


def dispatch_account_authorized_email(user):
    if not getattr(settings, "CELERY_EMAIL_ASYNC", False):
        login_link = send_account_authorized_email(user)
        return {
            "queued": False,
            "sent": True,
            "task_id": None,
            "login_link": login_link,
        }

    try:
        result = send_account_authorized_email_task.delay(user.id)
        return {
            "queued": True,
            "sent": False,
            "task_id": result.id,
            "login_link": None,
        }
    except Exception:
        if not getattr(settings, "CELERY_EMAIL_FALLBACK_SYNC", True):
            raise

        login_link = send_account_authorized_email(user)
        return {
            "queued": False,
            "sent": True,
            "task_id": None,
            "login_link": login_link,
        }
