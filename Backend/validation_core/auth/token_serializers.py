from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from validation_core.models import Affectation


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        raise serializers.ValidationError("Connexion par OTP obligatoire.")

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["username"] = user.username
        token["email"] = user.email
        token["is_superuser"] = user.is_superuser

        roles = set()
        affectations_list = []
        access_level = None

        if user.is_superuser:
            token["roles"] = ["ADMIN"]
            token["access_level"] = "ADMIN"
            token["affectations"] = []
            return token

        affectations = Affectation.objects.filter(
            user=user
        ).select_related("projet", "role")

        for aff in affectations:
            role_access = (aff.role.access_level or "USER").upper()

            roles.add(role_access)

            affectations_list.append({
                "projet_id": aff.projet.id,
                "projet_nom": aff.projet.nom_projet,
                "role": role_access,
            })

            if access_level is None:
                access_level = role_access

        token["roles"] = list(roles)
        token["access_level"] = access_level or "USER"
        token["affectations"] = affectations_list

        return token
