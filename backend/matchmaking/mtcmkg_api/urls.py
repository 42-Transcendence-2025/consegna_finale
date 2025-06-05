from django.urls import path
from .views import PongPrivatePasswordMatchView, TournamentListCreateView, TournamentView

app_name = 'mtcmkg_api'

urlpatterns = [
    path('private-password/', PongPrivatePasswordMatchView.as_view(), name='private_password'),
    path('tournament/', TournamentListCreateView.as_view(), name='tournament_list_create'),
    path('tournament/<int:pk>/', TournamentView.as_view(), name='tournament'),
]