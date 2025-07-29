"""
ASGI config for profile_service project.

It exposes the ASGI callable as a module-level variable named ``application``.

This file is required if you want to use asynchronous protocols such as
WebSocket. Although this microservice does not define WebSocket routes,
we include an ASGI application for completeness and future extension.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'profile_service.settings')

application = get_asgi_application()
