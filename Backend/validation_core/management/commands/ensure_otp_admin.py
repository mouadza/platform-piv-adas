from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from validation_core.services.otp_service import build_unique_username, normalize_email


class Command(BaseCommand):
    help = "Create or promote an OTP-only application admin."

    def add_arguments(self, parser):
        parser.add_argument("email", help="Admin email allowed to login by OTP.")
        parser.add_argument(
            "--username",
            help="Optional display username. Defaults to the email local part.",
        )

    def handle(self, *args, **options):
        email = normalize_email(options["email"])

        if not email or "@" not in email:
            raise CommandError("A valid email is required.")

        user_model = get_user_model()

        with transaction.atomic():
            user = user_model.objects.filter(email__iexact=email).first()
            created = user is None
            requested_username = options.get("username")

            if requested_username:
                username_owner = user_model.objects.filter(
                    username=requested_username
                ).first()

                if username_owner and username_owner.email.lower() != email:
                    raise CommandError("This username is already used.")

            if created:
                user = user_model(
                    username=(
                        requested_username
                        or build_unique_username(user_model, email)
                    ),
                    email=email,
                )

            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.set_unusable_password()
            user.save()

        action = "created" if created else "promoted"
        self.stdout.write(
            self.style.SUCCESS(
                f"OTP admin {action}: {user.email} (id={user.id})"
            )
        )
