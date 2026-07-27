from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admin_config", "0011_gammeparseddata"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailJob",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "email_type",
                    models.CharField(
                        choices=[
                            ("LOGIN_OTP", "Login OTP"),
                            ("ACCOUNT_AUTHORIZED", "Account authorized"),
                            ("NOTIFICATION", "Notification"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("recipient_email", models.EmailField(db_index=True, max_length=254)),
                ("subject", models.CharField(max_length=255)),
                ("body_text", models.TextField()),
                ("body_html", models.TextField(blank=True)),
                ("from_email", models.EmailField(blank=True, max_length=254)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("SENDING", "Sending"),
                            ("SENT", "Sent"),
                            ("RETRY", "Retry"),
                            ("FAILED", "Failed"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=16,
                    ),
                ),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("max_attempts", models.PositiveSmallIntegerField(default=3)),
                ("celery_task_id", models.CharField(blank=True, max_length=255)),
                ("error_message", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="emailjob",
            index=models.Index(
                fields=["status", "-created_at"],
                name="admin_confi_status_cfe433_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="emailjob",
            index=models.Index(
                fields=["email_type", "status"],
                name="admin_confi_email_t_75c8a8_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="emailjob",
            index=models.Index(
                fields=["recipient_email", "-created_at"],
                name="admin_confi_recipie_e776b3_idx",
            ),
        ),
    ]
