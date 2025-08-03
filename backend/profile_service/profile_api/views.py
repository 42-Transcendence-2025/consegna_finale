"""
Views for the profile API.

Expose endpoints to retrieve the authenticated user's profile and to
retrieve public profiles of other users. Both endpoints require
authentication so that only logged-in users can browse profiles. The
data returned is aggregated via the UserProfileSerializer.
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import PongUser
from .serializers import UserProfileSerializer


class UserProfileView(APIView):
    """Return the profile of the current authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class PublicUserProfileView(APIView):
    """Return the public profile of another user.

    Only authenticated users may view public profiles. The email field
    will be omitted in the serializer if the requesting user is not the
    owner of the profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        user = get_object_or_404(PongUser, username=username)
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class PongFriendsListView(APIView):
    """Return a list of friends for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friends = request.user.friends.all()
        friend_usernames = [friend.username for friend in friends]
        return Response(friend_usernames, status=status.HTTP_200_OK)
