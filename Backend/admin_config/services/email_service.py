from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def send_account_authorized_email(user):
    login_link = f"{settings.FRONTEND_URL}/login"
    recipient_name = user.username or user.email

    subject = "Acces autorise - Validation App"

    text_content = f"""
Bonjour {recipient_name},

Votre compte a ete autorise pour acceder a Validation App.

Lien d'acces :
{login_link}

Votre identifiant :
Email : {user.email}

La connexion se fait avec votre email Stellantis et un code OTP envoye par email.

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
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#2563eb;padding:22px 30px;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;">Validation App</h1>
                <p style="margin:6px 0 0;font-size:14px;">Acces autorise</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;color:#1f2937;">
                <p style="font-size:15px;margin:0 0 16px;">
                  Bonjour <strong>{recipient_name}</strong>,
                </p>

                <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">
                  Votre compte a ete autorise pour acceder a l'application <strong>Validation App</strong>.
                </p>

                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:20px 0;">
                  <p style="margin:0;font-size:14px;color:#6b7280;">Identifiant de connexion</p>
                  <p style="margin:6px 0 0;font-size:15px;">
                    <strong>Email :</strong> {user.email}
                  </p>
                </div>

                <p style="text-align:center;margin:28px 0;">
                  <a href="{login_link}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block;">
                    Acceder a l'application
                  </a>
                </p>

                <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:20px 0 0;">
                  La connexion se fait avec votre email Stellantis et un code OTP envoye par email.
                </p>

                <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:16px 0 0;">
                  Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
                </p>

                <p style="font-size:12px;color:#2563eb;word-break:break-all;margin:8px 0 0;">
                  {login_link}
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:18px 30px;color:#6b7280;font-size:12px;text-align:center;border-top:1px solid #e5e7eb;">
                Validation App - Email automatique, merci de ne pas repondre.
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

    return login_link
