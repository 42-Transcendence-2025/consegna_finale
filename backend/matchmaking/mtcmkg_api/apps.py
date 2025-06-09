from django.apps import AppConfig


class MtcmkgApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mtcmkg_api'

    def ready(self):
       # importa i receiver perché si registrino
       from . import signals  # noqa
