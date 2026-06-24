import os

from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from admin_config.models import BackgroundJob, Projet
from admin_config.services.access_control import can_read_project, forbidden_response
from admin_config.tasks import generate_project_kpi_task, get_cached_job_state


def _job_queryset_for_user(user):
    queryset = BackgroundJob.objects.select_related("created_by")
    if user.is_superuser:
        return queryset
    return queryset.filter(created_by=user)


def _mark_job_start_failure(job_id, exc):
    BackgroundJob.objects.filter(id=job_id).update(
        status=BackgroundJob.Status.FAILURE,
        error_message=f"Impossible de demarrer la tache Celery: {exc}",
    )


def _start_project_kpi_task(job_id):
    try:
        task = generate_project_kpi_task.delay(str(job_id))
        BackgroundJob.objects.filter(id=job_id).update(
            celery_task_id=task.id,
        )
    except Exception as exc:
        _mark_job_start_failure(job_id, exc)


@extend_schema(
    tags=["KPI"],
    summary="Demarrer un export KPI projet",
    description="Cree un BackgroundJob et lance la generation Excel avec Celery.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_project_kpi_job(request):
    project_id = request.data.get("project_id")
    if not project_id:
        return Response(
            {"detail": "project_id est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    project = get_object_or_404(Projet, id=project_id)
    if not can_read_project(request.user, project.id):
        return forbidden_response()

    job = BackgroundJob.objects.create(
        job_type=BackgroundJob.JobType.PROJECT_KPI,
        created_by=request.user,
        metadata={
            "project_id": project.id,
            "project_name": project.nom_projet,
        },
    )
    transaction.on_commit(lambda: _start_project_kpi_task(job.id))

    return Response(
        {
            "job_id": str(job.id),
            "status": job.status,
            "progress": job.progress,
        },
        status=status.HTTP_202_ACCEPTED,
    )


@extend_schema(
    tags=["KPI"],
    summary="Consulter un job KPI",
    description="Retourne le statut et la progression d'un export asynchrone.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def job_detail(request, job_id):
    job = get_object_or_404(_job_queryset_for_user(request.user), id=job_id)
    cached = get_cached_job_state(job.id) or {}

    return Response(
        {
            "id": str(job.id),
            "job_type": job.job_type,
            "status": cached.get("status", job.status),
            "progress": cached.get("progress", job.progress),
            "error_message": cached.get(
                "error_message",
                job.error_message,
            ),
            "download_ready": cached.get(
                "download_ready",
                bool(job.result_file),
            ),
            "created_at": job.created_at,
            "updated_at": job.updated_at,
        }
    )


@extend_schema(
    tags=["KPI"],
    summary="Telecharger le resultat d'un job KPI",
    description="Telecharge le fichier Excel lorsque le job est termine.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_job_result(request, job_id):
    job = get_object_or_404(_job_queryset_for_user(request.user), id=job_id)
    if job.status != BackgroundJob.Status.SUCCESS or not job.result_file:
        return Response(
            {"detail": "Le fichier n'est pas encore disponible."},
            status=status.HTTP_409_CONFLICT,
        )

    return FileResponse(
        job.result_file.open("rb"),
        as_attachment=True,
        filename=os.path.basename(job.result_file.name),
    )
