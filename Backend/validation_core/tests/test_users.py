from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from validation_core.models import (
    Affectation,
    CustomUser,
    Notification,
    Projet,
    Role,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CELERY_EMAIL_ASYNC=False,
)
class UserCreationTests(APITestCase):
    def setUp(self):
        notification_email_patcher = patch(
            "validation_core.services.notification_service."
            "dispatch_project_affectation_email"
        )
        notification_email_patcher.start()
        self.addCleanup(notification_email_patcher.stop)

        authorization_email_patcher = patch(
            "validation_core.views.users.dispatch_account_authorized_email",
            return_value={
                "queued": False,
                "sent": True,
                "task_id": None,
                "login_link": "/login",
            },
        )
        authorization_email_patcher.start()
        self.addCleanup(authorization_email_patcher.stop)

        self.admin = CustomUser.objects.create_superuser(
            username="Admin Test",
            email="admin@stellantis.com",
            password="admin123456789",
        )
        self.role = Role.objects.create(
            label="PPL",
            code="PPL",
            access_level="PPL",
        )
        self.projet = Projet.objects.create(
            nom_projet="Projet Test",
            nombre_vehicules=1,
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_create_user_with_affectation(self):
        payload = {
            "username": "Mouad Zaouia",
            "email": "mouad@stellantis.com",
            "affectations": [
                {
                    "role": self.role.id,
                    "projet": self.projet.id,
                }
            ],
        }

        response = self.client.post(
            "/admin_config/create-user/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = CustomUser.objects.get(email="mouad@stellantis.com")
        self.assertEqual(user.username, "Mouad Zaouia")
        self.assertFalse(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(
            Affectation.objects.filter(
                user=user,
                role=self.role,
                projet=self.projet,
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=user,
                type=Notification.Type.USER_AFFECTED,
                projet=self.projet,
                is_read=False,
            ).exists()
        )

    def test_created_user_can_view_and_mark_affectation_notification(self):
        payload = {
            "username": "Notif User",
            "email": "notif.user@stellantis.com",
            "affectations": [
                {
                    "role": self.role.id,
                    "projet": self.projet.id,
                }
            ],
        }

        self.client.post("/admin_config/create-user/", payload, format="json")
        user = CustomUser.objects.get(email="notif.user@stellantis.com")
        notification = Notification.objects.get(recipient=user)

        self.client.force_authenticate(user=user)

        list_response = self.client.get("/admin_config/notifications/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["type"], "USER_AFFECTED")

        count_response = self.client.get(
            "/admin_config/notifications/unread-count/"
        )
        self.assertEqual(count_response.status_code, status.HTTP_200_OK)
        self.assertEqual(count_response.data["count"], 1)

        mark_response = self.client.patch(
            f"/admin_config/notifications/{notification.id}/read/"
        )
        self.assertEqual(mark_response.status_code, status.HTTP_200_OK)

        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)

    def test_update_user_notifies_only_new_affectation(self):
        user = CustomUser.objects.create_user(
            username="Update Notif",
            email="update.notif@stellantis.com",
        )
        second_project = Projet.objects.create(
            nom_projet="Projet Secondaire",
            nombre_vehicules=1,
        )
        Affectation.objects.create(
            user=user,
            role=self.role,
            projet=self.projet,
        )

        response = self.client.put(
            f"/admin_config/modifuser/{user.id}/",
            {
                "username": user.username,
                "email": user.email,
                "affectations": [
                    {"role": self.role.id, "projet": self.projet.id},
                    {"role": self.role.id, "projet": second_project.id},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=user).count(), 1)
        self.assertTrue(
            Notification.objects.filter(
                recipient=user,
                projet=second_project,
                type=Notification.Type.USER_AFFECTED,
            ).exists()
        )

    def test_user_is_created_when_authorization_email_fails(self):
        payload = {
            "username": "No Mail User",
            "email": "no.mail@stellantis.com",
            "affectations": [
                {
                    "role": self.role.id,
                    "projet": self.projet.id,
                }
            ],
        }

        with patch(
            "validation_core.views.users.dispatch_account_authorized_email",
            side_effect=Exception("SMTP unavailable"),
        ):
            response = self.client.post(
                "/admin_config/create-user/",
                payload,
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["email_sent"])
        self.assertFalse(response.data["email_queued"])
        self.assertEqual(response.data["email_error"], "SMTP unavailable")
        self.assertTrue(
            CustomUser.objects.filter(email="no.mail@stellantis.com").exists()
        )

    def test_create_user_duplicate_email_refused(self):
        CustomUser.objects.create_user(
            username="Existing User",
            email="existing@stellantis.com",
        )

        response = self.client.post(
            "/admin_config/create-user/",
            {
                "username": "Another User",
                "email": "existing@stellantis.com",
                "affectations": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_create_user_username_required(self):
        response = self.client.post(
            "/admin_config/create-user/",
            {
                "email": "test@stellantis.com",
                "affectations": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserPermissionTests(APITestCase):
    def test_normal_user_cannot_create_user(self):
        user = CustomUser.objects.create_user(
            username="Normal User",
            email="user@stellantis.com",
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/admin_config/create-user/",
            {
                "username": "New User",
                "email": "new@stellantis.com",
                "affectations": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
