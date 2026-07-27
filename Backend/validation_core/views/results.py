from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from validation_core.models.gamme import Gamme
from validation_core.models.results import StepValidation
from validation_core.serializers.result_serilaizers import StepValidationSerializer
from validation_core.services.gamme_validation_dates import get_gamme_ev_results
from validation_core.services.access_control import can_read_gamme, forbidden_response

def compute_ev_result(cotations):
    if not cotations:
        return "IN_PROGRESS"

    # Si une cotation est vide ou encore à coter
    if any(c in [None, "", "A_coter"] for c in cotations):
        return "IN_PROGRESS"

    # NOK prioritaire
    if "NOK" in cotations:
        return "NOK"

    # NOK mineur après NOK
    if "NOK_mineur" in cotations:
        return "NOK_mineur"

    # OK + Non_coté = OK
    if "OK" in cotations and all(c in ["OK", "Non_coté"] for c in cotations):
        return "OK"
    
    if all(c in "Non_coté" for c in cotations):
        return "Non_coté"

    return "IN_PROGRESS"

def get_latest_step_validations(gamme_id):
    validations = StepValidation.objects.filter(
        gamme_id=gamme_id
    ).order_by("-created_at")

    latest = {}

    for validation in validations:
        key = (
            validation.ev_code or "",
            validation.step_code
        )

        if key not in latest:
            latest[key] = validation

    return list(latest.values())

def compute_gamme_result(ev_results):
    if not ev_results:
        return "IN_PROGRESS"

    values = list(ev_results.values())

    if "NOK" in values:
        return "NOK"

    if "NOK_mineur" in values:
        return "NOK_mineur"

    if all(v == "OK" for v in values):
        return "OK"

    return "IN_PROGRESS"

@extend_schema(
    tags=["Validations"],
    summary="Dernieres validations d'une gamme",
    description="Retourne la derniere cotation connue pour chaque EV/step d'une gamme.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def latest_gamme_step_validations(request, gamme_id):
    try:
        gamme = Gamme.objects.get(pk=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    latest_validations = get_latest_step_validations(gamme_id)
    serializer = StepValidationSerializer(latest_validations, many=True)
    return Response(serializer.data)

@extend_schema(
    tags=["KPI"],
    summary="Resultats EV d'une gamme",
    description="Calcule les resultats EV globaux d'une gamme a partir des cotations.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gamme_results(request, gamme_id):
    try:
        gamme = Gamme.objects.get(pk=gamme_id)
    except Gamme.DoesNotExist:
        return Response(
            {"error": "Gamme introuvable"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_read_gamme(request.user, gamme):
        return forbidden_response()

    ev_results = get_gamme_ev_results(gamme)

    return Response({
        "gamme_id": gamme_id,
        "ev_results": ev_results,
    })
