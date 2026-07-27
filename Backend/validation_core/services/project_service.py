from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError
from validation_core.serializers.projet_serializers import ProjetSerializer
from django.db import transaction
from validation_core.models import Projet, Affectation, Role, CustomUser
from django.db import transaction
from validation_core.models import Projet, Affectation, Role, CustomUser, Vehicule
from validation_core.services.notification_service import notify_project_affectation


def validate_vehicules_uniqueness(vehicules_data, projet_id=None):
    seen_cmq = set()
    seen_vin = set()

    existing_vehicules = Vehicule.objects.all()

    # En modification, on ignore les véhicules du projet actuel
    if projet_id:
        existing_vehicules = existing_vehicules.exclude(projet_id=projet_id)

    for veh in vehicules_data:
        cmq = str(veh.get("cmq", "")).strip()
        vin = str(veh.get("vin", "")).strip()

        if not cmq:
            raise ValidationError("Le champ CMQ est obligatoire.")

        if not vin:
            raise ValidationError("Le champ VIN est obligatoire.")

        cmq_key = cmq.lower()
        vin_key = vin.lower()

        # Doublon dans le payload frontend
        if cmq_key in seen_cmq:
            raise ValidationError(f"Le CMQ '{cmq}' est déjà utilisé dans cette liste.")

        if vin_key in seen_vin:
            raise ValidationError(f"Le VIN '{vin}' est déjà utilisé dans cette liste.")

        seen_cmq.add(cmq_key)
        seen_vin.add(vin_key)

        # Doublon déjà existant en base
        if existing_vehicules.filter(cmq__iexact=cmq).exists():
            raise ValidationError(f"Le CMQ '{cmq}' existe déjà.")

        if existing_vehicules.filter(vin__iexact=vin).exists():
            raise ValidationError(f"Le VIN '{vin}' existe déjà.")

@transaction.atomic
def create_project_service(data, *, actor=None):
    affectations_data = data.pop("affectations", [])
    architectures_ids = data.pop("architectures_ids", [])
    motorisations_ids = data.pop("motorisations_ids", [])
    vehicules_data = data.pop("vehicules", [])
    validate_vehicules_uniqueness(vehicules_data)

    projet = Projet.objects.create(
        nom_projet=data["nom_projet"],
        nombre_vehicules=len(vehicules_data),
    )

    if architectures_ids:
        projet.architectures.set(architectures_ids)

    if motorisations_ids:
        projet.motorisations.set(motorisations_ids)

    for veh in vehicules_data:
        Vehicule.objects.create(
            projet=projet,
            cmq=veh["cmq"],
            vin=veh["vin"],
            motorisation_id=veh["motorisation"],
        )

    created_affectations = []

    for aff in affectations_data:
        user = CustomUser.objects.get(id=aff["user"])
        role = Role.objects.get(code=aff["role"])

        affectation = Affectation.objects.create(
            user=user,
            role=role,
            projet=projet
        )
        created_affectations.append(affectation)

    transaction.on_commit(
        lambda: [
            notify_project_affectation(affectation, actor=actor)
            for affectation in created_affectations
        ]
    )

    return projet

def list_projects_service():
    return (
        Projet.objects
        .prefetch_related(
            "architectures",
            "motorisations",
            "affectations__user",
            "affectations__role",
        )
    )

def get_project_detail_service(projet_id):
    projet = get_object_or_404(
        Projet.objects.prefetch_related(
            "architectures",
            "motorisations",
            "vehicules__motorisation",
            "affectations__user",
            "affectations__role",
        ),
        id=projet_id
    )

    vehicules = projet.vehicules.all()

    return {
        "id": projet.id,
        "nom_projet": projet.nom_projet,

        
        "nombre_vehicules": projet.vehicules.count(),
        "architectures": [a.nom for a in projet.architectures.all()],
        "motorisations": [m.nom for m in projet.motorisations.all()],

        "vehicules": [
            {
                "id": v.id,
                "cmq": v.cmq,
                "vin": v.vin,
                "motorisation": v.motorisation.id,
                "motorisation_nom": v.motorisation.nom,
            }
            for v in vehicules
        ],

        "affectations": [
            {
                "user": aff.user.username,
                "role": aff.role.code,
            }
            for aff in projet.affectations.all()
        ],
    }

@transaction.atomic
def update_project_service(projet_id, data, *, actor=None):
    projet = Projet.objects.filter(pk=projet_id).first()
    if not projet:
        return None

    old_affectation_keys = set(
        Affectation.objects.filter(projet=projet).values_list("user_id", "role_id")
    )

    affectations_data = data.pop("affectations", [])
    vehicules_data = data.pop("vehicules", [])

    validate_vehicules_uniqueness(vehicules_data, projet_id=projet.id)

    serializer = ProjetSerializer(projet, data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    projet.nombre_vehicules = len(vehicules_data)
    projet.save()

    # ── Véhicules : update/create/delete sans casser les FK des gammes ──
    existing_vehicules = {v.cmq: v for v in Vehicule.objects.filter(projet=projet)}
    incoming_cmqs = {v["cmq"] for v in vehicules_data}

    # Supprimer seulement ceux qui ne sont plus dans la liste
    for cmq, vehicule in existing_vehicules.items():
        if cmq not in incoming_cmqs:
            vehicule.delete()

    for veh in vehicules_data:
        if veh["cmq"] in existing_vehicules:
            # Mettre à jour l'existant — garde le même ID → FK gammes intactes
            v = existing_vehicules[veh["cmq"]]
            v.vin = veh["vin"]
            v.motorisation_id = veh["motorisation"]
            v.save()
        else:
            # Nouveau véhicule
            Vehicule.objects.create(
                projet=projet,
                cmq=veh["cmq"],
                vin=veh["vin"],
                motorisation_id=veh["motorisation"],
            )

    # ── Affectations : pas de FK critique, ok de supprimer/recréer ──
    Affectation.objects.filter(projet=projet).delete()
    created_affectations = []

    for aff in affectations_data:
        user = CustomUser.objects.get(id=aff["user"])
        role = Role.objects.get(code=aff["role"])
        affectation = Affectation.objects.create(user=user, role=role, projet=projet)
        created_affectations.append(affectation)

    added_affectations = [
        affectation
        for affectation in created_affectations
        if (affectation.user_id, affectation.role_id) not in old_affectation_keys
    ]

    transaction.on_commit(
        lambda: [
            notify_project_affectation(affectation, actor=actor)
            for affectation in added_affectations
        ]
    )

    return projet

def delete_project_service(projet_id):
    projet = Projet.objects.filter(pk=projet_id).first()
    if not projet:
        return False

    projet.delete()
    return True

def _create_affectations(projet, ppls, valideurs, consultants):
    role_map = {
        "PPL": Role.objects.get(label="PPL"),
        "Valideur": Role.objects.get(label="Valideur"),
        "Visiteur": Role.objects.get(label="Visiteur"),
    }

    def assign_users(user_ids, role_label):
        role = role_map[role_label]

        for user_id in user_ids:
            user = CustomUser.objects.get(id=user_id)

            affectation = Affectation.objects.filter(
                user=user,
                role=role,
                projet__isnull=True
            ).first()

            if affectation:
                
                affectation.projet = projet
                affectation.save()
            else:
                
                Affectation.objects.create(
                    user=user,
                    role=role,
                    projet=projet
                )

    assign_users(ppls, "PPL")
    assign_users(valideurs, "Valideur")
    assign_users(consultants, "Visiteur")
