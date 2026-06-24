from django.db.models import Count, Max, Q, Subquery
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

    validation_history_qs = StepValidation.objects.select_related(
        "gamme",
        "user",
    ).all()
    latest_validation_ids = (
        StepValidation.objects.values("gamme_id", "ev_code", "step_code")
        .annotate(latest_id=Max("id"))
        .values("latest_id")
    )
    validations_qs = StepValidation.objects.filter(
        id__in=Subquery(latest_validation_ids)
    ).select_related(
        "gamme",
        "gamme__projet",
        "user",
    )

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
        validation_history_qs.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(
            ok=Count("id", filter=Q(cotation="OK")),
            nok=Count("id", filter=Q(cotation="NOK")),
            nok_mineur=Count("id", filter=Q(cotation="NOK_mineur")),
            a_traiter=Count(
                "id",
                filter=Q(cotation="A_coter") | Q(cotation__startswith="Non_cot"),
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
                    | Q(gammes__step_validations__cotation__startswith="Non_cot")
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

    global_cotations = validations_qs.aggregate(
        OK=Count("id", filter=Q(cotation="OK")),
        NOK=Count("id", filter=Q(cotation="NOK")),
        NOK_mineur=Count("id", filter=Q(cotation="NOK_mineur")),
        A_traiter=Count(
            "id",
            filter=Q(cotation="A_coter") | Q(cotation__startswith="Non_cot"),
        ),
        total=Count("id"),
    )
    ok_rate = (
        round((global_cotations["OK"] / global_cotations["total"]) * 100, 1)
        if global_cotations["total"]
        else 0
    )
    nok_rate = (
        round(
            (
                (global_cotations["NOK"] + global_cotations["NOK_mineur"])
                / global_cotations["total"]
            )
            * 100,
            1,
        )
        if global_cotations["total"]
        else 0
    )

    project_progress = []

    for projet in projets_qs.order_by("nom_projet"):
        project_validations = validations_qs.filter(gamme__projet_id=projet.id)
        total_project_gammes = gammes_qs.filter(projet_id=projet.id).count()
        started_gammes = project_validations.values("gamme_id").distinct().count()
        not_started_gammes = max(total_project_gammes - started_gammes, 0)
        cotations = project_validations.aggregate(
            OK=Count("id", filter=Q(cotation="OK")),
            NOK=Count("id", filter=Q(cotation="NOK")),
            NOK_mineur=Count("id", filter=Q(cotation="NOK_mineur")),
            A_traiter=Count(
                "id",
                filter=Q(cotation="A_coter") | Q(cotation__startswith="Non_cot"),
            ),
            total=Count("id"),
        )
        advancement_percent = (
            round((started_gammes / total_project_gammes) * 100, 1)
            if total_project_gammes
            else 0
        )
        risk_score = (
            cotations["NOK"] * 3
            + cotations["NOK_mineur"] * 2
            + cotations["A_traiter"]
            + not_started_gammes * 2
        )

        project_progress.append(
            {
                "project_id": projet.id,
                "project_name": getattr(projet, "nom_projet", None) or str(projet),
                "total_gammes": total_project_gammes,
                "gammes_started": started_gammes,
                "gammes_not_started": not_started_gammes,
                "advancement_percent": advancement_percent,
                "risk_score": risk_score,
                **cotations,
            }
        )

    risk_projects = sorted(
        [item for item in project_progress if item["risk_score"] > 0],
        key=lambda item: item["risk_score"],
        reverse=True,
    )[:5]
    repartition_cotations_by_project = [
        {
            "project_id": item["project_id"],
            "project_name": item["project_name"],
            "OK": item["OK"],
            "NOK": item["NOK"],
            "NOK_mineur": item["NOK_mineur"],
            "A_traiter": item["A_traiter"],
            "total": item["total"],
        }
        for item in sorted(
            project_progress,
            key=lambda project: project["total"],
            reverse=True,
        )
        if item["total"] > 0
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

    recent_validations_qs = validation_history_qs.order_by("-created_at")[:8]

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
        "global_ok_rate": ok_rate,
        "global_nok_rate": nok_rate,
        "projects_at_risk": len(risk_projects),
        "total_current_cotations": global_cotations["total"],
    }

    return {
        "message": f"Bienvenue, {get_user_display_name(user)} !",
        "generated_at": timezone.now(),
        "kpis": kpis,
        "evolution": evolution,
        "global_cotations": global_cotations,
        "project_progress": project_progress,
        "risk_projects": risk_projects,
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
