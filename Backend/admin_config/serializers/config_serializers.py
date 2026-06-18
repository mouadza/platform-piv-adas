from rest_framework import serializers
from admin_config.models.config import (
    Role,
    Architecture,
    Motorisation,
    FonctionGamme,
    TypeProcedure,
)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "code", "label", "access_level", "is_system"]


class ArchitectureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Architecture
        fields = ["id", "nom"]


class MotorisationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motorisation
        fields = ["id", "nom"]


class FonctionGammeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FonctionGamme
        fields = ["id", "nom"]


class TypeProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeProcedure
        fields = ["id", "nom"]