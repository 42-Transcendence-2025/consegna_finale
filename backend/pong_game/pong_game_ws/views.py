from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.cache import cache
from .models import Match
from .consumers import GameConsumer
import json

class GameStateView(APIView):
    """
    View per ottenere lo stato di una partita e inviare azioni.
    
    GET: Ottiene lo stato corrente della partita
    POST: Invia un'azione alla partita (solo per i giocatori autorizzati)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, game_id):
        """
        Ottiene lo stato corrente della partita.
        """
        try:
            # Verifica che il match esista
            match_id = cache.get(f"match_id_for_game_{game_id}")
            if not match_id:
                return Response(
                    {"error": "Game not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verifica che l'utente possa accedere a questa partita
            try:
                match = Match.objects.get(id=match_id)
                if request.user != match.player_1 and request.user != match.player_2:
                    return Response(
                        {"error": "You are not authorized to view this game"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Match.DoesNotExist:
                return Response(
                    {"error": "Match not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Ottieni lo stato del gioco dal consumer
            if game_id not in GameConsumer.games:
                return Response({
                    "game_id": game_id,
                    "match_id": match_id,
                    "status": "not_started",
                    "message": "Game instance not created yet",
                    "match_status": match.status,
                    "players": {
                        "player_1": match.player_1.username if match.player_1 else None,
                        "player_2": match.player_2.username if match.player_2 else None,
                    }
                })
            
            game_instance = GameConsumer.games[game_id]
            
            return Response({
                "game_id": game_id,
                "match_id": match_id,
                "status": "active" if game_instance.game_loop_running else "waiting",
                "game_state": game_instance.state,
                "players": {
                    "left_player": game_instance.left_player.username if game_instance.left_player else None,
                    "right_player": game_instance.right_player.username if game_instance.right_player else None,
                },
                "ready_status": game_instance.ready,
                "connected_clients": len(game_instance.clients),
                "game_over": game_instance.game_over,
                "winner": game_instance.winner.username if game_instance.winner else None,
            })
            
        except Exception as e:
            return Response(
                {"error": f"Internal server error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request, game_id):
        """
        Invia un'azione alla partita (solo per i giocatori autorizzati).
        
        Body expected:
        {
            "action": "move",
            "direction": "up" | "down"
        }
        or
        {
            "action": "ready"
        }
        """
        try:
            # Verifica che il match esista
            match_id = cache.get(f"match_id_for_game_{game_id}")
            if not match_id:
                return Response(
                    {"error": "Game not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verifica che l'utente sia uno dei giocatori
            try:
                match = Match.objects.get(id=match_id)
                if request.user != match.player_1 and request.user != match.player_2:
                    return Response(
                        {"error": "You are not authorized to play this game"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Match.DoesNotExist:
                return Response(
                    {"error": "Match not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verifica che l'istanza del gioco esista
            if game_id not in GameConsumer.games:
                return Response(
                    {"error": "Game instance not active"}, 
                    status=status.HTTP_409_CONFLICT
                )
            
            game_instance = GameConsumer.games[game_id]
            
            # Determina il lato del giocatore
            if request.user.id == match.player_1.id:
                player_side = "left"
            elif request.user.id == match.player_2.id:
                player_side = "right"
            else:
                return Response(
                    {"error": "User not found in match players"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Valida i dati di input
            action_data = request.data
            if not isinstance(action_data, dict):
                return Response(
                    {"error": "Invalid action data format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            action = action_data.get("action")
            if not action:
                return Response(
                    {"error": "Action is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Valida azioni specifiche
            if action == "move":
                direction = action_data.get("direction")
                if direction not in ["up", "down"]:
                    return Response(
                        {"error": "Direction must be 'up' or 'down'"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif action == "ready":
                # Azione di ready - non serve validazione extra
                pass
            else:
                return Response(
                    {"error": f"Unknown action: {action}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Invia l'azione al gioco
            import asyncio
            
            # Esegui l'azione in modo asincrono
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    game_instance.process_input(player_side, action_data)
                )
            finally:
                loop.close()
            
            return Response({
                "success": True,
                "message": f"Action '{action}' sent successfully",
                "player_side": player_side,
                "game_status": "active" if game_instance.game_loop_running else "waiting"
            })
            
        except Exception as e:
            return Response(
                {"error": f"Internal server error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
