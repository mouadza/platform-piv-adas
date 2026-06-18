from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.contrib.auth import get_user_model
from django.utils import timezone

from admin_config.models import Affectation, Gamme, Projet
from admin_config.models.results import StepValidation


def month_label(date):
    if not date:
        return ""

    mois = {
        1: "Jan",
        2: "Fév",
        3: "Mar",
        4: "Avr",
        5: "Mai",
        6: "Juin",
        7: "Juil",
        8: "Août",
        9: "Sep",
        10: "Oct",
        11: "Nov",
        12: "Déc",
    }

    return f"{mois.get(date.month, date.month)} {date.year}"


def get_user_display_name(user):
    if not user:
        return "—"

    if hasattr(user, "get_full_name") and user.get_full_name():
        return user.get_full_name()

    if hasattr(user, "username") and user.username:
        return user.username

    if hasattr(user, "email") and user.email:
        return user.email

    return str(user)


def admin_dashboard_service(user):
    User = get_user_model()

    projets_qs = Projet.objects.all()

    gammes_qs = Gamme.objects.select_related(
        "projet",
        "vehicule",
        "type_procedure",
        "fonction_gamme",
    ).all()

    validations_qs = StepValidation.objects.select_related(
        "gamme",
        "user",
    ).all()

    total_users = User.objects.count()
    total_projets = projets_qs.count()
    total_gammes = gammes_qs.count()

    gammes_started = (
        validations_qs.values("gamme_id")
        .distinct()
        .count()
    )

    taux_demarrage_validation = (
        round((gammes_started / total_gammes) * 100, 1)
        if total_gammes
        else 0
    )

    # Évolution mensuelle
    evolution_qs = (
        validations_qs.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(
            ok=Count("id", filter=Q(cotation="OK")),
            nok=Count("id", filter=Q(cotation="NOK")),
            nok_mineur=Count("id", filter=Q(cotation="NOK_mineur")),
            a_traiter=Count(
                "id",
                filter=Q(cotation="A_coter") | Q(cotation="Non_coté"),
            ),
            total=Count("id"),
        )
        .order_by("month")
    )

    evolution = [
        {
            "label": month_label(item["month"]),
            "ok": item["ok"],
            "nok": item["nok"],
            "nok_mineur": item["nok_mineur"],
            "a_traiter": item["a_traiter"],
            "total": item["total"],
        }
        for item in evolution_qs
    ]

    # Répartition des cotations par projet
    projects_cotation_qs = (
        Projet.objects.annotate(
            ok=Count(
                "gammes__step_validations",
                filter=Q(gammes__step_validations__cotation="OK"),
            ),
            nok=Count(
                "gammes__step_validations",
                filter=Q(gammes__step_validations__cotation="NOK"),
            ),
            nok_mineur=Count(
                "gammes__step_validations",
                filter=Q(gammes__step_validations__cotation="NOK_mineur"),
            ),
            a_traiter=Count(
                "gammes__step_validations",
                filter=(
                    Q(gammes__step_validations__cotation="A_coter")
                    | Q(gammes__step_validations__cotation="Non_coté")
                ),
            ),
            total_cotations=Count("gammes__step_validations"),
        )
        .filter(total_cotations__gt=0)
        .order_by("-total_cotations")
    )

    repartition_cotations_by_project = [
        {
            "project_id": projet.id,
            "project_name": getattr(projet, "nom_projet", None) or str(projet),
            "OK": projet.ok,
            "NOK": projet.nok,
            "NOK_mineur": projet.nok_mineur,
            "A_traiter": projet.a_traiter,
            "total": projet.total_cotations,
        }
        for projet in projects_cotation_qs
    ]

    recent_gammes_qs = gammes_qs.order_by("-created_at")[:6]

    recent_gammes = [
        {
            "id": gamme.id,
            "nom": (
                gamme.nom_gamme
                or gamme.fichier_gamme.name.split("/")[-1]
                if gamme.fichier_gamme
                else gamme.nom
            ),
            "projet": getattr(gamme.projet, "nom_projet", None) or str(gamme.projet),
            "status": gamme.status,
            "created_at": gamme.created_at,
            "vehicule": (
                getattr(gamme.vehicule, "cmq", None)
                or getattr(gamme.vehicule, "vin", None)
                or None
            )
            if gamme.vehicule
            else None,
        }
        for gamme in recent_gammes_qs
    ]

    recent_validations_qs = validations_qs.order_by("-created_at")[:8]

    recent_validations = [
        {
            "id": validation.id,
            "gamme_id": validation.gamme_id,
            "gamme": (
                validation.gamme.nom_gamme
                or validation.gamme.nom
                if validation.gamme
                else "—"
            ),
            "ev_code": validation.ev_code,
            "step_code": validation.step_code,
            "cotation": validation.cotation,
            "commentaire": validation.commentaire,
            "user": get_user_display_name(validation.user),
            "created_at": validation.created_at,
        }
        for validation in recent_validations_qs
    ]

    kpis = {
        "total_users": total_users,
        "total_projets": total_projets,
        "total_gammes": total_gammes,
        "gammes_started": gammes_started,
        "taux_demarrage_validation": taux_demarrage_validation,
    }

    return {
        "message": f"Bienvenue, {get_user_display_name(user)} !",
        "generated_at": timezone.now(),
        "kpis": kpis,
        "evolution": evolution,
        "repartition_cotations_by_project": repartition_cotations_by_project,
        "recent_gammes": recent_gammes,
        "recent_validations": recent_validations,
    }


def ppl_dashboard_service(user):
    affectations = Affectation.objects.filter(
        user=user,
        role__code="PPL"
    ).select_related("projet")

    projets = [a.projet for a in affectations]

    return {
        "username": user.username,
        "projets": projets
    }


def valideur_dashboard_service(user):
    affectations = Affectation.objects.filter(
        user=user,
        role__code="VALIDEUR"
    ).select_related("projet")

    projets = [a.projet for a in affectations]

    return {
        "username": user.username,
        "projets": projets
    }