import uuid
from threading import Condition
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import MatchSerializer
from .models import Match, PongUser


conditions = {}

def get_condition(password):
    if password not in conditions:
        conditions[password] = Condition()
    return conditions[password]

class PongPrivatePasswordMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get("password")
        username = request.user.username
        if not password:
            return Response({"detail": "Password is required"}, status=400)

        game_id_key = f"game_id_{password}"

        if cache.get(game_id_key) and username == cache.get(game_id_key).get("username"):
            condition = get_condition(password)
            with condition:
                condition.notify()
                condition.wait(timeout=1)

        if cache.get(game_id_key):  # Giocatore 2 trova il game_id
            game_id = cache.get(game_id_key)["game_id"]
            player_1_username = cache.get(game_id_key).get("username")
            try:
                player_1 = PongUser.objects.get(username=player_1_username)
                player_2 = request.user
                match_data = {
                    "player_1": player_1.id,
                    "player_2": player_2.id,
                    "status": "created"
                }
                serializer = MatchSerializer(data=match_data)
                serializer.is_valid(raise_exception=True)
                match = serializer.save()
                
                cache.set(f"match_id_for_game_{game_id}", match.id, timeout=3600)
                cache.delete(game_id_key)

                with get_condition(password):
                    get_condition(password).notify()
                return Response({"game_id": game_id}, status=200)
            except PongUser.DoesNotExist:
                return Response({"detail": "Player 1 not found"}, status=404)

        # Giocatore 1 crea una condizione e aspetta
        condition = get_condition(password)
        with condition:
            game_id = str(uuid.uuid4())
            cache.set(game_id_key, {"game_id": game_id, "username": username})
            condition.wait(timeout=60)
        if not cache.get(game_id_key):
            return Response({"game_id": game_id}, status=200)
        
        cache.delete(game_id_key)
        return Response({"detail": "Game not found"}, status=404)


