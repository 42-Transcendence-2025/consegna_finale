from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from .utils import get_client_ip, get_user_agent
from django.utils.timezone import now

class PongUser(AbstractUser):
    otp_secret = models.CharField(max_length=32, blank=True, null=True)
    trophies = models.IntegerField(default=0)
    last_activity = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_device = models.TextField(null=True, blank=True)
    last_otp_verification = models.DateTimeField(null=True, blank=True)

    def is_otp_required(self, request):
        """Controlla se l'OTP è necessario"""
        new_ip = get_client_ip(request)
        new_device = get_user_agent(request)

        # Se è la prima volta che salva IP/dispositivo
        if not self.last_login_ip or not self.last_login_device:
            return True  # OTP richiesto

        # Se l'IP è cambiato
        if self.last_login_ip != new_ip:
            return True  # OTP richiesto

        # Se il dispositivo è cambiato
        if self.last_login_device != new_device:
            return True  # OTP richiesto

        # Se l'OTP non è stato verificato negli ultimi 30 giorni
        from datetime import timedelta
        if not self.last_otp_verification or (now() - self.last_otp_verification > timedelta(days=30)):
            return True  # OTP richiesto

        return False  # OTP non richiesto

    def __str__(self):
        return self.username


# Create your models here.
