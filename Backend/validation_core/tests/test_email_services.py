from django.core import mail
from django.test import TestCase, override_settings

from validation_core.models import CustomUser
from validation_core.services.email_service import send_account_authorized_email
from validation_core.services.otp_service import send_otp_email


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="no-reply@validation-app.test",
    FRONTEND_URL="https://validation-app.test",
)
class EmailServiceTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="Mouad Zaouia",
            email="mouad.zaouia@external.stellantis.com",
        )

    def test_otp_email_contains_the_code_and_security_information(self):
        send_otp_email(self.user, "192955")

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(
            message.subject,
            "Votre code de connexion - PIV Platform",
        )
        self.assertIn("192955", message.body)
        self.assertIn("usage unique", message.body)
        self.assertIn("192955", message.alternatives[0].content)
        self.assertIn("Connexion securisee", message.alternatives[0].content)
        self.assertIn(">PIV</td>", message.alternatives[0].content)
        self.assertIn("PIV Platform", message.alternatives[0].content)

    def test_authorization_email_contains_login_link_and_identifier(self):
        login_link = send_account_authorized_email(self.user)

        self.assertEqual(login_link, "https://validation-app.test/login")
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(
            message.subject,
            "Votre acces est active - PIV Platform",
        )
        self.assertIn(self.user.email, message.body)
        self.assertIn(login_link, message.body)
        self.assertIn("ACCES ACTIVE", message.alternatives[0].content)
        self.assertIn(login_link, message.alternatives[0].content)
        self.assertIn(">PIV</td>", message.alternatives[0].content)
        self.assertIn("PIV Platform", message.alternatives[0].content)
