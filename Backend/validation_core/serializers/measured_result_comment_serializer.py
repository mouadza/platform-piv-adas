from rest_framework import serializers
from validation_core.models.measured_result_comment import StepMeasuredResultComment


class StepMeasuredResultCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = StepMeasuredResultComment
        fields = [
            "id",
            "gamme",
            "ev_code",
            "step_code",
            "commentaire",
            "user",
            "user_name",
            "can_edit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_name",
            "can_edit",
            "created_at",
            "updated_at",
        ]

    def get_user_name(self, obj):
        if not obj.user:
            return "—"

        return obj.user.username or obj.user.email

    def get_can_edit(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        return obj.user_id == request.user.id