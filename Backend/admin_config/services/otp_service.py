from datetime import timedelta
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac
from django.utils.html import escape

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
    base_username = base_username or "Admin PIV Platform"

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
    recipient_name = user.username or user.email
    safe_recipient_name = escape(str(recipient_name))
    subject = "Votre code de connexion - PIV Platform"

    text_content = f"""
Bonjour {recipient_name},

Voici votre code de connexion a PIV Platform :

{code}

Ce code est personnel, a usage unique, et expire dans {expiration_minutes} minutes.
Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.

Cordialement,
PIV Platform
"""

    html_content = f"""
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #dbe3ef;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#14213d;padding:22px 30px;color:#ffffff;border-bottom:4px solid #2f6fed;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="52" valign="middle" style="width:52px;padding:0;">
                      <table role="presentation" width="42" height="42" cellpadding="0" cellspacing="0" border="0" bgcolor="#2f6fed" style="width:42px;height:42px;background:#2f6fed;border-radius:10px;">
                        <tr>
                          <td align="center" valign="middle" height="42" style="height:42px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;line-height:42px;text-align:center;">PIV</td>
                        </tr>
                      </table>
                    </td>
                    <td valign="middle" style="padding-left:12px;">
                      <p style="margin:0;font-size:18px;font-weight:700;">PIV Platform</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;">Connexion securisee</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 30px 28px;">
                <p style="font-size:16px;margin:0 0 18px;color:#172033;">
                  Bonjour <strong>{safe_recipient_name}</strong>,
                </p>
                <p style="font-size:15px;line-height:1.6;margin:0 0 22px;color:#475569;">
                  Saisissez ce code dans l'application pour finaliser votre connexion.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
                  <tr>
                    <td align="center" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:20px 12px;font-size:34px;font-weight:700;letter-spacing:10px;color:#14213d;">
                      {code}
                    </td>
                  </tr>
                </table>
                <p style="font-size:13px;line-height:1.5;margin:0 0 22px;text-align:center;color:#64748b;">
                  Code personnel &bull; Usage unique &bull; Valable {expiration_minutes} minutes
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:#fff7ed;border-left:4px solid #f59e0b;padding:13px 15px;color:#7c2d12;font-size:13px;line-height:1.5;">
                      Vous n'avez pas demande ce code ? Ignorez simplement cet email et ne partagez le code avec personne.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 30px;text-align:center;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
                  Email automatique de PIV Platform &mdash; merci de ne pas repondre.
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

    connection = get_connection(timeout=getattr(settings, "EMAIL_TIMEOUT", 5))
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
        connection=connection,
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
