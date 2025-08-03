"""
Database models for the profile service.

These models map onto existing tables created and managed by other
microservices (user_management, matchmaking). By setting
``managed = False``, Django does not attempt to create migrations or
alter these tables. They are defined here solely so that the ORM can
query them.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser


class PongUser(AbstractUser):
    class Meta:
        managed = False  # Do not let Django manage this table
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


class Tournament(models.Model):
    class Meta:
        managed = False
        db_table = 'user_mgmt_api_tournament'

    class Status(models.TextChoices):
        CREATED = "created", "Created"
        FULL = "full", "Full"
        FINISHED = "finished", "Finished"
        ABORTED = "aborted", "Aborted"

    name = models.CharField(max_length=150, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    players = models.ManyToManyField('PongUser', related_name='tournaments')
    created_at = models.DateTimeField(auto_now_add=True)
    winner = models.CharField(max_length=150, null=True, blank=True)

    def __str__(self):
        return f"Tournament #{self.pk}"


class Match(models.Model):
    class Meta:
        managed = False
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
