"""
URL configuration for profile_service project.

The `urlpatterns` list routes URLs to views. For details see:
https://docs.djangoproject.com/en/5.1/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('profile_api.urls', namespace='profile_api')),
]
