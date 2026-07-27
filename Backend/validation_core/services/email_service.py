from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.utils.html import escape


def send_account_authorized_email(user):
    login_link = f"{settings.FRONTEND_URL}/login"
    recipient_name = user.username or user.email
    safe_recipient_name = escape(str(recipient_name))
    safe_user_email = escape(str(user.email))
    safe_login_link = escape(login_link)

    subject = "Votre acces est active - PIV Platform"

    text_content = f"""
Bonjour {recipient_name},

Votre acces a PIV Platform est maintenant active.

Lien d'acces :
{login_link}

Votre identifiant :
Email : {user.email}

La connexion se fait avec votre email Stellantis et un code OTP envoye par email.

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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dbe3ef;">
            <tr>
              <td style="background:#14213d;padding:22px 30px;color:#ffffff;border-bottom:4px solid #22a06b;">
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
                      <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;">Gestion des validations</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 30px 28px;">
                <div style="display:inline-block;background:#ecfdf3;color:#067647;border:1px solid #abefc6;border-radius:20px;padding:6px 12px;font-size:12px;font-weight:700;margin-bottom:20px;">
                  ACCES ACTIVE
                </div>
                <p style="font-size:16px;margin:0 0 16px;color:#172033;">
                  Bonjour <strong>{safe_recipient_name}</strong>,
                </p>

                <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#475569;">
                  Votre acces a <strong>PIV Platform</strong> est maintenant active. Vous pouvez vous connecter avec votre adresse professionnelle.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #dbe3ef;border-radius:10px;padding:16px;">
                      <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Identifiant de connexion</p>
                      <p style="margin:0;font-size:15px;color:#172033;font-weight:700;">{safe_user_email}</p>
                    </td>
                  </tr>
                </table>

                <p style="text-align:center;margin:28px 0;">
                  <a href="{safe_login_link}" style="background:#2f6fed;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;">
                    Se connecter a PIV Platform
                  </a>
                </p>

                <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 16px;">
                  Lors de la connexion, un code de verification a usage unique vous sera envoye par email.
                </p>
                <p style="font-size:12px;color:#64748b;line-height:1.6;margin:0;">
                  Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
                </p>
                <p style="font-size:12px;color:#2f6fed;word-break:break-all;margin:6px 0 0;">
                  {safe_login_link}
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:16px 30px;color:#64748b;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;">
                Email automatique de PIV Platform &mdash; merci de ne pas repondre.
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

    return login_link
