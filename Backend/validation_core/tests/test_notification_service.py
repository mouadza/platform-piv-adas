from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase, override_settings

from validation_core.models import (
    Affectation,
    CustomUser,
    Gamme,
    Notification,
    Projet,
    Role,
)
from validation_core.services.notification_service import (
    _NotificationRole,
    _absolute_target_url,
    _gamme_target_url_for_role,
    _project_target_url_for_role,
    create_notification,
    create_notification_once,
    dispatch_project_affectation_email,
    notify_admins_gamme_finished,
    notify_admins_gamme_started,
    notify_project_affectation,
    notify_project_gamme_added,
    notify_user_affectations,
    role_target_url,
)


@override_settings(FRONTEND_URL="https://validation.example/")
class NotificationServiceTests(TestCase):
    def setUp(self):
        self.project = Projet.objects.create(
            nom_projet="Projet Notifications",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.project,
            nom="Gamme",
            nom_gamme="Gamme Alpha",
        )
        self.actor = CustomUser.objects.create_user(
            username="Actor",
            email="actor@example.com",
        )
        self.admin = CustomUser.objects.create_superuser(
            username="Admin",
            email="admin@example.com",
            password="StrongPassword123",
        )
        self.ppl = self._create_user_with_role("PPL", "Pilote")
        self.validator = self._create_user_with_role("VALIDEUR", "Valideur")
        self.visitor = self._create_user_with_role("VISITEUR", "Visiteur")

    def _create_user_with_role(self, access_level, label):
        user = CustomUser.objects.create_user(
            username=label,
            email=f"{access_level.lower()}@example.com",
        )
        role = Role.objects.create(
            code=f"{access_level}_{self.project.id}",
            label=label,
            access_level=access_level,
        )
        Affectation.objects.create(user=user, projet=self.project, role=role)
        return user

    def test_role_and_context_urls_cover_each_destination(self):
        self.assertEqual(role_target_url(_NotificationRole("PPL")), "/ppldash")
        self.assertEqual(
            role_target_url(SimpleNamespace(access_level="UNKNOWN")),
            "/choix-espace",
        )
        self.assertEqual(
            _project_target_url_for_role(
                self.project,
                _NotificationRole("VALIDEUR"),
            ),
            (
                f"/GammeImporteValideur/{self.project.id}"
                f"?role=VALIDEUR&project={self.project.id}"
            ),
        )
        self.assertEqual(
            _gamme_target_url_for_role(
                self.gamme,
                _NotificationRole("ADMIN"),
                destination="report",
                event="FINISHED",
            ),
            (
                f"/validation-report/{self.gamme.id}"
                f"?role=ADMIN&project={self.project.id}"
                f"&gamme={self.gamme.id}&event=FINISHED"
            ),
        )
        self.assertEqual(_absolute_target_url("/validation/1"), "https://validation.example/validation/1")

    def test_create_notification_handles_missing_recipient_and_deduplicates(self):
        self.assertIsNone(
            create_notification(
                recipient=None,
                title="Ignored",
                message="Ignored",
                type=Notification.Type.GAMME_STARTED,
            )
        )

        values = {
            "recipient": self.admin,
            "title": "Started",
            "message": "A gamme started",
            "type": Notification.Type.GAMME_STARTED,
            "projet": self.project,
            "target_url": "/validation/1",
        }
        first = create_notification_once(**values)
        second = create_notification_once(**{**values, "message": "Changed"})

        self.assertEqual(first.id, second.id)
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(second.message, "A gamme started")

    def test_admin_start_and_finish_notifications_are_deduplicated(self):
        notify_admins_gamme_started(self.gamme, actor=self.actor)
        notify_admins_gamme_started(self.gamme, actor=self.actor)
        notify_admins_gamme_finished(self.gamme)

        notifications = Notification.objects.filter(recipient=self.admin)
        self.assertEqual(notifications.count(), 2)
        self.assertTrue(
            notifications.filter(type=Notification.Type.GAMME_STARTED).exists()
        )
        finish = notifications.get(type=Notification.Type.GAMME_FINISHED)
        self.assertIn(f"/validation-report/{self.gamme.id}", finish.target_url)
        self.assertIn("La plateforme", finish.message)

    def test_gamme_added_notifies_each_non_admin_role_with_adapted_url(self):
        admin_role = Role.objects.create(
            code="ADMIN_PROJECT",
            label="Admin",
            access_level="ADMIN",
        )
        Affectation.objects.create(
            user=self.admin,
            projet=self.project,
            role=admin_role,
        )

        notifications = notify_project_gamme_added(self.gamme, actor=self.actor)

        self.assertEqual(len(notifications), 3)
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.admin,
                type=Notification.Type.GAMME_ADDED_TO_PROJECT,
            ).exists()
        )
        ppl_notification = Notification.objects.get(
            recipient=self.ppl,
            type=Notification.Type.GAMME_ADDED_TO_PROJECT,
        )
        validator_notification = Notification.objects.get(
            recipient=self.validator,
            type=Notification.Type.GAMME_ADDED_TO_PROJECT,
        )
        self.assertIn(f"/gamme/{self.project.id}/{self.gamme.id}/", ppl_notification.target_url)
        self.assertIn(f"/validation/{self.gamme.id}", validator_notification.target_url)

    @patch(
        "validation_core.services.notification_service.dispatch_project_affectation_email"
    )
    def test_project_affectation_skips_admin_and_dispatches_user_email(
        self,
        dispatch_mock,
    ):
        self.assertIsNone(
            notify_project_affectation(
                self.admin.affectations.create(
                    projet=self.project,
                    role=Role.objects.create(
                        code="ADMIN_SECOND",
                        label="Admin",
                        access_level="ADMIN",
                    ),
                )
            )
        )

        affectation = self.ppl.affectations.get(projet=self.project)
        notification = notify_project_affectation(affectation, actor=self.actor)

        self.assertEqual(notification.type, Notification.Type.PROJECT_ASSIGNED)
        self.assertIn(f"/ViewProjet/{self.project.id}", notification.target_url)
        dispatch_mock.assert_called_once_with(
            recipient=self.ppl,
            projet=self.project,
            role=affectation.role,
            actor=self.actor,
            target_url=notification.target_url,
        )

    @patch(
        "validation_core.services.notification_service.dispatch_project_affectation_email"
    )
    def test_notify_user_affectations_can_filter_role_project_pairs(
        self,
        _dispatch_mock,
    ):
        affectation = self.visitor.affectations.get(projet=self.project)

        excluded = notify_user_affectations(
            self.visitor,
            only_keys={(self.project.id, -1)},
        )
        included = notify_user_affectations(
            self.visitor,
            actor=self.actor,
            only_keys={(self.project.id, affectation.role_id)},
        )

        self.assertEqual(excluded, [])
        self.assertEqual(len(included), 1)
        self.assertIn("Actor", included[0].message)
        self.assertIn("/EspaceUser", included[0].target_url)

    @patch("validation_core.services.notification_service.enqueue_email_job")
    def test_affectation_email_escapes_html_and_builds_absolute_link(
        self,
        enqueue_mock,
    ):
        enqueue_mock.return_value = SimpleNamespace(id=1)
        self.ppl.username = "<Pilote>"
        self.ppl.save(update_fields=["username"])
        role = self.ppl.affectations.get(projet=self.project).role

        result = dispatch_project_affectation_email(
            recipient=self.ppl,
            projet=self.project,
            role=role,
            actor=self.actor,
            target_url="/ViewProjet/1",
        )

        self.assertEqual(result.id, 1)
        kwargs = enqueue_mock.call_args.kwargs
        self.assertIn("&lt;Pilote&gt;", kwargs["body_html"])
        self.assertIn("https://validation.example/ViewProjet/1", kwargs["body_html"])
        self.assertEqual(kwargs["metadata"]["recipient_id"], self.ppl.id)

    @patch(
        "validation_core.services.notification_service.enqueue_email_job",
        side_effect=RuntimeError("queue down"),
    )
    def test_affectation_email_ignores_queue_failure_and_missing_email(
        self,
        enqueue_mock,
    ):
        role = self.ppl.affectations.get(projet=self.project).role

        self.assertIsNone(
            dispatch_project_affectation_email(
                recipient=self.ppl,
                projet=self.project,
                role=role,
            )
        )
        self.ppl.email = ""
        self.assertIsNone(
            dispatch_project_affectation_email(
                recipient=self.ppl,
                projet=self.project,
                role=role,
            )
        )
        enqueue_mock.assert_called_once()
