from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from validation_core.auth.token_serializers import CustomTokenObtainPairSerializer
from validation_core.services.audit_service import log_audit_event
from validation_core.services.otp_service import (
    OTPDeliveryError,
    OTPRateLimitError,
    OTPValidationError,
    request_email_otp,
    verify_email_otp,
)
from validation_core.throttles import (
    AdminLoginThrottle,
    OTPRequestThrottle,
    OTPVerifyThrottle,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AdminLoginThrottle]

    @extend_schema(
        tags=["Auth"],
        summary="Connexion par mot de passe desactivee",
        description="La connexion se fait uniquement par OTP email.",
    )
    def post(self, request, *args, **kwargs):
        return Response(
            {"detail": "Connexion par OTP obligatoire."},
            status=status.HTTP_410_GONE,
        )


@extend_schema(
    tags=["Auth"],
    summary="Demander un code OTP",
    description="Envoie un code OTP par email pour les utilisateurs autorises.",
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPRequestThrottle])
def request_otp(request):
    try:
        result = request_email_otp(request.data.get("email"))
    except OTPValidationError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except OTPRateLimitError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    except OTPDeliveryError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(result, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Auth"],
    summary="Verifier un code OTP",
    description="Verifie le code OTP et retourne les tokens JWT utilisateur.",
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPVerifyThrottle])
def verify_otp(request):
    try:
        email = str(request.data.get("email") or "").strip().lower()
        tokens = verify_email_otp(
            email,
            request.data.get("code"),
        )
    except OTPValidationError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = get_user_model().objects.filter(email__iexact=email).first()
    log_audit_event(
        request=request,
        user=user,
        action="OTP_LOGIN_SUCCESS",
        entity_type="user",
        entity_id=getattr(user, "id", None),
        metadata={"email": email},
    )

    return Response(tokens, status=status.HTTP_200_OK)
