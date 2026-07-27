from django.shortcuts import get_object_or_404

def list_all(model):
    return model.objects.all()


def get_by_id(model, pk):
    """
    Récupère un objet par ID ou renvoie une 404 propre.
    """
    return get_object_or_404(model, pk=pk)


def create(model, data):
    return model.objects.create(**data)

def update(instance, data):
    for attr, value in data.items():
        setattr(instance, attr, value)
    instance.save()
    return instance

def delete(instance):
    """
    Supprime proprement une instance.
    """
    instance.delete()
