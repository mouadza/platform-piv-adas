from django.db import migrations, models


def replace_null_text_values(apps, schema_editor):
    Gamme = apps.get_model("admin_config", "Gamme")
    StepValidation = apps.get_model("admin_config", "StepValidation")

    for field_name in (
        "nom_gamme",
        "pistes",
        "original_filename",
        "original_associe_filename",
    ):
        Gamme.objects.filter(
            **{f"{field_name}__isnull": True}
        ).update(**{field_name: ""})

    StepValidation.objects.filter(ev_code__isnull=True).update(ev_code="")
    StepValidation.objects.filter(commentaire__isnull=True).update(
        commentaire=""
    )


class Migration(migrations.Migration):
    # PostgreSQL cannot ALTER a table while trigger events from the preceding
    # data cleanup are pending in the same transaction.
    atomic = False

    dependencies = [
        ("admin_config", "0013_notification"),
    ]

    operations = [
        migrations.RunPython(
            replace_null_text_values,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="gamme",
            name="nom_gamme",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="gamme",
            name="pistes",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="gamme",
            name="original_filename",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=255,
            ),
        ),
        migrations.AlterField(
            model_name="gamme",
            name="original_associe_filename",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=255,
            ),
        ),
        migrations.AlterField(
            model_name="stepvalidation",
            name="ev_code",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=150,
            ),
        ),
        migrations.AlterField(
            model_name="stepvalidation",
            name="commentaire",
            field=models.TextField(blank=True),
        ),
    ]
