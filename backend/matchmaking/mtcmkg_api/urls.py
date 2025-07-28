from django.urls import path
from .views import PongPrivatePasswordMatchView, PongRankedMatchView, TournamentListCreateView, TournamentView, PongRankedMatchView

app_name = 'mtcmkg_api'

urlpatterns = [
    path('private-password/', PongPrivatePasswordMatchView.as_view(), name='private_password'),
    path('tournament/', TournamentListCreateView.as_view(), name='tournament_list_create'),
    path('tournament/<int:pk>/', TournamentView.as_view(), name='tournament'),
    path('ranked/', PongRankedMatchView.as_view(), name='ranked_match'),
]