from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from admin_config.models import Affectation, CustomUser, Projet, Role


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    CELERY_EMAIL_ASYNC=False,
)
class UserCreationTests(APITestCase):
    def setUp(self):
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
            "admin_config.tasks.send_account_authorized_email",
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
