from django.apps import AppConfig
import threading


class MtcmkgApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mtcmkg_api'

    def ready(self):
        # importa i receiver perché si registrino
        from . import signals  # noqa 

        from .ranked_worker import matchmaking_loop
        # Evita di farlo partire più volte (es. con runserver --noreload)
        if not hasattr(self, 'worker_started'):
            self.worker_started = True
            t = threading.Thread(target=matchmaking_loop, daemon=True)
            t.start()