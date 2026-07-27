from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from validation_core.models import CustomUser, Affectation, Projet, Role
from validation_core.serializers.user_serializers import (
    UserCreateSerializer,
    CustomUserUpdateSerializer
)


@transaction.atomic
def create_user_service(data):
    affectations_data = data.pop("affectations", [])

    serializer = UserCreateSerializer(data=data)
    serializer.is_valid(raise_exception=True)

    user = serializer.save()

    user.is_active = False
    user.set_unusable_password()
    user.save()

    affectations = []

    for aff in affectations_data:
        role_id = aff.get("role")
        projet_id = aff.get("projet")

        if not role_id:
            raise DjangoValidationError(
                "Affectation invalide : rôle obligatoire"
            )

        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            raise DjangoValidationError("Rôle inexistant")

        projet = None

        if projet_id not in ("", None):
            try:
                projet = Projet.objects.get(id=projet_id)
            except Projet.DoesNotExist:
                raise DjangoValidationError("Projet inexistant")

        affectations.append(
            Affectation(
                user=user,
                role=role,
                projet=projet,
            )
        )

    if affectations:
        Affectation.objects.bulk_create(affectations)

    return user

# =========================
# LIST USERS (IMPORTANT)
# =========================
def list_users_service():
    return (
        CustomUser.objects
        .prefetch_related(
            "affectations__projet",
            "affectations__role"
        )
        .all()
    )


# =========================
# UPDATE USER
# =========================
@transaction.atomic
def update_user_service(user_id, data, affectations_data=None):
    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return None

    serializer = CustomUserUpdateSerializer(
        user, data=data, partial=True
    )
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    if affectations_data is not None:
        # Reset affectations
        Affectation.objects.filter(user=user).delete()

        new_affectations = []

        for aff in affectations_data:
            projet_id = aff.get("projet")
            role_id = aff.get("role")

            if not projet_id or not role_id:
                continue

            try:
                projet = Projet.objects.get(id=projet_id)
                role = Role.objects.get(id=role_id)
            except (Projet.DoesNotExist, Role.DoesNotExist):
                continue

            new_affectations.append(
                Affectation(
                    user=user,
                    projet=projet,
                    role=role,
                )
            )

        if new_affectations:
            Affectation.objects.bulk_create(new_affectations)

    return user


# =========================
# DELETE USER
# =========================
def delete_user_service(user_id):
    user = CustomUser.objects.filter(id=user_id).first()
    if not user:
        return False
    user.delete()
    return True