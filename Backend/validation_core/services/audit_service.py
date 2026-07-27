import logging

from validation_core.models import AuditLog


logger = logging.getLogger(__name__)

SENSITIVE_KEYWORDS = (
    "password",
    "token",
    "secret",
    "otp",
    "authorization",
)


def get_client_ip(request):
    if not request:
        return None

    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")


def get_user_agent(request):
    if not request:
        return ""

    return request.META.get("HTTP_USER_AGENT", "")[:1000]


def sanitize_metadata(value):
    if isinstance(value, dict):
        sanitized = {}

        for key, item in value.items():
            key_string = str(key)

            if any(keyword in key_string.lower() for keyword in SENSITIVE_KEYWORDS):
                sanitized[key_string] = "***"
            else:
                sanitized[key_string] = sanitize_metadata(item)

        return sanitized

    if isinstance(value, list):
        return [sanitize_metadata(item) for item in value]

    if isinstance(value, tuple):
        return [sanitize_metadata(item) for item in value]

    return value


def _resolve_audit_context(*, projet, projet_id, gamme, gamme_id):
    if gamme and not gamme_id:
        gamme_id = getattr(gamme, "id", None)

    if projet and not projet_id:
        projet_id = getattr(projet, "id", None)

    if gamme and not projet and not projet_id:
        projet = getattr(gamme, "projet", None)
        projet_id = getattr(gamme, "projet_id", None)

    return projet, projet_id, gamme_id


def _build_audit_metadata(metadata, *, projet_id, gamme_id):
    safe_metadata = sanitize_metadata(metadata or {})

    if projet_id:
        safe_metadata.setdefault("projet_id", projet_id)

    if gamme_id:
        safe_metadata.setdefault("gamme_id", gamme_id)

    return safe_metadata


def log_audit_event(
    *,
    request=None,
    user=None,
    action,
    entity_type="",
    entity_id=None,
    projet=None,
    projet_id=None,
    gamme=None,
    gamme_id=None,
    metadata=None,
):
    actor = user or getattr(request, "user", None)

    if not actor or not getattr(actor, "is_authenticated", False):
        actor = None

    try:
        projet, projet_id, gamme_id = _resolve_audit_context(
            projet=projet,
            projet_id=projet_id,
            gamme=gamme,
            gamme_id=gamme_id,
        )
        safe_metadata = _build_audit_metadata(
            metadata,
            projet_id=projet_id,
            gamme_id=gamme_id,
        )

        return AuditLog.objects.create(
            user=actor,
            user_email=getattr(actor, "email", "") or "",
            action=action,
            entity_type=entity_type or "",
            entity_id=str(entity_id or ""),
            projet=projet,
            projet_id=projet_id,
            gamme=gamme,
            gamme_id=gamme_id,
            metadata=safe_metadata,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
    except Exception:
        logger.exception("Audit log failed for action=%s", action)
        return None
