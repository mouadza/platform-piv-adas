from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from admin_config.permissions import (
    IsAdminUserOnly,
    IsPPLUser,
    IsValideur
)

from admin_config.serializers.projet_serializers import ProjetSerializer
from admin_config.services.dashboard_service import (
    admin_dashboard_service,
    ppl_dashboard_service,
    valideur_dashboard_service
)


@extend_schema(
    tags=["KPI"],
    summary="Dashboard administrateur",
    description="Retourne les KPI globaux, graphiques decisionnels et activites recentes.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUserOnly])
def dash(request):
    data = admin_dashboard_service(request.user)
    return Response(data)


@extend_schema(
    tags=["KPI"],
    summary="Dashboard PPL",
    description="Retourne les projets assignes au PPL connecte.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsPPLUser])
def ppl_dashboard(request):
    result = ppl_dashboard_service(request.user)

    serializer = ProjetSerializer(
        result["projets"],
        many=True
    )

    return Response({
        "ppl_user": result["username"],
        "projets_assignes": serializer.data
    })


@extend_schema(
    tags=["KPI"],
    summary="Dashboard valideur",
    description="Retourne les projets assignes au valideur connecte.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsValideur])
def valideur_dashboard(request):
    result = valideur_dashboard_service(request.user)

    serializer = ProjetSerializer(
        result["projets"],
        many=True
    )

    return Response({
        "valideur_user": result["username"],
        "projets_assignes": serializer.data
    })
