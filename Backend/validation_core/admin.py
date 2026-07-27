from django.contrib import admin

from validation_core.models import AuditLog, EmailJob, Notification


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


@admin.register(EmailJob)
class EmailJobAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "email_type",
        "recipient_email",
        "status",
        "attempts",
        "sent_at",
    )
    list_filter = ("email_type", "status", "created_at", "sent_at")
    search_fields = ("recipient_email", "subject", "celery_task_id")
    readonly_fields = (
        "email_type",
        "recipient_email",
        "subject",
        "body_text",
        "body_html",
        "from_email",
        "status",
        "attempts",
        "max_attempts",
        "celery_task_id",
        "error_message",
        "metadata",
        "created_at",
        "updated_at",
        "sent_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "recipient",
        "type",
        "title",
        "projet",
        "is_read",
    )
    list_filter = ("type", "is_read", "created_at")
    search_fields = (
        "recipient__email",
        "recipient__username",
        "title",
        "message",
        "projet__nom_projet",
    )
    readonly_fields = (
        "recipient",
        "title",
        "message",
        "type",
        "projet",
        "target_url",
        "is_read",
        "read_at",
        "created_at",
    )
