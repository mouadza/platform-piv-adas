from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from admin_config.permissions import IsAdminUserOnly
from admin_config.services.config_service import get_by_id, delete
from admin_config.models.config import (
    Role,
    Architecture,
    Motorisation,
    FonctionGamme,
    TypeProcedure,
)
from admin_config.serializers.config_serializers import (
    RoleSerializer,
    ArchitectureSerializer,
    MotorisationSerializer,
    FonctionGammeSerializer,
    TypeProcedureSerializer,
)
# ROLES
# ======================================================
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def roles(request):
    if request.method == "GET":
        serializer = RoleSerializer(Role.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = RoleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def role_detail(request, pk):
    role = get_by_id(Role, pk)

    if role.is_system:
        return Response(
            {"detail": "Ce rôle système ne peut pas être modifié ou supprimé."},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "PUT":
        serializer = RoleSerializer(role, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    delete(role)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ======================================================
# ARCHITECTURES
# ======================================================
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def architectures(request):
    if request.method == "GET":
        serializer = ArchitectureSerializer(Architecture.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = ArchitectureSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def architecture_detail(request, pk):
    obj = get_by_id(Architecture, pk)

    if request.method == "PUT":
        serializer = ArchitectureSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    delete(obj)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ======================================================
# MOTORISATIONS
# ======================================================
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def motorisations(request):
    if request.method == "GET":
        serializer = MotorisationSerializer(Motorisation.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = MotorisationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def motorisation_detail(request, pk):
    obj = get_by_id(Motorisation, pk)

    if request.method == "PUT":
        serializer = MotorisationSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    delete(obj)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ======================================================
# FONCTIONS GAMME
# ======================================================
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fonctions_gamme(request):
    if request.method == "GET":
        serializer = FonctionGammeSerializer(FonctionGamme.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = FonctionGammeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def fonction_gamme_detail(request, pk):
    obj = get_by_id(FonctionGamme, pk)

    if request.method == "PUT":
        serializer = FonctionGammeSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    delete(obj)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ======================================================
# TYPES PROCEDURE
# ======================================================
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def types_procedure(request):
    if request.method == "GET":
        serializer = TypeProcedureSerializer(TypeProcedure.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = TypeProcedureSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def type_procedure_detail(request, pk):
    obj = get_by_id(TypeProcedure, pk)

    if request.method == "PUT":
        serializer = TypeProcedureSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    delete(obj)
    return Response(status=status.HTTP_204_NO_CONTENT)



