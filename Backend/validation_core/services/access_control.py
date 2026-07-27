from rest_framework import status
from rest_framework.response import Response

from validation_core.models import Affectation, Gamme, Projet


READ_LEVELS = ("ADMIN", "PPL", "VALIDEUR", "VISITEUR")
GAMME_MANAGE_LEVELS = ("ADMIN", "PPL")
VALIDATION_WRITE_LEVELS = ("ADMIN", "VALIDEUR")
COMMENT_WRITE_LEVELS = ("ADMIN", "PPL", "VALIDEUR")


def forbidden_response(detail="Acces refuse."):
    return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)


def normalize_level(value):
    return str(value or "").strip().upper()


def is_valid_numeric_id(value):
    try:
        int(value)
        return True
    except (TypeError, ValueError):
        return False


def is_super_admin(user):
    return bool(user and user.is_authenticated and user.is_superuser)


def has_any_role_level(user, allowed_levels):
    if is_super_admin(user):
        return True

    if not user or not user.is_authenticated:
        return False

    allowed = {normalize_level(level) for level in allowed_levels}

    return Affectation.objects.filter(user=user).filter(
        role__access_level__in=allowed
    ).exists()


def has_project_access(user, projet_id, allowed_levels=None):
    if is_super_admin(user):
        return True

    if (
        not user
        or not user.is_authenticated
        or not projet_id
        or not is_valid_numeric_id(projet_id)
    ):
        return False

    affectations = Affectation.objects.filter(
        user=user,
        projet_id=projet_id,
    )

    if allowed_levels is None:
        return affectations.exists()

    allowed = {normalize_level(level) for level in allowed_levels}

    return affectations.filter(role__access_level__in=allowed).exists()


def can_read_project(user, projet_id):
    return has_project_access(user, projet_id, READ_LEVELS)


def can_manage_project_gammes(user, projet_id):
    return has_project_access(user, projet_id, GAMME_MANAGE_LEVELS)


def can_validate_project(user, projet_id):
    return has_project_access(user, projet_id, VALIDATION_WRITE_LEVELS)


def can_comment_project(user, projet_id):
    return has_project_access(user, projet_id, COMMENT_WRITE_LEVELS)


def can_read_gamme(user, gamme):
    return bool(gamme and can_read_project(user, gamme.projet_id))


def can_manage_gamme(user, gamme):
    return bool(gamme and can_manage_project_gammes(user, gamme.projet_id))


def can_validate_gamme(user, gamme):
    return bool(gamme and can_validate_project(user, gamme.projet_id))


def can_comment_gamme(user, gamme):
    return bool(gamme and can_comment_project(user, gamme.projet_id))


def can_read_gamme_id(user, gamme_id):
    if not is_valid_numeric_id(gamme_id):
        return False

    project_id = Gamme.objects.filter(id=gamme_id).values_list(
        "projet_id",
        flat=True,
    ).first()
    return bool(project_id and can_read_project(user, project_id))


def can_validate_gamme_id(user, gamme_id):
    if not is_valid_numeric_id(gamme_id):
        return False

    project_id = Gamme.objects.filter(id=gamme_id).values_list(
        "projet_id",
        flat=True,
    ).first()
    return bool(project_id and can_validate_project(user, project_id))


def can_comment_gamme_id(user, gamme_id):
    if not is_valid_numeric_id(gamme_id):
        return False

    project_id = Gamme.objects.filter(id=gamme_id).values_list(
        "projet_id",
        flat=True,
    ).first()
    return bool(project_id and can_comment_project(user, project_id))


def filter_projects_for_user(queryset, user):
    if is_super_admin(user):
        return queryset

    return queryset.filter(affectations__user=user).distinct()


def filter_gammes_for_user(queryset, user):
    if is_super_admin(user):
        return queryset

    return queryset.filter(projet__affectations__user=user).distinct()


def filter_queryset_by_project_access(queryset, user, project_lookup="projet"):
    if is_super_admin(user):
        return queryset

    lookup = f"{project_lookup}__affectations__user"
    return queryset.filter(**{lookup: user}).distinct()


def project_exists(projet_id):
    if not is_valid_numeric_id(projet_id):
        return False

    return Projet.objects.filter(id=projet_id).exists()


def gamme_exists(gamme_id):
    if not is_valid_numeric_id(gamme_id):
        return False

    return Gamme.objects.filter(id=gamme_id).exists()
