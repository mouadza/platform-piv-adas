import hashlib
import os

from django.db import transaction
from django.utils import timezone

from validation_core.models import Gamme, GammeParsedData
from validation_core.services.gamme_parser import parse_gamme_cached


PARSER_VERSION = 3


def get_gamme_file_fingerprint(gamme):
    if not gamme.fichier_gamme:
        raise ValueError("Pas de fichier de gamme.")

    file_path = gamme.fichier_gamme.path
    stats = os.stat(file_path)
    raw = (
        f"{gamme.fichier_gamme.name}:"
        f"{stats.st_size}:"
        f"{stats.st_mtime_ns}:"
        f"{PARSER_VERSION}"
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _is_current_record(record, fingerprint):
    return (
        record
        and record.parser_version == PARSER_VERSION
        and record.file_fingerprint == fingerprint
    )


def get_parse_record(gamme):
    try:
        return gamme.parsed_data
    except GammeParsedData.DoesNotExist:
        return None


def get_ready_parsed_gamme(gamme):
    fingerprint = get_gamme_file_fingerprint(gamme)
    record = get_parse_record(gamme)

    if (
        _is_current_record(record, fingerprint)
        and record.status == GammeParsedData.Status.SUCCESS
        and record.parsed_json
    ):
        return record.parsed_json, record

    return None, record


def prepare_gamme_parse_record(gamme, *, force=False):
    fingerprint = get_gamme_file_fingerprint(gamme)
    record, created = GammeParsedData.objects.get_or_create(
        gamme=gamme,
        defaults={
            "status": GammeParsedData.Status.PENDING,
            "progress": 0,
            "parser_version": PARSER_VERSION,
            "file_fingerprint": fingerprint,
        },
    )

    stale = not _is_current_record(record, fingerprint)
    should_reset = force or created or stale

    if should_reset:
        record.status = GammeParsedData.Status.PENDING
        record.progress = 0
        record.parser_version = PARSER_VERSION
        record.file_fingerprint = fingerprint
        record.celery_task_id = ""
        record.parsed_json = {}
        record.error_message = ""
        record.parsed_at = None
        record.save(
            update_fields=[
                "status",
                "progress",
                "parser_version",
                "file_fingerprint",
                "celery_task_id",
                "parsed_json",
                "error_message",
                "parsed_at",
                "updated_at",
            ]
        )

    return record


def schedule_gamme_parsing(gamme, *, force=False):
    record = prepare_gamme_parse_record(gamme, force=force)

    if not force and record.status in [
        GammeParsedData.Status.SUCCESS,
        GammeParsedData.Status.FAILURE,
    ]:
        return record, False

    if (
        not force
        and record.status in [
            GammeParsedData.Status.PENDING,
            GammeParsedData.Status.STARTED,
        ]
        and record.celery_task_id
    ):
        return record, False

    def enqueue_task():
        from validation_core.tasks import parse_gamme_excel_task

        try:
            task = parse_gamme_excel_task.delay(gamme.id)
            GammeParsedData.objects.filter(pk=record.pk).update(
                celery_task_id=task.id,
                error_message="",
            )
        except Exception as exc:
            GammeParsedData.objects.filter(pk=record.pk).update(
                status=GammeParsedData.Status.PENDING,
                celery_task_id="",
                error_message=f"Celery indisponible: {exc}",
            )

    transaction.on_commit(enqueue_task)
    return record, True


def parse_and_store_gamme(gamme_id, *, progress_callback=None):
    gamme = Gamme.objects.get(id=gamme_id)
    fingerprint = get_gamme_file_fingerprint(gamme)
    record = prepare_gamme_parse_record(gamme)

    if (
        _is_current_record(record, fingerprint)
        and record.status == GammeParsedData.Status.SUCCESS
        and record.parsed_json
    ):
        return record.parsed_json

    record.status = GammeParsedData.Status.STARTED
    record.progress = 10
    record.error_message = ""
    record.save(
        update_fields=[
            "status",
            "progress",
            "error_message",
            "updated_at",
        ]
    )

    if progress_callback:
        progress_callback(10)

    try:
        parsed = parse_gamme_cached(gamme.fichier_gamme.path)

        if parsed.get("error"):
            raise ValueError(parsed["error"])
    except Exception as exc:
        record.status = GammeParsedData.Status.FAILURE
        record.progress = 100
        record.error_message = str(exc)
        record.save(
            update_fields=[
                "status",
                "progress",
                "error_message",
                "updated_at",
            ]
        )
        raise

    record.status = GammeParsedData.Status.SUCCESS
    record.progress = 100
    record.parser_version = PARSER_VERSION
    record.file_fingerprint = fingerprint
    record.parsed_json = parsed
    record.error_message = ""
    record.parsed_at = timezone.now()
    record.save(
        update_fields=[
            "status",
            "progress",
            "parser_version",
            "file_fingerprint",
            "parsed_json",
            "error_message",
            "parsed_at",
            "updated_at",
        ]
    )

    if progress_callback:
        progress_callback(100)

    return parsed


def get_or_parse_gamme_data(gamme):
    parsed, _record = get_ready_parsed_gamme(gamme)

    if parsed is not None:
        return parsed

    return parse_and_store_gamme(gamme.id)
