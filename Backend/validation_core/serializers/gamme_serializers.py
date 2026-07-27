from rest_framework import serializers
from validation_core.models import (
    BlocResultat,
    LigneBloc,
)

from rest_framework import serializers
from validation_core.models import Gamme
from rest_framework import serializers
from validation_core.models.gamme import GlobalEVComment



class GammeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gamme
        fields = [
            "id",
            "nom",
            "nom_gamme",
            "projet",
            "vehicule",
            "type_procedure",
            "fonction_gamme",
            "boitiers",
            "pistes",
            "nombre_jours",
            "date_debut",
            "date_fin",
            "fichier_gamme",
            "fichier_associe",
            "original_filename",
            "original_associe_filename",
        ]

        read_only_fields = [
            "original_filename",
            "original_associe_filename",
        ]

        extra_kwargs = {
            "nom": {"required": False, "allow_blank": True, "default": ""},
            "vehicule": {"required": False, "allow_null": True},
            "type_procedure": {"required": False, "allow_null": True},
            "fonction_gamme": {"required": False, "allow_null": True},
            "boitiers": {"required": False, "allow_blank": True, "default": ""},
            "pistes": {"required": False, "allow_null": True, "allow_blank": True},
            "nombre_jours": {"required": False, "allow_null": True},
            "date_debut": {"required": False, "allow_null": True},
            "date_fin": {"required": False, "allow_null": True},
            "fichier_associe": {"required": False, "allow_null": True},
            "projet": {"required": True},
        }


class GammeListSerializer(serializers.ModelSerializer):
    type_procedure = serializers.CharField(source="type_procedure.nom", allow_null=True)
    fonction = serializers.CharField(source="fonction_gamme.nom", allow_null=True)
    projet = serializers.CharField(source="projet.nom_projet", allow_null=True)

    vehicule = serializers.SerializerMethodField()

    class Meta:
        model = Gamme
        fields = [
            "id",
            "nom",
            "nom_gamme",
            "projet",
            "type_procedure",
            "fonction",
            "boitiers",
            "nombre_jours",
            "date_debut",
            "date_fin",
            "fichier_gamme",
            "fichier_associe",
            "pistes",
            "vehicule",
            "created_at",
            "status", 
            "ordre",
            "original_filename",
            "original_associe_filename",
        ]

    def get_vehicule(self, obj):
        if obj.vehicule:
            return {
                "id": obj.vehicule.id,
                "cmq": obj.vehicule.cmq,
                "vin": obj.vehicule.vin,
            }
        return None
    

class GammeValideurSerializer(serializers.ModelSerializer):
    nom_original = serializers.SerializerMethodField()
    projet_nom = serializers.CharField(source="projet.nom_projet", read_only=True)
    date_import = serializers.DateTimeField(source="created_at", read_only=True)
    est_validee = serializers.SerializerMethodField()

    type_procedure_nom = serializers.SerializerMethodField()
    fonction_gamme_nom = serializers.SerializerMethodField()
    vehicule_nom = serializers.SerializerMethodField()
    vehicule_detail = serializers.SerializerMethodField()

    fichier_gamme_nom = serializers.SerializerMethodField()
    fichier_associe_nom = serializers.SerializerMethodField()

    class Meta:
        model = Gamme
        fields = [
            "id",
            "nom",
            "nom_gamme",
            "nom_original",
            "projet_nom",
            "date_import",
            "created_at",
            "status",
            "est_validee",

            "type_procedure",
            "type_procedure_nom",
            "fonction_gamme",
            "fonction_gamme_nom",

            "vehicule",
            "vehicule_nom",
            "vehicule_detail",

            "boitiers",
            "pistes",
            "nombre_jours",
            "date_debut",
            "date_fin",

            "fichier_gamme",
            "fichier_gamme_nom",
            "fichier_associe",
            "fichier_associe_nom",
            "original_filename",
            "original_associe_filename",
        ]

    def get_nom_original(self, obj):
        if obj.fichier_gamme:
            return obj.fichier_gamme.name.split("/")[-1]
        return obj.nom

    def get_est_validee(self, obj):
        return obj.status == "CONFIG"

    def get_type_procedure_nom(self, obj):
        if obj.type_procedure:
            return getattr(obj.type_procedure, "nom", str(obj.type_procedure))
        return None

    def get_fonction_gamme_nom(self, obj):
        if obj.fonction_gamme:
            return getattr(obj.fonction_gamme, "nom", str(obj.fonction_gamme))
        return None

    def get_vehicule_nom(self, obj):
        if not obj.vehicule:
            return None

        cmq = getattr(obj.vehicule, "cmq", None)
        vin = getattr(obj.vehicule, "vin", None)

        if cmq and vin:
            return f"{cmq} / {vin}"

        return cmq or vin or str(obj.vehicule)

    def get_vehicule_detail(self, obj):
        if not obj.vehicule:
            return None

        return {
            "id": obj.vehicule.id,
            "cmq": getattr(obj.vehicule, "cmq", None),
            "vin": getattr(obj.vehicule, "vin", None),
        }

    def get_fichier_gamme_nom(self, obj):
        if obj.fichier_gamme:
            return obj.fichier_gamme.name.split("/")[-1]
        return None

    def get_fichier_associe_nom(self, obj):
        if obj.original_associe_filename:
            return obj.original_associe_filename

        if obj.fichier_associe:
            return obj.fichier_associe.name.split("/")[-1]

        return None


class GammeDatesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gamme
        fields = ["date_debut", "date_fin"]
        extra_kwargs = {
            "date_debut": {"required": False, "allow_null": True},
            "date_fin": {"required": False, "allow_null": True},
        }

    def validate(self, attrs):
        date_debut = attrs.get("date_debut", self.instance.date_debut if self.instance else None)
        date_fin = attrs.get("date_fin", self.instance.date_fin if self.instance else None)

        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({
                "date_fin": "La date de fin doit etre superieure ou egale a la date de debut."
            })

        return attrs



class GlobalEVCommentSerializer(serializers.ModelSerializer):
    auteur = serializers.SerializerMethodField()
    texte = serializers.CharField(source="commentaire")
    date = serializers.DateTimeField(source="created_at")
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = GlobalEVComment
        fields = [
            "id",
            "ev_code",
            "texte",
            "auteur",
            "date",
            "can_edit",
        ]

    def get_auteur(self, obj):
        if not obj.user:
            return "—"

        return obj.user.username or obj.user.email

    def get_can_edit(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        return obj.user_id == request.user.id
