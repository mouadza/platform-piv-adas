from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from admin_config.models import Affectation

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError(
                "Identifiants incorrects."
            )

        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Identifiants incorrects."
            )

        user = authenticate(
            request=self.context.get("request"),
            username=user_obj.username,
            password=password
        )

        if user is None:
            raise serializers.ValidationError(
                "Identifiants incorrects."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "Identifiants incorrects."
            )

        is_admin = user.is_superuser or Affectation.objects.filter(
            user=user,
            role__access_level="ADMIN",
        ).exists()

        if not is_admin:
            raise serializers.ValidationError(
                "Connexion par mot de passe reservee aux admins."
            )

        self.user = user

        refresh = self.get_token(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

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
