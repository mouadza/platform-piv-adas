# admin_config/serializers.py
from rest_framework import serializers
from admin_config.models import CustomUser, Affectation


class AffectationSerializer(serializers.ModelSerializer):
    projet_nom = serializers.CharField(
        source="projet.nom_projet",
        read_only=True
    )
    role_access = serializers.CharField(
        source="role.access_level",
        read_only=True
    )
    role_label = serializers.CharField(
        source="role.label",
        read_only=True
    )

    class Meta:
        model = Affectation
        fields = [
            "id",
            "projet",       
            "projet_nom",   
            "role",         
            "role_label", 
            "role_access",
        ]

class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["username", "email"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)
    
class CustomUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["username", "email"]
        extra_kwargs = {
            "password": {"write_only": True, "required": False}
        }

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)

class CustomUserSerializer(serializers.ModelSerializer):
    affectations = AffectationSerializer(many=True, read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "username",
            "email",
            "affectations",
        ]