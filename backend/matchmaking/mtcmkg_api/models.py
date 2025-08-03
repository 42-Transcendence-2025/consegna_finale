from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class PongUser(AbstractUser):
    class Meta:
        managed = False  # Evita che Django gestisca questa tabella
        db_table = 'user_mgmt_api_ponguser'
    otp_secret = models.CharField(max_length=32, blank=True, null=True)
    trophies = models.IntegerField(default=0)
    last_activity = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_device = models.TextField(null=True, blank=True)
    last_otp_verification = models.DateTimeField(null=True, blank=True)
    profile_image = models.CharField(max_length=255, blank=True, null=True)

    friends = models.ManyToManyField('self', blank=True, symmetrical=True, related_name='friends_list')

    def __str__(self):
        return self.username
    
class Match(models.Model):
    class Meta:
        managed = False  # Evita che Django gestisca questa tabella
        db_table = 'user_mgmt_api_match'

    STATUS_CHOICES = [
        ('created', 'Created'),
        ('in_game', 'In Game'),
        ('finished', 'Finished'),
        ('finished_walkover', 'Finished Walkover'),
        ('aborted', 'Aborted')
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created') 

    player_1 = models.ForeignKey('PongUser', related_name='matches_as_player1', null=True, blank=True, on_delete=models.CASCADE)
    player_2 = models.ForeignKey('PongUser', related_name='matches_as_player2', null=True, blank=True, on_delete=models.CASCADE)


    points_player_1 = models.IntegerField(null=True, blank=True)
    points_player_2 = models.IntegerField(null=True, blank=True)

    winner = models.ForeignKey('PongUser', related_name='wins', on_delete=models.SET_NULL, null=True)
    loser = models.ForeignKey('PongUser', related_name='losses', on_delete=models.SET_NULL, null=True)

    tournament = models.ForeignKey('Tournament', related_name='matches', null=True, blank=True, on_delete=models.SET_NULL)
    match_number = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.player_1} vs {self.player_2}"

    def save(self, *args, **kwargs):
        # Autoimposta vincitore e perdente solo se i punteggi sono validi
        if self.points_player_1 is not None and self.points_player_2 is not None:
            if not self.winner or not self.loser:
                if self.points_player_1 > self.points_player_2:
                    self.winner = self.player_1
                    self.loser = self.player_2
                elif self.points_player_2 > self.points_player_1:
                    self.winner = self.player_2
                    self.loser = self.player_1
        super().save(*args, **kwargs)


class Tournament(models.Model):
    class Meta:
        managed = False  # Evita che Django gestisca questa tabella
        db_table = 'user_mgmt_api_tournament'

    class Status(models.TextChoices):
        CREATED  = "created",  "Created"
        FULL     = "full",     "Full"
        FINISHED = "finished", "Finished"
        ABORTED  = "aborted",  "Aborted"

    name = models.CharField(max_length=150, null=True, blank=True)  # Nome del torneo

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)

    players = models.ManyToManyField('PongUser', related_name='tournaments')
    created_at = models.DateTimeField(auto_now_add=True)

    winner = models.CharField(max_length=150, null=True, blank=True)  # Username del vincitore

    def __str__(self):
        return f"Tournament #{self.pk}"
    
    def can_add_match(self):
        """Verifica se il torneo può avere ancora partite (massimo 7)"""
        return self.matches.count() < 7
