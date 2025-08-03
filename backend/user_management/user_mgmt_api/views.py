from django.shortcuts import render
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView, RetrieveAPIView, ListAPIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import PongRegisterSerializer, VerifyOTPSerializer, PongLoginSerializer, PongUserSerializer
import pyotp
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from django.utils import timezone
from .mixins import UpdateLastActivityMixin
from .utils import get_client_ip, get_user_agent
from django.utils.timezone import now
import os
import uuid
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

User = get_user_model()

class PongRegisterView(APIView):
    def post(self, request):
        serializer = PongRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        user.otp_secret = pyotp.random_base32()
        user.save()
        totp = pyotp.TOTP(user.otp_secret)
        otp_code = totp.now()

        print(f"Generated OTP: {otp_code}")

        send_mail(
            subject='OTP Code',
            message=f'Your OTP Code is: {otp_code}',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({
            "detail": "Registration completed successfully, check the email for the OTP code",
            "otp_code": otp_code  # Aggiungi l'OTP nella risposta per debug
        }, status=status.HTTP_201_CREATED)

class PongLoginView(APIView):
    def post(self, request):
        serializer = PongLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if user.is_otp_required(request):
            user.otp_secret = pyotp.random_base32()
            user.save()
            totp = pyotp.TOTP(user.otp_secret)
            otp_code = totp.now()

            print(f"Generated OTP: {otp_code}")

            send_mail(
                subject='OTP Code',
                message=f'Your OTP Code is: {otp_code}',
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[user.email],
                fail_silently=False,
                )
        
            return Response(
                {
                    "detail": "Correct credentials, check your email for the OTP code",
                    "otp_code": otp_code  # Aggiungi l'OTP nella risposta per debug
                },
                status=status.HTTP_202_ACCEPTED
            )
        
        user.last_login_ip = get_client_ip(request)
        user.last_login_device = get_user_agent(request)
        user.last_otp_verification = now()
        user.save()

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return Response({"access": access_token, "refresh": refresh_token}, status=status.HTTP_200_OK)

class PongLogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            # Estrarre il refresh token dalla richiesta
            refresh_token = request.data.get("refresh_token")
            if not refresh_token:
                return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Revocare il refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()  # Blacklist se usi la blacklist dei token

            return Response({"detail": "Successfully logged out"}, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PongProfileView(UpdateLastActivityMixin, RetrieveUpdateDestroyAPIView):
    serializer_class = PongUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class PongUserView(UpdateLastActivityMixin, RetrieveAPIView):
    serializer_class = PongUserSerializer
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    lookup_field = 'username'

class PongUserListView(UpdateLastActivityMixin, ListAPIView):
    serializer_class = PongUserSerializer
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        print(f"User list requested by {request.user}")
        return response

class PongFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username=None):
        """Get list of user's friends with online status for search page"""
        friends = request.user.friends.all()
        friends_data = []
        
        for friend in friends:
            from .serializers import PongUserSerializer
            friend_serializer = PongUserSerializer(friend)
            friends_data.append({
                'username': friend.username,
                'is_online': friend_serializer.get_is_active(friend)
            })
        
        # Sort friends: online first, then by username
        friends_data.sort(key=lambda x: (not x['is_online'], x['username']))
        
        return Response(friends_data, status=status.HTTP_200_OK)

    def post(self, request, username):
        try:
            friend = User.objects.get(username=username)
            if request.user.friends.filter(username=username).exists():
                return Response({"detail": f"{username} is already your friend"}, status=status.HTTP_400_BAD_REQUEST)
            request.user.friends.add(friend)
            return Response({"detail": f"{username} added as a friend"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, username):
        try:
            friend = User.objects.get(username=username)
            if not request.user.friends.filter(username=username).exists():
                return Response({"detail": f"{username} is not your friend"}, status=status.HTTP_400_BAD_REQUEST)
            request.user.friends.remove(friend)
            return Response({"detail": f"{username} removed from friends"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class VerifyOTPView(APIView):
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        otp_code = serializer.validated_data['otp_code']

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        totp = pyotp.TOTP(user.otp_secret)
        if not totp.verify(otp_code, valid_window=1):
            return Response(
                {"detail": "Invalid OTP code."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user.last_login_ip = get_client_ip(request)
        user.last_login_device = get_user_agent(request)
        user.last_otp_verification = now()
        user.save()

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return Response({"access": access_token, "refresh": refresh_token}, status=status.HTTP_200_OK)

class PongRefreshTokenView(UpdateLastActivityMixin, TokenRefreshView):
    pass


class ProfileImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload a new profile image"""
        if 'image' not in request.FILES:
            return Response(
                {"detail": "No image file provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
        if image_file.content_type not in allowed_types:
            return Response(
                {"detail": "Invalid file type. Only JPEG, PNG and GIF are allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 5MB)
        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "File too large. Maximum size is 5MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create unique filename
        file_extension = os.path.splitext(image_file.name)[1]
        unique_filename = f"profile_{request.user.id}_{uuid.uuid4().hex}{file_extension}"
        
        # Save to assets/user_uploads/
        file_path = f"assets/user_uploads/{unique_filename}"
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(f"/app/frontend/{file_path}"), exist_ok=True)
        
        # Save file
        with open(f"/app/frontend/{file_path}", 'wb+') as destination:
            for chunk in image_file.chunks():
                destination.write(chunk)

        # Delete old image if it exists and is not a default one
        user = request.user
        if user.profile_image and not user.profile_image.startswith('assets/default_icons/'):
            old_file_path = f"/app/frontend/{user.profile_image}"
            if os.path.exists(old_file_path):
                os.remove(old_file_path)

        # Update user profile
        user.profile_image = file_path
        user.save()

        return Response(
            {"detail": "Profile image updated successfully.", "profile_image": file_path},
            status=status.HTTP_200_OK
        )

    def delete(self, request):
        """Delete profile image and assign a random one"""
        user = request.user
        
        # Delete current image if it's not a default one
        if user.profile_image and not user.profile_image.startswith('assets/default_icons/'):
            file_path = f"/app/frontend/{user.profile_image}"
            if os.path.exists(file_path):
                os.remove(file_path)

        # Assign random profile image
        user.assign_random_profile_image()

        return Response(
            {"detail": "Profile image reset to random default.", "profile_image": user.profile_image},
            status=status.HTTP_200_OK
        )
