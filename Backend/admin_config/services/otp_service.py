from datetime import timedelta
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac

from admin_config.auth.token_serializers import CustomTokenObtainPairSerializer
from admin_config.models import EmailOTP


GENERIC_OTP_RESPONSE = (
    "Si cet email est autorise, un code OTP a ete envoye."
)


class OTPValidationError(Exception):
    pass


class OTPRateLimitError(Exception):
    pass


class OTPDeliveryError(Exception):
    pass


def normalize_email(email):
    return str(email or "").strip().lower()


def is_allowed_otp_email(email):
    allowed_domains = getattr(settings, "OTP_ALLOWED_EMAIL_DOMAINS", [])

    if not allowed_domains:
        return True

    domain = email.rsplit("@", 1)[-1].lower()

    return any(
        domain == allowed_domain or domain.endswith(f".{allowed_domain}")
        for allowed_domain in allowed_domains
    )


def is_bootstrap_admin_email(email):
    bootstrap_emails = getattr(settings, "OTP_BOOTSTRAP_ADMIN_EMAILS", [])
    return email in {normalize_email(item) for item in bootstrap_emails}


def build_unique_username(User, email):
    base_username = email.split("@", 1)[0].replace(".", " ").strip()
    base_username = base_username or "Admin Validation App"

    if not User.objects.filter(username=base_username).exists():
        return base_username

    for index in range(2, 100):
        username = f"{base_username} {index}"

        if not User.objects.filter(username=username).exists():
            return username

    return f"{base_username} {secrets.token_hex(4)}"


def get_or_create_bootstrap_admin(email):
    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()

    if user:
        return user

    if not is_bootstrap_admin_email(email):
        return None

    try:
        with transaction.atomic():
            user = User(
                username=build_unique_username(User, email),
                email=email,
                is_active=True,
                is_staff=True,
                is_superuser=True,
            )
            user.set_unusable_password()
            user.save()
            return user
    except IntegrityError:
        return User.objects.filter(email__iexact=email).first()


def is_admin_user(user):
    if not user:
        return False

    if getattr(user, "is_superuser", False):
        return True

    return user.affectations.filter(role__access_level="ADMIN").exists()


def hash_otp_code(code):
    return salted_hmac(
        "validation-app-email-otp",
        str(code),
        secret=settings.SECRET_KEY,
    ).hexdigest()


def generate_non_repeated_code(user):
    history_limit = getattr(settings, "OTP_HISTORY_LIMIT", 10)
    recent_hashes = set(
        EmailOTP.objects.filter(user=user)
        .order_by("-created_at")
        .values_list("code_hash", flat=True)[:history_limit]
    )

    for _ in range(50):
        code = f"{secrets.randbelow(1_000_000):06d}"
        code_hash = hash_otp_code(code)

        if code_hash not in recent_hashes:
            return code, code_hash

    raise OTPValidationError(
        "Impossible de generer un code unique pour le moment."
    )


def enforce_otp_fifo(user):
    history_limit = getattr(settings, "OTP_HISTORY_LIMIT", 10)
    ids_to_keep = list(
        EmailOTP.objects.filter(user=user)
        .order_by("-created_at")
        .values_list("id", flat=True)[:history_limit]
    )

    if ids_to_keep:
        EmailOTP.objects.filter(user=user).exclude(id__in=ids_to_keep).delete()


def send_otp_email(user, code):
    expiration_minutes = getattr(settings, "OTP_EXPIRATION_MINUTES", 10)
    subject = "Code OTP - Validation App"

    text_content = f"""
Bonjour {user.username or user.email},

Votre code OTP pour Validation App est :

{code}

Ce code expire dans {expiration_minutes} minutes.
Si vous n'avez pas demande ce code, ignorez cet email.

Cordialement,
Validation App
"""

    html_content = f"""
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:30px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#2563eb;padding:20px 28px;color:#ffffff;">
                <h1 style="margin:0;font-size:20px;">Validation App</h1>
                <p style="margin:6px 0 0;font-size:14px;">Authentification OTP</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1f2937;">
                <p style="font-size:15px;margin:0 0 16px;">
                  Bonjour <strong>{user.username or user.email}</strong>,
                </p>
                <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">
                  Utilisez le code suivant pour vous connecter a Validation App.
                </p>
                <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:18px 0;color:#111827;">
                  {code}
                </div>
                <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
                  Ce code expire dans {expiration_minutes} minutes. Si vous n'avez pas demande ce code, ignorez cet email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)


def request_email_otp(email):
    email = normalize_email(email)

    if not email or "@" not in email:
        raise OTPValidationError("Email obligatoire.")

    if not is_allowed_otp_email(email):
        raise OTPValidationError("Seul un email Stellantis est autorise.")

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()

    if not user:
        return {"message": GENERIC_OTP_RESPONSE}

    if is_admin_user(user):
        raise OTPValidationError(
            "Les admins doivent utiliser la connexion par mot de passe."
        )

    now = timezone.now()
    latest_otp = EmailOTP.objects.filter(user=user).order_by("-created_at").first()

    if latest_otp and latest_otp.created_at > now - timedelta(seconds=60):
        raise OTPRateLimitError(
            "Un code vient deja d'etre envoye. Merci d'attendre une minute."
        )

    code, code_hash = generate_non_repeated_code(user)
    otp = EmailOTP.objects.create(
        user=user,
        email=email,
        code_hash=code_hash,
        expires_at=now + timedelta(
            minutes=getattr(settings, "OTP_EXPIRATION_MINUTES", 10)
        ),
    )

    enforce_otp_fifo(user)

    try:
        send_otp_email(user, code)
    except Exception as exc:
        otp.delete()
        raise OTPDeliveryError("Le code OTP n'a pas pu etre envoye.") from exc

    return {"message": GENERIC_OTP_RESPONSE}


def verify_email_otp(email, code):
    email = normalize_email(email)
    code = str(code or "").strip()

    if not email or not code:
        raise OTPValidationError("Email et code OTP obligatoires.")

    if not code.isdigit() or len(code) != 6:
        raise OTPValidationError("Code OTP invalide.")

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()

    if not user:
        raise OTPValidationError("Code OTP invalide ou expire.")

    if is_admin_user(user):
        raise OTPValidationError(
            "Les admins doivent utiliser la connexion par mot de passe."
        )

    otp = (
        EmailOTP.objects.filter(user=user, email__iexact=email, used_at__isnull=True)
        .order_by("-created_at")
        .first()
    )

    if not otp or otp.is_expired:
        raise OTPValidationError("Code OTP invalide ou expire.")

    if otp.failed_attempts >= 5:
        raise OTPValidationError("Trop de tentatives. Demandez un nouveau code.")

    if otp.code_hash != hash_otp_code(code):
        otp.failed_attempts += 1
        otp.save(update_fields=["failed_attempts"])
        raise OTPValidationError("Code OTP invalide ou expire.")

    otp.used_at = timezone.now()
    otp.save(update_fields=["used_at"])

    if not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])

    refresh = CustomTokenObtainPairSerializer.get_token(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }
