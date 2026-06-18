from rest_framework import status
from rest_framework.test import APITestCase

from admin_config.models import (
    Affectation,
    AuditLog,
    CustomUser,
    Gamme,
    Projet,
    Role,
)


class StepValidationTests(APITestCase):
    def setUp(self):
        self.role_valideur = Role.objects.create(
            label="Valideur",
            code="VALIDEUR",
            access_level="VALIDEUR",
        )
        self.valideur = CustomUser.objects.create_user(
            username="Valideur Test",
            email="valideur@stellantis.com",
        )
        self.projet = Projet.objects.create(
            nom_projet="Projet Test",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.projet,
            nom="Gamme technique",
            nom_gamme="Gamme Affichee",
        )
        Affectation.objects.create(
            user=self.valideur,
            role=self.role_valideur,
            projet=self.projet,
        )
        self.client.force_authenticate(user=self.valideur)

    def test_nok_without_comment_is_refused(self):
        response = self.client.post(
            "/admin_config/step-validations/",
            {
                "gamme": self.gamme.id,
                "ev_code": "EV-001",
                "step_code": "STEP-001",
                "cotation": "NOK",
                "commentaire": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ok_without_comment_is_accepted(self):
        response = self.client.post(
            "/admin_config/step-validations/",
            {
                "gamme": self.gamme.id,
                "ev_code": "EV-001",
                "step_code": "STEP-001",
                "cotation": "OK",
                "commentaire": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            AuditLog.objects.filter(
                action="STEP_VALIDATION_CREATED",
                gamme=self.gamme,
                projet=self.projet,
            ).exists()
        )


class ProjectGammePermissionTests(APITestCase):
    def setUp(self):
        self.role_visiteur = Role.objects.create(
            label="Visiteur",
            code="VISITEUR",
            access_level="VISITEUR",
        )
        self.visiteur = CustomUser.objects.create_user(
            username="Visiteur Test",
            email="visiteur@stellantis.com",
        )
        self.projet_a = Projet.objects.create(
            nom_projet="Projet A",
            nombre_vehicules=1,
        )
        self.projet_b = Projet.objects.create(
            nom_projet="Projet B",
            nombre_vehicules=1,
        )
        Gamme.objects.create(
            projet=self.projet_a,
            nom="Gamme A",
            nom_gamme="Gamme Accessible",
        )
        Gamme.objects.create(
            projet=self.projet_b,
            nom="Gamme B",
            nom_gamme="Gamme Interdite",
        )
        Affectation.objects.create(
            user=self.visiteur,
            role=self.role_visiteur,
            projet=self.projet_a,
        )
        self.client.force_authenticate(user=self.visiteur)

    def test_user_can_read_assigned_project_gammes(self):
        response = self.client.get(
            f"/admin_config/projets/{self.projet_a.id}/gammes/list/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["nom_gamme"], "Gamme Accessible")

    def test_user_cannot_read_unassigned_project_gammes(self):
        response = self.client.get(
            f"/admin_config/projets/{self.projet_b.id}/gammes/list/"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AuditLogTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_superuser(
            username="Admin Test",
            email="admin@stellantis.com",
            password="admin123456789",
        )
        self.normal_user = CustomUser.objects.create_user(
            username="Normal User",
            email="normal@stellantis.com",
        )
        self.projet = Projet.objects.create(
            nom_projet="Projet Audit",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.projet,
            nom="Nom technique",
            nom_gamme="Nom Gamme Metier",
        )
        AuditLog.objects.create(
            user=self.admin,
            user_email=self.admin.email,
            action="STEP_VALIDATION_CREATED",
            entity_type="step_validation",
            entity_id="1",
            projet=self.projet,
            gamme=self.gamme,
            metadata={"gamme_id": self.gamme.id},
        )
        AuditLog.objects.create(
            user=self.admin,
            user_email=self.admin.email,
            action="USER_CREATED",
            entity_type="user",
            entity_id="2",
            metadata={"user_email": "new.user@stellantis.com"},
        )

    def test_admin_can_see_audit_log_with_gamme_name(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get("/admin_config/audit-logs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["action"], "STEP_VALIDATION_CREATED")
        self.assertEqual(response.data[0]["projet_nom"], "Projet Audit")
        self.assertEqual(response.data[0]["gamme_nom"], "Nom Gamme Metier")

    def test_admin_cannot_filter_to_admin_only_audit_action(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            "/admin_config/audit-logs/",
            {"action": "USER_CREATED"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_non_admin_cannot_see_audit_log(self):
        self.client.force_authenticate(user=self.normal_user)

        response = self.client.get("/admin_config/audit-logs/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
