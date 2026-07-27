from django.db import models

class Role(models.Model):
    code = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=100)

    ACCESS_LEVELS = [
        ("ADMIN", "Admin"),
        ("PPL", "PPL"),
        ("VALIDEUR", "Valideur"),
        ("VISITEUR", "Visiteur"),
    ]

    access_level = models.CharField(
        max_length=20,
        choices=ACCESS_LEVELS,
        default="VISITEUR",
    )

    is_system = models.BooleanField(
        default=False,
        help_text="True = role système, ne doit pas être supprimé"
    )

    def __str__(self):
        return f"{self.label} ({self.access_level})"