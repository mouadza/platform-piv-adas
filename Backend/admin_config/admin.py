from django.contrib import admin

from admin_config.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "action",
        "user_email",
        "entity_type",
        "entity_id",
        "projet",
        "gamme",
        "ip_address",
    )
    list_filter = ("action", "entity_type", "created_at")
    search_fields = (
        "user_email",
        "action",
        "entity_type",
        "entity_id",
        "projet__nom_projet",
        "gamme__nom",
    )
    readonly_fields = (
        "created_at",
        "user",
        "user_email",
        "action",
        "entity_type",
        "entity_id",
        "projet",
        "gamme",
        "metadata",
        "ip_address",
        "user_agent",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
