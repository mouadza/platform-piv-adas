from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError

from admin_config.models.vehicule import Vehicule
from admin_config.serializers.projet_serializers import ProjetSerializer
from admin_config.permissions import IsAdminUserOnly
from admin_config.services.project_service import (
    create_project_service,
    list_projects_service,
    get_project_detail_service,
    update_project_service,
    delete_project_service
)
from admin_config.services.audit_service import log_audit_event
from admin_config.services.access_control import (
    can_read_project,
    filter_projects_for_user,
    forbidden_response,
    has_any_role_level,
    project_exists,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_vehicule(request):
    if not has_any_role_level(request.user, ["ADMIN", "PPL"]):
        return forbidden_response()

    cmq = request.query_params.get("cmq")
    vin = request.query_params.get("vin")

    exists = False

    if cmq:
        exists = Vehicule.objects.filter(cmq__iexact=cmq).exists()

    if vin:
        exists = Vehicule.objects.filter(vin__iexact=vin).exists()

    return Response({"exists": exists})

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUserOnly])
def createproject(request):
    try:
        projet = create_project_service(request.data)
        log_audit_event(
            request=request,
            action="PROJECT_CREATED",
            entity_type="project",
            entity_id=projet.id,
            projet=projet,
            metadata={
                "nom_projet": projet.nom_projet,
                "nombre_vehicules": projet.nombre_vehicules,
            },
        )
        return Response(
            ProjetSerializer(projet).data,
            status=status.HTTP_201_CREATED
        )

    except ValidationError as e:
        return Response(
            {"detail": str(e.message if hasattr(e, "message") else e)},
            status=status.HTTP_400_BAD_REQUEST
        )

# LIST PROJECTS

class ListProjet(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        projets = filter_projects_for_user(
            list_projects_service(),
            request.user,
        )
        serializer = ProjetSerializer(projets, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

# PROJECT DETAIL

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def projet_detail(request, projet_id):
    if not project_exists(projet_id):
        return Response(
            {"error": "Projet non trouve"},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_read_project(request.user, projet_id):
        return forbidden_response()

    data = get_project_detail_service(projet_id)
    return Response(data, status=status.HTTP_200_OK)

# UPDATE PROJECT

@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUserOnly])
def modifier_projet(request, projet_id):
    try:
        old_data = get_project_detail_service(projet_id) if project_exists(projet_id) else None
        projet = update_project_service(projet_id, request.data)

        if projet is None:
            return Response(
                {"error": "Projet non trouvé"},
                status=status.HTTP_404_NOT_FOUND
            )

        log_audit_event(
            request=request,
            action="PROJECT_UPDATED",
            entity_type="project",
            entity_id=projet.id,
            projet=projet,
            metadata={
                "old_nom_projet": old_data.get("nom_projet") if old_data else None,
                "new_nom_projet": projet.nom_projet,
                "nombre_vehicules": projet.nombre_vehicules,
            },
        )

        return Response(
            {"message": "Projet modifié avec succès"},
            status=status.HTTP_200_OK
        )

    except ValidationError as e:
        return Response(
            {"detail": str(e.message if hasattr(e, "message") else e)},
            status=status.HTTP_400_BAD_REQUEST
        )

# DELETE PROJECT

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUserOnly])
def delete_projet(request, Projet_id):
    old_data = get_project_detail_service(Projet_id) if project_exists(Projet_id) else None
    success = delete_project_service(Projet_id)

    if not success:
        return Response(
            {"error": "Projet non trouvé"},
            status=status.HTTP_404_NOT_FOUND
        )

    log_audit_event(
        request=request,
        action="PROJECT_DELETED",
        entity_type="project",
        entity_id=Projet_id,
        metadata=old_data or {},
    )

    return Response(
        {"message": "Projet supprimé avec succès"},
        status=status.HTTP_204_NO_CONTENT
    )
