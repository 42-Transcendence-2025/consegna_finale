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
        print(f"Last IP: {self.last_login_ip}")
        print(f"Last Device: {self.last_login_device}")
        print(f"New IP: {new_ip}")
        print(f"New Device: {new_device}")

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
    
class Match(models.Model):

    STATUS_CHOICES = [
        ('created', 'Created'),
        ('in_game', 'In Game'),
        ('finished', 'Finished'),
        ('finished_walkover', 'Finished Walkover'),
        ('aborted', 'Aborted')
    ]

    player_1 = models.ForeignKey('PongUser', related_name='matches_as_player1', on_delete=models.CASCADE)
    player_2 = models.ForeignKey('PongUser', related_name='matches_as_player2', on_delete=models.CASCADE)

    points_player_1 = models.IntegerField()
    points_player_2 = models.IntegerField()

    winner = models.ForeignKey('PongUser', related_name='wins', on_delete=models.SET_NULL, null=True)
    loser = models.ForeignKey('PongUser', related_name='losses', on_delete=models.SET_NULL, null=True)

    tournament = models.ForeignKey('Tournament', related_name='matches', null=True, blank=True, on_delete=models.SET_NULL)
    match_number = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.player_1} vs {self.player_2}"

    def save(self, *args, **kwargs):
        # Autoimposta vincitore e perdente se non già specificati
        if not self.winner or not self.loser:
            if self.points_player_1 > self.points_player_2:
                self.winner = self.player_1
                self.loser = self.player_2
            elif self.points_player_2 > self.points_player_1:
                self.winner = self.player_2
                self.loser = self.player_1
        super().save(*args, **kwargs)


class Tournament(models.Model):
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('finished', 'Finished'),
        ('aborted', 'Aborted')
    ]

    players = models.ManyToManyField('PongUser', related_name='tournaments')
    created_at = models.DateTimeField(auto_now_add=True)

    winner = models.CharField(max_length=150, null=True, blank=True)  # Username del vincitore

    def __str__(self):
        return f"Tournament #{self.pk}"



# Create your models here.
