from unittest.mock import patch

from django.conf import settings
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from validation_core.models import CustomUser, Gamme, GammeParsedData, Projet
from validation_core.services.gamme_parse_storage import (
    get_gamme_file_fingerprint,
    parse_and_store_gamme,
)


@override_settings(MEDIA_ROOT=settings.BASE_DIR)
class GammeAsyncParseTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_superuser(
            username="Async Parse Admin",
            email="async.parse@stellantis.com",
            password="admin123456789",
        )
        self.project = Projet.objects.create(
            nom_projet="Projet parsing asynchrone",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.project,
            nom="Gamme async",
            fichier_gamme="manage.py",
        )

    @patch("validation_core.services.gamme_parse_storage.parse_gamme_cached")
    def test_worker_stores_parsed_json(self, parse_mock):
        parsed_json = {"colonnes": ["EV"], "blocs": [{"rows": []}]}
        parse_mock.return_value = parsed_json

        result = parse_and_store_gamme(self.gamme.id)

        record = GammeParsedData.objects.get(gamme=self.gamme)
        self.assertEqual(result, parsed_json)
        self.assertEqual(record.status, GammeParsedData.Status.SUCCESS)
        self.assertEqual(record.progress, 100)
        self.assertEqual(record.parsed_json, parsed_json)
        self.assertIsNotNone(record.parsed_at)

    def test_parse_endpoint_queues_worker_when_json_is_missing(self):
        self.client.force_authenticate(user=self.admin)

        with patch("validation_core.tasks.parse_gamme_excel_task.delay") as delay:
            delay.return_value.id = "parse-task-id"
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.get(
                    f"/admin_config/newgamme/{self.gamme.id}/"
                )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["parse_status"], "PENDING")
        self.assertTrue(response.data["queued"])
        record = GammeParsedData.objects.get(gamme=self.gamme)
        self.assertEqual(record.celery_task_id, "parse-task-id")
        delay.assert_called_once_with(self.gamme.id)

    def test_parse_endpoint_returns_saved_json_without_new_task(self):
        parsed_json = {"colonnes": ["EV"], "blocs": [{"rows": []}]}
        GammeParsedData.objects.create(
            gamme=self.gamme,
            status=GammeParsedData.Status.SUCCESS,
            progress=100,
            parser_version=3,
            file_fingerprint=get_gamme_file_fingerprint(self.gamme),
            parsed_json=parsed_json,
        )
        self.client.force_authenticate(user=self.admin)

        with patch("validation_core.tasks.parse_gamme_excel_task.delay") as delay:
            response = self.client.get(
                f"/admin_config/newgamme/{self.gamme.id}/"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, parsed_json)
        delay.assert_not_called()

    def test_file_fingerprint_change_invalidates_saved_json(self):
        old_fingerprint = get_gamme_file_fingerprint(self.gamme)
        GammeParsedData.objects.create(
            gamme=self.gamme,
            status=GammeParsedData.Status.SUCCESS,
            progress=100,
            parser_version=3,
            file_fingerprint=old_fingerprint,
            parsed_json={"blocs": [{"old": True}]},
        )
        self.gamme.fichier_gamme = "requirements.txt"
        self.gamme.save()
        self.client.force_authenticate(user=self.admin)

        with patch("validation_core.tasks.parse_gamme_excel_task.delay") as delay:
            delay.return_value.id = "replacement-task-id"
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.get(
                    f"/admin_config/newgamme/{self.gamme.id}/"
                )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        record = GammeParsedData.objects.get(gamme=self.gamme)
        self.assertNotEqual(record.file_fingerprint, old_fingerprint)
        self.assertEqual(record.parsed_json, {})
