from rest_framework import serializers
from validation_core.models import Vehicule


class VehiculeSerializer(serializers.ModelSerializer):
    motorisation_nom = serializers.CharField(
        source="motorisation.nom",
        read_only=True
    )

    class Meta:
        model = Vehicule
        fields = [
            "id",
            "cmq",
            "vin",
            "motorisation",
            "motorisation_nom",
        ]