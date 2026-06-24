import os

from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "validationplateform.settings")

app = Celery("validationplateform")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
