from django.apps import AppConfig


class ValidationCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'validation_core'
    # Keep the historical app label so existing migrations, database tables,
    # and AUTH_USER_MODEL references remain valid after the package rename.
    label = 'admin_config'
