from validation_core.models import Gamme


def list_gammes_by_projet_service(projet_id):
    return Gamme.objects.filter(projet_id=projet_id)
