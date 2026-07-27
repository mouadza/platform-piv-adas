from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admin_config", "0005_gamme_nom_gamme"),
    ]

    operations = [
        migrations.AddField(
            model_name="gamme",
            name="date_debut",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gamme",
            name="date_fin",
            field=models.DateField(blank=True, null=True),
        ),
    ]
