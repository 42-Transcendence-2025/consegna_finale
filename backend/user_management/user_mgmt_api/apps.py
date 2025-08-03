from django.apps import AppConfig


class UserMgmtApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user_mgmt_api'
    
    def ready(self):
        import user_mgmt_api.signals
