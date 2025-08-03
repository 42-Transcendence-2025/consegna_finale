from django.urls import path
from .views import PongFriendsListView, UserProfileView, PublicUserProfileView

app_name = 'profile_api'

urlpatterns = [
    # Profile of the authenticated user
    path('profile/', UserProfileView.as_view(), name='profile'),
    # Public profile of another user
    path('profile/<str:username>/', PublicUserProfileView.as_view(), name='public_profile'),
    path('friends/', PongFriendsListView.as_view(), name='friends_list'),
]
