from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from validation_core.models import BackgroundJob, CustomUser, Projet


class BackgroundJobApiTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_superuser(
            username="Admin Jobs",
            email="admin.jobs@stellantis.com",
            password="admin123456789",
        )
        self.other_user = CustomUser.objects.create_user(
            username="Other User",
            email="other.jobs@stellantis.com",
            password="other123456789",
        )
        self.project = Projet.objects.create(
            nom_projet="Projet Jobs",
            nombre_vehicules=10,
        )

    def test_create_project_kpi_job_starts_celery_task(self):
        self.client.force_authenticate(user=self.admin)

        with patch(
            "validation_core.views.jobs.generate_project_kpi_task.delay"
        ) as delay:
            delay.return_value.id = "celery-task-id"
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/admin_config/jobs/project-kpi/",
                    {"project_id": self.project.id},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        job = BackgroundJob.objects.get(id=response.data["job_id"])
        self.assertEqual(job.status, BackgroundJob.Status.PENDING)
        self.assertEqual(job.celery_task_id, "celery-task-id")
        self.assertEqual(job.metadata["project_id"], self.project.id)
        delay.assert_called_once_with(str(job.id))

    def test_user_cannot_read_another_users_job(self):
        job = BackgroundJob.objects.create(
            job_type=BackgroundJob.JobType.PROJECT_KPI,
            created_by=self.admin,
            metadata={"project_id": self.project.id},
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(f"/admin_config/jobs/{job.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pending_job_cannot_be_downloaded(self):
        job = BackgroundJob.objects.create(
            job_type=BackgroundJob.JobType.PROJECT_KPI,
            created_by=self.admin,
            metadata={"project_id": self.project.id},
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            f"/admin_config/jobs/{job.id}/download/"
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

