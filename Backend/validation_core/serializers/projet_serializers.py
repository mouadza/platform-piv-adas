from rest_framework import serializers
from validation_core.models import Projet, Affectation, Architecture, Motorisation

class AffectationProjetSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source="user.username")
    role = serializers.CharField(source="role.label")

    class Meta:
        model = Affectation
        fields = ["user", "role"]

class ProjetSerializer(serializers.ModelSerializer):
    architectures = serializers.SerializerMethodField()
    motorisations = serializers.SerializerMethodField()

    architectures_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Architecture.objects.all(),
        source="architectures",
        write_only=True,
        required=False
    )

    motorisations_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Motorisation.objects.all(),
        source="motorisations",
        write_only=True,
        required=False
    )

    affectations = AffectationProjetSerializer(many=True, read_only=True)

    class Meta:
        model = Projet
        fields = [
            "id",
            "nom_projet",
            "nombre_vehicules",
            "architectures",
            "motorisations",
            "architectures_ids",
            "motorisations_ids",
            "affectations",
        ]

    def get_architectures(self, obj):
        return list(obj.architectures.values_list("nom", flat=True))

    def get_motorisations(self, obj):
        return list(obj.motorisations.values_list("nom", flat=True))