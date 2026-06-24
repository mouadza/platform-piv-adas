from datetime import timedelta
from unittest.mock import patch

from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone

from admin_config.models import (
    Affectation,
    AuditLog,
    CustomUser,
    EmailOTP,
    Gamme,
    Projet,
    Role,
    StepValidation,
)
from admin_config.auth.token_serializers import CustomTokenObtainPairSerializer
from admin_config.services import access_control
from admin_config.services.audit_service import (
    get_client_ip,
    get_user_agent,
    log_audit_event,
    sanitize_metadata,
)
from admin_config.services.dashboard_service import admin_dashboard_service
from admin_config.services.otp_service import (
    GENERIC_OTP_RESPONSE,
    OTPRateLimitError,
    OTPValidationError,
    build_unique_username,
    enforce_otp_fifo,
    generate_non_repeated_code,
    get_or_create_bootstrap_admin,
    hash_otp_code,
    is_allowed_otp_email,
    normalize_email,
    request_email_otp,
    verify_email_otp,
)
from admin_config.services.gamme_validation_dates import (
    are_all_gamme_evs_validated,
    calculate_gamme_validation_dates,
    compute_ev_result_from_cotations,
    get_gamme_ev_results,
    get_gamme_ev_validation_completion,
)


class AccessControlServiceTests(TestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_superuser(
            username="Admin",
            email="admin@stellantis.com",
            password="adminpass123",
        )
        self.ppl = CustomUser.objects.create_user(
            username="PPL",
            email="ppl@stellantis.com",
        )
        self.valideur = CustomUser.objects.create_user(
            username="Valideur",
            email="valideur@stellantis.com",
        )
        self.visiteur = CustomUser.objects.create_user(
            username="Visiteur",
            email="visiteur@stellantis.com",
        )
        self.projet = Projet.objects.create(
            nom_projet="Projet Access",
            nombre_vehicules=1,
        )
        self.other_project = Projet.objects.create(
            nom_projet="Projet Other",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.projet,
            nom="Gamme",
            nom_gamme="Gamme Access",
        )
        self.roles = {
            "PPL": Role.objects.create(
                code="PPL",
                label="PPL",
                access_level="PPL",
            ),
            "VALIDEUR": Role.objects.create(
                code="VALIDEUR",
                label="Valideur",
                access_level="VALIDEUR",
            ),
            "VISITEUR": Role.objects.create(
                code="VISITEUR",
                label="Visiteur",
                access_level="VISITEUR",
            ),
        }
        Affectation.objects.create(
            user=self.ppl,
            projet=self.projet,
            role=self.roles["PPL"],
        )
        Affectation.objects.create(
            user=self.valideur,
            projet=self.projet,
            role=self.roles["VALIDEUR"],
        )
        Affectation.objects.create(
            user=self.visiteur,
            projet=self.projet,
            role=self.roles["VISITEUR"],
        )

    def test_project_and_gamme_permissions_by_role(self):
        self.assertTrue(access_control.can_read_project(self.ppl, self.projet.id))
        self.assertTrue(access_control.can_manage_gamme(self.ppl, self.gamme))
        self.assertFalse(access_control.can_validate_gamme(self.ppl, self.gamme))

        self.assertTrue(access_control.can_validate_gamme(self.valideur, self.gamme))
        self.assertFalse(access_control.can_manage_gamme(self.valideur, self.gamme))

        self.assertTrue(access_control.can_read_gamme(self.visiteur, self.gamme))
        self.assertFalse(access_control.can_comment_gamme(self.visiteur, self.gamme))

    def test_super_admin_has_global_access(self):
        self.assertTrue(
            access_control.can_manage_project_gammes(
                self.admin,
                self.other_project.id,
            )
        )
        self.assertTrue(access_control.can_validate_gamme_id(self.admin, self.gamme.id))

    def test_invalid_or_unassigned_ids_are_refused(self):
        self.assertFalse(access_control.is_valid_numeric_id("abc"))
        self.assertFalse(access_control.can_read_project(self.ppl, "abc"))
        self.assertFalse(access_control.can_read_project(self.ppl, self.other_project.id))
        self.assertFalse(access_control.can_read_gamme_id(self.ppl, "not-an-id"))

    def test_queryset_filters_keep_only_assigned_objects(self):
        Projet.objects.create(nom_projet="Unassigned", nombre_vehicules=1)

        projects = access_control.filter_projects_for_user(
            Projet.objects.all(),
            self.ppl,
        )
        gammes = access_control.filter_gammes_for_user(
            Gamme.objects.all(),
            self.ppl,
        )

        self.assertEqual(list(projects), [self.projet])
        self.assertEqual(list(gammes), [self.gamme])

    def test_forbidden_response_uses_403(self):
        response = access_control.forbidden_response("Nope")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "Nope")


class AdminDashboardServiceTests(TestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_superuser(
            username="Dashboard Admin",
            email="dashboard.admin@stellantis.com",
            password="StrongPassword123",
        )
        self.valideur = CustomUser.objects.create_user(
            username="Dashboard Valideur",
            email="dashboard.valideur@stellantis.com",
        )
        self.project_a = Projet.objects.create(
            nom_projet="Projet Decision A",
            nombre_vehicules=1,
        )
        self.project_b = Projet.objects.create(
            nom_projet="Projet Decision B",
            nombre_vehicules=1,
        )
        self.gamme_a = Gamme.objects.create(
            projet=self.project_a,
            nom="Gamme A",
            nom_gamme="Gamme A",
        )
        self.gamme_b = Gamme.objects.create(
            projet=self.project_a,
            nom="Gamme B",
            nom_gamme="Gamme B",
        )
        self.gamme_c = Gamme.objects.create(
            projet=self.project_b,
            nom="Gamme C",
            nom_gamme="Gamme C",
        )

    def create_validation(self, gamme, step_code, cotation):
        return StepValidation.objects.create(
            gamme=gamme,
            ev_code="EV-1",
            step_code=step_code,
            cotation=cotation,
            commentaire="commentaire" if cotation != "OK" else "",
            user=self.valideur,
        )

    def test_admin_dashboard_exposes_decision_kpis(self):
        self.create_validation(self.gamme_a, "S1", "OK")
        self.create_validation(self.gamme_a, "S2", "NOK_mineur")
        self.create_validation(self.gamme_c, "S1", "NOK")

        data = admin_dashboard_service(self.admin)

        self.assertEqual(data["global_cotations"]["total"], 3)
        self.assertEqual(data["global_cotations"]["OK"], 1)
        self.assertEqual(data["global_cotations"]["NOK"], 1)
        self.assertEqual(data["global_cotations"]["NOK_mineur"], 1)
        self.assertEqual(data["kpis"]["global_ok_rate"], 33.3)
        self.assertIn("project_progress", data)
        self.assertIn("risk_projects", data)

        project_a = next(
            item
            for item in data["project_progress"]
            if item["project_id"] == self.project_a.id
        )

        self.assertEqual(project_a["total_gammes"], 2)
        self.assertEqual(project_a["gammes_started"], 1)
        self.assertEqual(project_a["gammes_not_started"], 1)
        self.assertEqual(project_a["advancement_percent"], 50.0)


class AuditServiceTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = CustomUser.objects.create_user(
            username="Audit User",
            email="audit@stellantis.com",
        )
        self.projet = Projet.objects.create(
            nom_projet="Projet Audit",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.projet,
            nom="Gamme Audit",
            nom_gamme="Gamme Audit",
        )

    def test_sanitize_metadata_masks_sensitive_values_recursively(self):
        sanitized = sanitize_metadata(
            {
                "token": "secret-token",
                "nested": {
                    "password": "secret-password",
                    "safe": "value",
                },
                "items": [{"otp_code": "123456"}],
            }
        )

        self.assertEqual(sanitized["token"], "***")
        self.assertEqual(sanitized["nested"]["password"], "***")
        self.assertEqual(sanitized["nested"]["safe"], "value")
        self.assertEqual(sanitized["items"][0]["otp_code"], "***")

    def test_log_audit_event_stores_context_and_request_metadata(self):
        request = self.factory.get(
            "/admin_config/test/",
            HTTP_X_FORWARDED_FOR="10.0.0.1, 10.0.0.2",
            HTTP_USER_AGENT="UnitTestBrowser",
        )
        request.user = self.user

        log = log_audit_event(
            request=request,
            action="UNIT_TEST_ACTION",
            entity_type="gamme",
            entity_id=self.gamme.id,
            gamme=self.gamme,
            metadata={"authorization": "Bearer abc", "visible": "yes"},
        )

        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.user_email, self.user.email)
        self.assertEqual(log.projet, self.projet)
        self.assertEqual(log.gamme, self.gamme)
        self.assertEqual(log.ip_address, "10.0.0.1")
        self.assertEqual(log.user_agent, "UnitTestBrowser")
        self.assertEqual(log.metadata["authorization"], "***")
        self.assertEqual(log.metadata["visible"], "yes")

    def test_request_helpers_handle_missing_request(self):
        request = self.factory.get("/admin_config/test/", REMOTE_ADDR="127.0.0.1")

        self.assertIsNone(get_client_ip(None))
        self.assertEqual(get_client_ip(request), "127.0.0.1")
        self.assertEqual(get_user_agent(None), "")


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    OTP_ALLOWED_EMAIL_DOMAINS=["stellantis.com", "external.stellantis.com"],
    OTP_BOOTSTRAP_ADMIN_EMAILS=["ta45177@stellantis.com"],
    OTP_EXPIRATION_MINUTES=10,
    OTP_HISTORY_LIMIT=10,
)
class OTPServiceTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="OTP User",
            email="mouad.zaouia@external.stellantis.com",
        )

    def test_normalization_and_domain_checks(self):
        self.assertEqual(
            normalize_email("  Mouad.Zaouia@External.Stellantis.com "),
            "mouad.zaouia@external.stellantis.com",
        )
        self.assertTrue(is_allowed_otp_email("user@stellantis.com"))
        self.assertTrue(is_allowed_otp_email("user@external.stellantis.com"))
        self.assertFalse(is_allowed_otp_email("user@example.com"))

    def test_bootstrap_admin_is_created_once_with_unusable_password(self):
        user = get_or_create_bootstrap_admin("ta45177@stellantis.com")
        same_user = get_or_create_bootstrap_admin("ta45177@stellantis.com")

        self.assertEqual(user, same_user)
        self.assertTrue(user.is_superuser)
        self.assertFalse(user.has_usable_password())
        self.assertIsNone(get_or_create_bootstrap_admin("other@stellantis.com"))

    def test_build_unique_username_adds_suffix_when_needed(self):
        CustomUser.objects.create_user(
            username="mouad zaouia",
            email="existing@stellantis.com",
        )

        username = build_unique_username(
            CustomUser,
            "mouad.zaouia@stellantis.com",
        )

        self.assertEqual(username, "mouad zaouia 2")

    def test_generate_non_repeated_code_skips_recent_hashes(self):
        EmailOTP.objects.create(
            user=self.user,
            email=self.user.email,
            code_hash=hash_otp_code("000001"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        with patch("admin_config.services.otp_service.secrets.randbelow") as rand:
            rand.side_effect = [1, 2]
            code, code_hash = generate_non_repeated_code(self.user)

        self.assertEqual(code, "000002")
        self.assertEqual(code_hash, hash_otp_code("000002"))

    def test_fifo_keeps_only_recent_history(self):
        now = timezone.now()

        for index in range(12):
            otp = EmailOTP.objects.create(
                user=self.user,
                email=self.user.email,
                code_hash=hash_otp_code(f"{index:06d}"),
                expires_at=now + timedelta(minutes=10),
            )
            EmailOTP.objects.filter(id=otp.id).update(
                created_at=now + timedelta(seconds=index)
            )

        enforce_otp_fifo(self.user)

        self.assertEqual(EmailOTP.objects.filter(user=self.user).count(), 10)

    def test_request_and_verify_email_otp_success(self):
        with patch(
            "admin_config.services.otp_service.generate_non_repeated_code",
            return_value=("123456", hash_otp_code("123456")),
        ), patch("admin_config.services.otp_service.send_otp_email"):
            response = request_email_otp(self.user.email)

        self.assertEqual(response["message"], GENERIC_OTP_RESPONSE)
        self.assertEqual(EmailOTP.objects.filter(user=self.user).count(), 1)

        tokens = verify_email_otp(self.user.email, "123456")
        self.user.refresh_from_db()

        self.assertIn("access", tokens)
        self.assertIn("refresh", tokens)
        self.assertTrue(self.user.is_active)
        self.assertTrue(EmailOTP.objects.get(user=self.user).is_used)

    def test_request_email_otp_validation_errors_and_rate_limit(self):
        with self.assertRaises(OTPValidationError):
            request_email_otp("invalid-email")

        with self.assertRaises(OTPValidationError):
            request_email_otp("user@example.com")

        EmailOTP.objects.create(
            user=self.user,
            email=self.user.email,
            code_hash=hash_otp_code("000001"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        with self.assertRaises(OTPRateLimitError):
            request_email_otp(self.user.email)

    def test_verify_email_otp_rejects_invalid_code_and_expired_codes(self):
        with self.assertRaises(OTPValidationError):
            verify_email_otp(self.user.email, "abc")

        otp = EmailOTP.objects.create(
            user=self.user,
            email=self.user.email,
            code_hash=hash_otp_code("654321"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        with self.assertRaises(OTPValidationError):
            verify_email_otp(self.user.email, "111111")

        otp.refresh_from_db()
        self.assertEqual(otp.failed_attempts, 1)

        otp.expires_at = timezone.now() - timedelta(minutes=1)
        otp.save(update_fields=["expires_at"])

        with self.assertRaises(OTPValidationError):
            verify_email_otp(self.user.email, "654321")


class TokenSerializerTests(TestCase):
    def setUp(self):
        self.project = Projet.objects.create(
            nom_projet="Projet Token",
            nombre_vehicules=1,
        )
        self.admin_role = Role.objects.create(
            code="ADMIN",
            label="Admin",
            access_level="ADMIN",
        )
        self.valideur_role = Role.objects.create(
            code="VALIDEUR",
            label="Valideur",
            access_level="VALIDEUR",
        )

    def test_superuser_password_login_returns_admin_claims(self):
        user = CustomUser.objects.create_superuser(
            username="Root",
            email="root@stellantis.com",
            password="StrongPassword123",
        )
        serializer = CustomTokenObtainPairSerializer()

        tokens = serializer.validate(
            {
                "email": user.email,
                "password": "StrongPassword123",
            }
        )
        token = serializer.get_token(user)

        self.assertIn("access", tokens)
        self.assertEqual(token["roles"], ["ADMIN"])
        self.assertEqual(token["access_level"], "ADMIN")
        self.assertEqual(token["affectations"], [])

    def test_role_admin_can_use_password_login(self):
        user = CustomUser.objects.create_user(
            username="Role Admin",
            email="role.admin@stellantis.com",
            password="StrongPassword123",
        )
        Affectation.objects.create(
            user=user,
            projet=self.project,
            role=self.admin_role,
        )
        serializer = CustomTokenObtainPairSerializer()

        tokens = serializer.validate(
            {
                "email": user.email,
                "password": "StrongPassword123",
            }
        )

        self.assertIn("refresh", tokens)

    def test_non_admin_password_login_is_refused(self):
        user = CustomUser.objects.create_user(
            username="Valideur Token",
            email="valideur.token@stellantis.com",
            password="StrongPassword123",
        )
        Affectation.objects.create(
            user=user,
            projet=self.project,
            role=self.valideur_role,
        )
        serializer = CustomTokenObtainPairSerializer()

        with self.assertRaisesMessage(
            Exception,
            "Connexion par mot de passe reservee aux admins.",
        ):
            serializer.validate(
                {
                    "email": user.email,
                    "password": "StrongPassword123",
                }
            )

    def test_token_contains_project_affectations_for_non_superuser(self):
        user = CustomUser.objects.create_user(
            username="Valideur Claims",
            email="claims@stellantis.com",
        )
        Affectation.objects.create(
            user=user,
            projet=self.project,
            role=self.valideur_role,
        )

        token = CustomTokenObtainPairSerializer.get_token(user)

        self.assertEqual(token["roles"], ["VALIDEUR"])
        self.assertEqual(token["access_level"], "VALIDEUR")
        self.assertEqual(
            token["affectations"],
            [
                {
                    "projet_id": self.project.id,
                    "projet_nom": "Projet Token",
                    "role": "VALIDEUR",
                }
            ],
        )


class GammeValidationDatesServiceTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="Validation User",
            email="validation.user@stellantis.com",
        )
        self.projet = Projet.objects.create(
            nom_projet="Projet Dates",
            nombre_vehicules=1,
        )
        self.gamme = Gamme.objects.create(
            projet=self.projet,
            nom="Gamme Dates",
            nom_gamme="Gamme Dates",
        )

    def create_validation(self, ev_code, step_code, cotation, created_at):
        validation = StepValidation.objects.create(
            gamme=self.gamme,
            ev_code=ev_code,
            step_code=step_code,
            cotation=cotation,
            commentaire="comment" if cotation != "OK" else "",
            user=self.user,
        )
        StepValidation.objects.filter(id=validation.id).update(
            created_at=created_at
        )
        validation.refresh_from_db()
        return validation

    def test_completion_dates_and_ev_results_are_calculated_from_history(self):
        start = timezone.now() - timedelta(days=4)
        self.create_validation("EV-1", "S1", "OK", start)
        self.create_validation("EV-1", "S2", "NOK_mineur", start + timedelta(days=1))
        self.create_validation("EV-2", "S3", "NOK", start + timedelta(days=2))

        date_debut, date_fin = calculate_gamme_validation_dates(self.gamme)
        completion = get_gamme_ev_validation_completion(self.gamme)
        results = get_gamme_ev_results(self.gamme)

        self.assertEqual(date_debut, (start + timedelta(days=1)).date())
        self.assertEqual(date_fin, (start + timedelta(days=2)).date())
        self.assertTrue(completion["all_validated"])
        self.assertEqual(results["EV-1"], "NOK_mineur")
        self.assertEqual(results["EV-2"], "NOK")
        self.assertTrue(are_all_gamme_evs_validated(self.gamme))

    def test_incomplete_ev_reports_missing_steps(self):
        start = timezone.now() - timedelta(days=2)
        self.create_validation("EV-1", "S1", "OK", start)
        self.create_validation("EV-1", "S2", "A_coter", start + timedelta(days=1))

        completion = get_gamme_ev_validation_completion(self.gamme)

        self.assertFalse(completion["all_validated"])
        self.assertEqual(completion["incomplete"], {"EV-1": ["S2"]})
        self.assertFalse(are_all_gamme_evs_validated(self.gamme))

    def test_compute_ev_result_prioritizes_final_cotations(self):
        self.assertEqual(compute_ev_result_from_cotations([]), "IN_PROGRESS")
        self.assertEqual(
            compute_ev_result_from_cotations(["OK", "A_coter"]),
            "IN_PROGRESS",
        )
        self.assertEqual(compute_ev_result_from_cotations(["OK"]), "OK")
        self.assertEqual(
            compute_ev_result_from_cotations(["OK", "NOK_mineur"]),
            "NOK_mineur",
        )
        self.assertEqual(
            compute_ev_result_from_cotations(["NOK_mineur", "NOK"]),
            "NOK",
        )
