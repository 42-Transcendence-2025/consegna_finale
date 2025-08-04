from django.urls import path
from . import views

app_name = 'pong_game_ws'

urlpatterns = [
    path('game/<str:game_id>/state/', views.GameStateView.as_view(), name='game-state'),
]
