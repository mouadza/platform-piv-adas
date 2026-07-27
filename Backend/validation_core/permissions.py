# permissions.py
from rest_framework.permissions import BasePermission
from validation_core.models import Affectation


class IsAdminUserOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
    


class IsPPLUser(BasePermission):
    def has_permission(self, request, view):
        return Affectation.objects.filter(
            user=request.user,
            role__code="PPL" 
        ).exists()
    


class IsValideur(BasePermission):
    def has_permission(self, request, view):
        return Affectation.objects.filter(
            user=request.user,
            role__code="VALIDEUR"
        ).exists()



class IsAdminOrPPL(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Vérifie si superuser
        if user.is_superuser:
            return True
        
        # Vérifie si PPL via Affectation
        return Affectation.objects.filter(user=user, role__code="PPL").exists()
