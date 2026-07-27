from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from validation_core.models import (
    CustomUser,
    Gamme,
    Notification,
    Projet,
    StepValidation,
)
from validation_core.views.results import (
    compute_ev_result,
    compute_gamme_result,
    get_latest_step_validations,
)


class NotificationApiAdditionalTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="Notification Owner",
            email="notification.owner@example.com",
        )
        self.other_user = CustomUser.objects.create_user(
            username="Other Notification User",
            email="notification.other@example.com",
        )
        self.project = Projet.objects.create(
            nom_projet="Notification Project",
            nombre_vehicules=1,
        )
        self.unread = Notification.objects.create(
            recipient=self.user,
            title="Unread",
            message="Unread notification",
            type=Notification.Type.PROJECT_ASSIGNED,
            projet=self.project,
        )
        self.read = Notification.objects.create(
            recipient=self.user,
            title="Read",
            message="Read notification",
            type=Notification.Type.GAMME_STARTED,
            projet=self.project,
            is_read=True,
            read_at=timezone.now(),
        )
        self.foreign = Notification.objects.create(
            recipient=self.other_user,
            title="Foreign",
            message="Foreign notification",
            type=Notification.Type.GAMME_FINISHED,
            projet=self.project,
        )

    def test_notification_endpoints_require_authentication(self):
        for method, path in [
            ("get", "/admin_config/notifications/"),
            ("get", "/admin_config/notifications/unread-count/"),
            ("patch", "/admin_config/notifications/read-all/"),
        ]:
            response = getattr(self.client, method)(path)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_supports_unread_and_bounded_limit_filters(self):
        self.client.force_authenticate(self.user)

        unread_response = self.client.get(
            "/admin_config/notifications/?unread=yes&limit=50"
        )
        self.assertEqual(unread_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in unread_response.data], [self.unread.id])

        bounded_response = self.client.get(
            "/admin_config/notifications/?limit=-2"
        )
        self.assertEqual(len(bounded_response.data), 1)

        invalid_response = self.client.get(
            "/admin_config/notifications/?limit=invalid"
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(invalid_response.data), 2)

    def test_mark_read_is_idempotent_and_rejects_foreign_notification(self):
        self.client.force_authenticate(self.user)

        first_response = self.client.patch(
            f"/admin_config/notifications/{self.unread.id}/read/"
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.unread.refresh_from_db()
        self.assertTrue(self.unread.is_read)
        self.assertIsNotNone(self.unread.read_at)

        second_response = self.client.patch(
            f"/admin_config/notifications/{self.unread.id}/read/"
        )
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)

        foreign_response = self.client.patch(
            f"/admin_config/notifications/{self.foreign.id}/read/"
        )
        self.assertEqual(foreign_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_updates_only_current_users_notifications(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch("/admin_config/notifications/read-all/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.unread.refresh_from_db()
        self.foreign.refresh_from_db()
        self.assertTrue(self.unread.is_read)
        self.assertIsNotNone(self.unread.read_at)
        self.assertFalse(self.foreign.is_read)


class ResultsAdditionalTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_superuser(
            username="Results Admin",
            email="results.admin@example.com",
            password="StrongPassword123",
        )
        self.outsider = CustomUser.objects.create_user(
            username="Results Outsider",
            email="results.outsider@example.com",
        )
        self.project = Projet.objects.create(
            nom_projet="Results Project",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.project,
            nom="Results Gamme",
            nom_gamme="Results Gamme",
        )

    def test_compute_ev_result_covers_each_business_priority(self):
        non_cote = next(
            value
            for value in compute_ev_result.__code__.co_consts
            if isinstance(value, str) and value.startswith("Non_cot")
        )
        cases = [
            ([], "IN_PROGRESS"),
            (["OK", None], "IN_PROGRESS"),
            (["OK", "A_coter"], "IN_PROGRESS"),
            (["NOK", "NOK_mineur"], "NOK"),
            (["OK", "NOK_mineur"], "NOK_mineur"),
            (["OK", non_cote], "OK"),
            ([non_cote], non_cote),
            (["UNKNOWN"], "IN_PROGRESS"),
        ]

        for cotations, expected in cases:
            with self.subTest(cotations=cotations):
                self.assertEqual(compute_ev_result(cotations), expected)

    def test_compute_gamme_result_covers_each_business_priority(self):
        cases = [
            ({}, "IN_PROGRESS"),
            ({"EV-1": "NOK", "EV-2": "NOK_mineur"}, "NOK"),
            ({"EV-1": "OK", "EV-2": "NOK_mineur"}, "NOK_mineur"),
            ({"EV-1": "OK", "EV-2": "OK"}, "OK"),
            ({"EV-1": "OK", "EV-2": "IN_PROGRESS"}, "IN_PROGRESS"),
        ]

        for ev_results, expected in cases:
            with self.subTest(ev_results=ev_results):
                self.assertEqual(compute_gamme_result(ev_results), expected)

    def test_latest_step_validations_keeps_latest_per_ev_and_step(self):
        older = StepValidation.objects.create(
            gamme=self.gamme,
            ev_code="EV-1",
            step_code="STEP-1",
            user=self.admin,
            cotation="OK",
        )
        StepValidation.objects.filter(pk=older.pk).update(
            created_at=timezone.now() - timedelta(days=1)
        )
        latest = StepValidation.objects.create(
            gamme=self.gamme,
            ev_code="EV-1",
            step_code="STEP-1",
            user=self.admin,
            cotation="NOK",
            commentaire="Latest failure",
        )
        no_ev = StepValidation.objects.create(
            gamme=self.gamme,
            ev_code="",
            step_code="STEP-2",
            user=self.admin,
            cotation="OK",
        )

        result = get_latest_step_validations(self.gamme.id)

        self.assertEqual({item.id for item in result}, {latest.id, no_ev.id})

    def test_latest_validations_endpoint_handles_access_and_missing_gamme(self):
        validation = StepValidation.objects.create(
            gamme=self.gamme,
            ev_code="EV-1",
            step_code="STEP-1",
            user=self.admin,
            cotation="OK",
        )
        path = (
            f"/admin_config/gammes/{self.gamme.id}/"
            "step-validations/latest/"
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get(path)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["id"], validation.id)
        self.assertEqual(response.data[0]["user_name"], "Results Admin")

        missing_response = self.client.get(
            "/admin_config/gammes/999999/step-validations/latest/"
        )
        self.assertEqual(
            missing_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.client.force_authenticate(self.outsider)
        forbidden_response = self.client.get(path)
        self.assertEqual(
            forbidden_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    @patch("validation_core.views.results.get_gamme_ev_results")
    def test_gamme_results_endpoint_handles_success_access_and_missing(
        self,
        results_mock,
    ):
        results_mock.return_value = {
            "EV-1": "OK",
            "EV-2": "NOK_mineur",
        }
        path = f"/admin_config/gammes/{self.gamme.id}/results/"

        self.client.force_authenticate(self.admin)
        response = self.client.get(path)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["gamme_id"], self.gamme.id)
        self.assertEqual(response.data["ev_results"]["EV-2"], "NOK_mineur")

        missing_response = self.client.get(
            "/admin_config/gammes/999999/results/"
        )
        self.assertEqual(
            missing_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.client.force_authenticate(self.outsider)
        forbidden_response = self.client.get(path)
        self.assertEqual(
            forbidden_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
