import logging
from html import escape
from urllib.parse import urlencode

from django.conf import settings
from django.db.models import Q

from validation_core.models import Affectation, CustomUser, EmailJob, Notification
from validation_core.services.email_jobs import enqueue_email_job


logger = logging.getLogger(__name__)

ROLE_TARGET_URLS = {
    "ADMIN": "/AdminDash",
    "PPL": "/ppldash",
    "VALIDEUR": "/valideurdash",
    "VISITEUR": "/EspaceUser",
}


class _NotificationRole:
    def __init__(self, access_level):
        self.access_level = access_level
        self.label = access_level


def role_target_url(role):
    access_level = str(getattr(role, "access_level", "") or "").upper()
    return ROLE_TARGET_URLS.get(access_level, "/choix-espace")


def _role_access(role):
    return str(getattr(role, "access_level", "") or "").upper() or "VISITEUR"


def _role_label(role):
    return (
        getattr(role, "label", None)
        or getattr(role, "access_level", None)
        or "un role"
    )


def _url_with_context(path, *, role, projet=None, **extra_params):
    access_level = _role_access(role)
    params = {"role": access_level}

    if projet:
        params["project"] = projet.id

    params.update(
        {
            key: value
            for key, value in extra_params.items()
            if value is not None and value != ""
        }
    )

    return f"{path}?{urlencode(params)}"


def _project_target_url_for_role(projet, role):
    access_level = _role_access(role)

    if not projet:
        return _url_with_context(role_target_url(role), role=role)

    if access_level in {"ADMIN", "PPL"}:
        path = f"/ViewProjet/{projet.id}"
    elif access_level == "VALIDEUR":
        path = f"/GammeImporteValideur/{projet.id}"
    else:
        path = "/EspaceUser"

    return _url_with_context(path, role=role, projet=projet)


def _gamme_target_url_for_role(gamme, role, *, destination="validation", event=""):
    projet = getattr(gamme, "projet", None)
    access_level = _role_access(role)
    gamme_id = getattr(gamme, "id", None)

    if not gamme_id:
        return _project_target_url_for_role(projet, role)

    if destination == "report":
        path = f"/validation-report/{gamme_id}"
    elif destination == "detail" and projet and access_level in {"ADMIN", "PPL"}:
        path = f"/gamme/{projet.id}/{gamme_id}/"
    else:
        path = f"/validation/{gamme_id}"

    return _url_with_context(
        path,
        role=role,
        projet=projet,
        gamme=gamme_id,
        event=event,
    )


def create_notification(
    *,
    recipient,
    title,
    message,
    type,
    projet=None,
    target_url="",
):
    if not recipient:
        return None

    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        type=type,
        projet=projet,
        target_url=target_url,
    )


def create_notification_once(
    *,
    recipient,
    title,
    message,
    type,
    projet=None,
    target_url="",
):
    if not recipient:
        return None

    existing = Notification.objects.filter(
        recipient=recipient,
        type=type,
        projet=projet,
        target_url=target_url,
    ).first()

    if existing:
        return existing

    return create_notification(
        recipient=recipient,
        title=title,
        message=message,
        type=type,
        projet=projet,
        target_url=target_url,
    )


def _user_label(user):
    return (
        getattr(user, "username", None)
        or getattr(user, "email", None)
        or "un utilisateur"
    )


def _gamme_label(gamme):
    return (
        getattr(gamme, "nom_gamme", None)
        or getattr(gamme, "nom", None)
        or f"Gamme {getattr(gamme, 'id', '')}".strip()
    )


def _projet_label(projet):
    return getattr(projet, "nom_projet", None) or "le projet"


def _absolute_target_url(target_url):
    if not target_url:
        return ""

    frontend_url = str(getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")

    if not frontend_url:
        return target_url

    return f"{frontend_url}{target_url if target_url.startswith('/') else f'/{target_url}'}"


def dispatch_project_affectation_email(
    *,
    recipient,
    projet,
    role,
    actor=None,
    target_url="",
):
    recipient_email = str(getattr(recipient, "email", "") or "").strip()

    if not recipient_email:
        return None

    recipient_label = _user_label(recipient)
    projet_label = _projet_label(projet)
    role_label = (
        getattr(role, "label", None)
        or getattr(role, "access_level", None)
        or "un role"
    )
    actor_label = _user_label(actor) if actor else "Un administrateur"
    link = _absolute_target_url(target_url)
    safe_recipient_label = escape(str(recipient_label))
    safe_projet_label = escape(str(projet_label))
    safe_role_label = escape(str(role_label))
    safe_actor_label = escape(str(actor_label))
    safe_link = escape(str(link), quote=True)
    subject = f"Affectation au projet {projet_label}"
    body_text = (
        f"Bonjour {recipient_label},\n\n"
        f"{actor_label} vous a affecte au projet {projet_label} "
        f"avec le role {role_label}.\n"
    )

    if link:
        body_text += f"\nAcceder au projet : {link}\n"

    body_text += "\nCordialement,\nValidation Platform"

    body_html = f"""
    <div style="font-family:Arial,sans-serif;color:#172033;line-height:1.5">
      <h2 style="margin:0 0 12px;color:#0F1E3C">Affectation au projet</h2>
      <p>Bonjour <strong>{safe_recipient_label}</strong>,</p>
      <p>
        <strong>{safe_actor_label}</strong> vous a affecte au projet
        <strong>{safe_projet_label}</strong> avec le role <strong>{safe_role_label}</strong>.
      </p>
      {f'<p><a href="{safe_link}" style="display:inline-block;background:#243782;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700">Ouvrir le projet</a></p>' if link else ''}
      <p style="margin-top:18px;color:#64748b;font-size:13px">Validation Platform</p>
    </div>
    """

    try:
        return enqueue_email_job(
            email_type=EmailJob.Type.NOTIFICATION,
            recipient_email=recipient_email,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            metadata={
                "notification_type": "PROJECT_ASSIGNED",
                "recipient_id": recipient.id,
                "projet_id": getattr(projet, "id", None),
                "role_id": getattr(role, "id", None),
            },
            queue=getattr(settings, "CELERY_NOTIFICATION_EMAIL_QUEUE", "email"),
            async_enabled=True,
            fallback_sync=False,
        )
    except Exception as exc:
        logger.warning(
            "Project affectation email could not be sent to %s: %s",
            recipient_email,
            exc,
        )
        return None


def _is_admin_user(user):
    if not user:
        return False

    if getattr(user, "is_superuser", False):
        return True

    return user.affectations.filter(
        role__access_level__iexact="ADMIN"
    ).exists()


def _admin_recipients():
    return (
        CustomUser.objects.filter(is_active=True)
        .filter(
            Q(affectations__role__access_level__iexact="ADMIN")
            | Q(is_superuser=True)
            | Q(is_staff=True)
        )
    ).distinct()


def _project_non_admin_affectations(projet):
    if not projet:
        return Affectation.objects.none()

    return (
        Affectation.objects.select_related("user", "role", "projet")
        .filter(
            projet=projet,
            user__is_active=True,
        )
        .exclude(role__access_level__iexact="ADMIN")
    )


def notify_admins_gamme_started(gamme, *, actor=None):
    projet = getattr(gamme, "projet", None)
    gamme_label = _gamme_label(gamme)
    projet_label = _projet_label(projet)
    actor_label = _user_label(actor) if actor else "La plateforme"
    target_url = _gamme_target_url_for_role(
        gamme,
        _NotificationRole("ADMIN"),
        destination="validation",
        event="GAMME_STARTED",
    )

    return [
        create_notification_once(
            recipient=admin,
            title="Debut de gamme",
            message=(
                f"{actor_label} a demarre la gamme "
                f"{gamme_label} dans le projet {projet_label}."
            ),
            type=Notification.Type.GAMME_STARTED,
            projet=projet,
            target_url=target_url,
        )
        for admin in _admin_recipients()
    ]


def notify_admins_gamme_finished(gamme, *, actor=None):
    projet = getattr(gamme, "projet", None)
    gamme_label = _gamme_label(gamme)
    projet_label = _projet_label(projet)
    actor_label = _user_label(actor) if actor else "La plateforme"
    target_url = _gamme_target_url_for_role(
        gamme,
        _NotificationRole("ADMIN"),
        destination="report",
        event="GAMME_FINISHED",
    )

    return [
        create_notification_once(
            recipient=admin,
            title="Fin de gamme",
            message=(
                f"{actor_label} a termine la gamme "
                f"{gamme_label} dans le projet {projet_label}."
            ),
            type=Notification.Type.GAMME_FINISHED,
            projet=projet,
            target_url=target_url,
        )
        for admin in _admin_recipients()
    ]


def notify_project_gamme_added(gamme, *, actor=None):
    projet = getattr(gamme, "projet", None)
    gamme_label = _gamme_label(gamme)
    projet_label = _projet_label(projet)
    actor_label = _user_label(actor) if actor else "Un utilisateur"

    notifications = []

    for affectation in _project_non_admin_affectations(projet):
        role = affectation.role
        role_label = _role_label(role)
        notification = create_notification(
            recipient=affectation.user,
            title=f"Nouvelle gamme - {role_label}",
            message=(
                f"{actor_label} a ajoute la gamme {gamme_label} "
                f"dans le projet {projet_label} pour votre espace {role_label}."
            ),
            type=Notification.Type.GAMME_ADDED_TO_PROJECT,
            projet=projet,
            target_url=_gamme_target_url_for_role(
                gamme,
                role,
                destination="detail",
                event="GAMME_ADDED_TO_PROJECT",
            ),
        )
        if notification:
            notifications.append(notification)

    return notifications


def notify_user_affectation(affectation, *, actor=None):
    role = affectation.role
    projet = affectation.projet

    role_label = _role_label(role)
    projet_label = getattr(projet, "nom_projet", None) or "la plateforme"
    actor_label = (
        getattr(actor, "username", None)
        or getattr(actor, "email", None)
        or "un administrateur"
    )

    target_url = _project_target_url_for_role(projet, role)

    notification = create_notification(
        recipient=affectation.user,
        title=f"Nouvelle affectation - {role_label}",
        message=(
            f"{actor_label} vous a affecte au projet {projet_label} "
            f"avec le role {role_label}. Connectez-vous pour consulter "
            "votre espace."
        ),
        type=Notification.Type.USER_AFFECTED,
        projet=projet,
        target_url=target_url,
    )
    dispatch_project_affectation_email(
        recipient=affectation.user,
        projet=projet,
        role=role,
        actor=actor,
        target_url=notification.target_url if notification else target_url,
    )

    return notification


def notify_project_affectation(affectation, *, actor=None):
    if not affectation or _is_admin_user(affectation.user):
        return None

    projet = affectation.projet
    role = affectation.role
    projet_label = _projet_label(projet)
    role_label = _role_label(role)
    actor_label = _user_label(actor) if actor else "Un administrateur"

    target_url = _project_target_url_for_role(projet, role)

    notification = create_notification(
        recipient=affectation.user,
        title=f"Projet affecte - {role_label}",
        message=(
            f"{actor_label} vous a affecte au projet {projet_label} "
            f"avec le role {role_label}."
        ),
        type=Notification.Type.PROJECT_ASSIGNED,
        projet=projet,
        target_url=target_url,
    )
    dispatch_project_affectation_email(
        recipient=affectation.user,
        projet=projet,
        role=role,
        actor=actor,
        target_url=target_url,
    )

    return notification


def notify_user_affectations(user, *, actor=None, only_keys=None):
    affectations = user.affectations.select_related("projet", "role")

    if only_keys is not None:
        affectations = [
            affectation
            for affectation in affectations
            if (affectation.projet_id, affectation.role_id) in only_keys
        ]

    notifications = []

    for affectation in affectations:
        notification = notify_user_affectation(affectation, actor=actor)
        if notification:
            notifications.append(notification)

    return notifications
