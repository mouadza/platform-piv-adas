from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from admin_config.auth.token_serializers import CustomTokenObtainPairSerializer
from admin_config.services.audit_service import log_audit_event
from admin_config.services.otp_service import (
    OTPDeliveryError,
    OTPRateLimitError,
    OTPValidationError,
    request_email_otp,
    verify_email_otp,
)
from admin_config.throttles import (
    AdminLoginThrottle,
    OTPRequestThrottle,
    OTPVerifyThrottle,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AdminLoginThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            email = str(request.data.get("email") or "").strip().lower()
            user = get_user_model().objects.filter(email__iexact=email).first()

            log_audit_event(
                request=request,
                user=user,
                action="ADMIN_LOGIN_SUCCESS",
                entity_type="user",
                entity_id=getattr(user, "id", None),
                metadata={"email": email},
            )

        return response


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
