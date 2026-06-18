from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from admin_config.models import Affectation, CustomUser
from admin_config.permissions import IsAdminUserOnly
from admin_config.serializers.user_serializers import CustomUserSerializer
from admin_config.services.email_service import send_account_authorized_email
from admin_config.services.audit_service import log_audit_event
from admin_config.services.user_service import (
    create_user_service,
    delete_user_service,
    list_users_service,
)


@api_view(["POST"])
@permission_classes([IsAdminUserOnly])
def create_user(request):
    try:
        email = request.data.get("email")

        if not email:
            return Response(
                {"detail": "Email obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = email.strip().lower()

        try:
            validate_email(email)
        except DjangoValidationError:
            return Response(
                {"detail": "Format email invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if CustomUser.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "Email deja utilise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()
        data["email"] = email

        username = data.get("username")

        if username:
            data["username"] = username.strip()

        user = create_user_service(data)
        log_audit_event(
            request=request,
            action="USER_CREATED",
            entity_type="user",
            entity_id=user.id,
            metadata={
                "email": user.email,
                "username": user.username,
                "affectations_count": len(data.get("affectations", [])),
            },
        )

        try:
            send_account_authorized_email(user)
        except Exception as exc:
            return Response(
                {
                    "message": (
                        "Utilisateur cree avec succes, mais l'email "
                        "d'autorisation n'a pas pu etre envoye."
                    ),
                    "email_sent": False,
                    "email_error": str(exc),
                    "user_id": user.id,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {
                "message": (
                    "Utilisateur cree avec succes. "
                    "Email d'autorisation envoye."
                ),
                "email_sent": True,
                "user_id": user.id,
            },
            status=status.HTTP_201_CREATED,
        )

    except DjangoValidationError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user

    return Response(
        {
            "username": getattr(user, "username", None),
            "email": getattr(user, "email", None),
            "is_superuser": getattr(user, "is_superuser", False),
        }
    )


@api_view(["GET"])
@permission_classes([IsAdminUserOnly])
def list_users(request):
    users = list_users_service()
    serializer = CustomUserSerializer(users, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PUT"])
@permission_classes([IsAdminUserOnly])
def modif_user(request, pk):
    user = get_object_or_404(CustomUser, pk=pk)
    old_email = user.email
    old_username = user.username
    data = request.data

    user.username = data.get("username", user.username)
    user.email = data.get("email", user.email)

    if data.get("password"):
        user.set_password(data["password"])

    user.save()

    affectations = data.get("affectations", [])
    Affectation.objects.filter(user=user).delete()

    for aff in affectations:
        Affectation.objects.create(
            user=user,
            projet_id=aff["projet"],
            role_id=aff["role"],
        )

    log_audit_event(
        request=request,
        action="USER_UPDATED",
        entity_type="user",
        entity_id=user.id,
        metadata={
            "old_email": old_email,
            "new_email": user.email,
            "old_username": old_username,
            "new_username": user.username,
            "affectations_count": len(affectations),
            "password_changed": bool(data.get("password")),
        },
    )

    return Response(
        {"message": "Utilisateur modifie avec succes"},
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([IsAdminUserOnly])
def delete_user(request, user_id):
    user = CustomUser.objects.filter(pk=user_id).first()
    success = delete_user_service(user_id)

    if not success:
        return Response(
            {"error": "Utilisateur non trouve"},
            status=status.HTTP_404_NOT_FOUND,
        )

    log_audit_event(
        request=request,
        action="USER_DELETED",
        entity_type="user",
        entity_id=user_id,
        metadata={
            "email": getattr(user, "email", ""),
            "username": getattr(user, "username", ""),
        },
    )

    return Response(
        {"message": "Utilisateur supprime avec succes"},
        status=status.HTTP_204_NO_CONTENT,
    )
