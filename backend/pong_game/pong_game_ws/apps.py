from django.apps import AppConfig


class PongGameWsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pong_game_ws'

    def ready(self):
      # importa i receiver perché si registrino
      from . import signals  # noqa
