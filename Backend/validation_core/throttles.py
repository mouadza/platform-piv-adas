from rest_framework.throttling import SimpleRateThrottle


class EmailScopedThrottle(SimpleRateThrottle):
    field_name = "email"

    def get_cache_key(self, request, view):
        value = (
            request.data.get(self.field_name)
            or request.query_params.get(self.field_name)
            or "missing"
        )
        value = str(value).strip().lower()
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": f"{ident}:{value}",
        }


class OTPRequestThrottle(EmailScopedThrottle):
    scope = "otp_request"


class OTPVerifyThrottle(EmailScopedThrottle):
    scope = "otp_verify"


class AdminLoginThrottle(EmailScopedThrottle):
    scope = "admin_login"
