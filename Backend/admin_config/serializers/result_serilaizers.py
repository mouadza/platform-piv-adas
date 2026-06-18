from rest_framework import serializers

from rest_framework import serializers
from admin_config.models.results import StepValidation, BlocResultat, LigneBloc

class StepValidationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = StepValidation
        fields = [
            "id",
            "gamme",
            "ev_code",
            "step_code",
            "user",
            "user_name",
            "cotation",
            "commentaire",
            "created_at",
        ]
        read_only_fields = ["user", "user_name", "created_at"]

    def get_user_name(self, obj):
        user = obj.user

        if hasattr(user, "get_full_name") and user.get_full_name():
            return user.get_full_name()

        if hasattr(user, "username") and user.username:
            return user.username

        if hasattr(user, "email") and user.email:
            return user.email

        return str(user)

    def validate(self, attrs):
        cotation = attrs.get("cotation")
        commentaire = attrs.get("commentaire")

        if cotation != "OK" and not commentaire:
            raise serializers.ValidationError({
                "commentaire": "Le commentaire est obligatoire pour cette cotation."
            })

        return attrs

class LigneBlocSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneBloc
        fields = [
            "id",
            "numero_ligne",
            "resultat",
            "commentaires",
            "date_sauvegarde",
        ]


class BlocResultatSerializer(serializers.ModelSerializer):
    lignes = LigneBlocSerializer(many=True, read_only=True)

    class Meta:
        model = BlocResultat
        fields = [
            "id",
            "titre_bloc",
            "resultat",
            "commentaires",
            "date_sauvegarde",
            "lignes",
        ]