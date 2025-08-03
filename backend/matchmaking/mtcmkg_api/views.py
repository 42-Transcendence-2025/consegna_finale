import uuid
import json
import redis
from threading import Condition
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListCreateAPIView, GenericAPIView
from rest_framework import status
from .serializers import MatchCreateSerializer, TournamentCreateSerializer, TournamentListSerializer, TournamentDetailSerializer
from .models import Match, PongUser, Tournament
from django.db import transaction
from .bracket import current_slot, get_opponent_for_player, get_player_position_in_match
from django.conf import settings
from datetime import datetime
from django.utils.timezone import now


conditions = {}
redis_url = settings.CACHES["default"]["LOCATION"]
redis_conn = redis.Redis.from_url(redis_url)

class PongRankedMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        username = user.username
        trophies = user.trophies

        #controllo se l'utente è già in ranked
        if cache.get(f"ranked_wait_{username}"):
            return Response(
                {"detail": "You are already in matchmaking queue"}, 
                status=status.HTTP_409_CONFLICT
            )


        # Timestamp e payload per il matchmaking
        timestamp = now().isoformat()
        player_data = {
            "username": username,
            "trophies": trophies,
            "timestamp": timestamp
        }

        # 1. Inserisce il player in coda Redis
        redis_conn.rpush("ranked_pool", json.dumps(player_data))

        # 2. Imposta un'attesa in cache
        cache.set(f"ranked_wait_{username}", {"status": "waiting"}, timeout=60)

        # 3. Il client farà polling con un GET /match/ranked/status/
        return Response({"detail": "Searching for match"}, status=202)
    
    def get(self, request):
        username = request.user.username
        key = f"ranked_wait_{username}"
        cached = cache.get(key)

        if not cached:
            return Response({"detail": "Matchmaking expired or cancelled"}, status=404)

        if cached.get("status") == "waiting":
            return Response({"detail": "Still searching..."}, status=202)

        if "game_id" in cached:
            return Response({"game_id": cached["game_id"]}, status=200)

        return Response({"detail": "Unknown matchmaking state"}, status=500)

    def delete(self, request):
        username = request.user.username
        trophies = request.user.trophies

        # Elimina dalla cache
        cache.delete(f"ranked_wait_{username}")

        # Rimuovi dalla coda Redis (scorre la lista e rimuove il match)
        redis_key = "ranked_pool"
        player_data = {
            "username": username,
            "trophies": trophies,
        }
        # Rimuove tutte le occorrenze (può succedere che ci siano duplicati per errore)
        redis_conn.lrem(redis_key, 0, json.dumps(player_data))

        return Response({"detail": "Matchmaking cancelled"}, status=200)

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
                serializer = MatchCreateSerializer(data=match_data)
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

class TournamentListCreateView(ListCreateAPIView):
    """
    POST /match/tournament/
    Richiede 'name', crea il torneo e restituisce:
        { "tournament_id": 42 }
    """
    permission_classes = [IsAuthenticated]
    

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TournamentCreateSerializer
        return TournamentListSerializer

    def create(self, request, *args, **kwargs):
        # se l'utente è già iscritto a un torneo in stato 'created', non può crearne un altro
        if request.user.tournaments.filter(status=Tournament.Status.CREATED).exists():
            return Response(
                {"detail": "You are already registered in a tournament"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)   # name nel body
        serializer.is_valid(raise_exception=True)
        tournament = serializer.save()                        # dentro al serializer crea + aggiunge il player
        return Response({"tournament_id": tournament.id}, status=status.HTTP_201_CREATED)
    
    def get_queryset(self):
        """
        Restituisce tutti i tornei con lo stato 'created'
        """
        qs = Tournament.objects.filter(status=Tournament.Status.CREATED).order_by("created_at")
        return qs
    
    def list(self, request, *args, **kwargs):
       # c’è già un torneo in cui l’utente è presente?
    #    my_tournament = (
    #        self.get_queryset()
    #        .filter(players=request.user)      # M2M lookup
    #        .first()
    #    )
    #    if my_tournament:
    #        # risposta “singola” invece della lista
    #        return Response(
    #            {"tournament_id": my_tournament.id},
    #            status=status.HTTP_200_OK,
    #        )
       # altrimenti comportamento standard → lista lobby
       return super().list(request, *args, **kwargs)
        
class TournamentView(GenericAPIView):
    """
    /match/tournament/<pk>/

    """
    permission_classes = [IsAuthenticated]
    serializer_class = TournamentDetailSerializer

    def put(self, request, pk, *args, **kwargs):
        """
        Aggiunge l'utente al torneo se:
          • il torneo è ancora in lobby ('created')
          • non è già pieno
          • l'utente non è già iscritto
        Se, dopo l'aggiunta, i player = 8 ⇒ cambia status in 'full'
        Restituisce lo stato aggiornato del torneo.
        """

        with transaction.atomic():
            try:
                # lock riga per evitare over-booking
                tournament = (
                    Tournament.objects.select_for_update()
                    .get(pk=pk, status=Tournament.Status.CREATED)
                )
            except Tournament.DoesNotExist:
                return Response(
                    {"detail": "Tournament not found or already started"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if request.user in tournament.players.all():
                return Response(
                    {"detail": "You have already joined this tournament"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if request.user.tournaments.filter(status=Tournament.Status.CREATED).exists():
                return Response(
                    {"detail": "You are already registered in a tournament"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if tournament.players.count() >= 8:
                return Response(
                    {"detail": "Tournament is full"},
                    status=status.HTTP_409_CONFLICT,
                )
            # aggiunge il giocatore
            tournament.players.add(request.user)
            # diventa “full” al raggiungimento di 8 player
            if tournament.players.count() == 8:
                tournament.status = "full"
                tournament.save(update_fields=["status"])

        return Response({"detail": "Joined tournament"}, status=status.HTTP_200_OK)


    def delete(self, request, pk, *args, **kwargs):
        """
        1. Recupera il torneo in stato *created* (404 se non esiste o già iniziato)
        2. Verifica che l’utente faccia parte dei `players` (403 altrimenti)
        3. Rimuove l’utente; se era l’ultimo, cancella il torneo
        """
        with transaction.atomic():
            try:
                # lock ottimistico: seleziona la riga in write-lock mentre la modifichiamo
                tournament = (
                    Tournament.objects.select_for_update()
                    .get(pk=pk, status=Tournament.Status.CREATED)
                )
            except Tournament.DoesNotExist:
                return Response(
                    {"detail": "Tournament not found or already started"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if request.user not in tournament.players.all():
                return Response(
                    {"detail": "You are not in this tournament"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # rimuove il player
            tournament.players.remove(request.user)

            # se non rimane più nessuno → elimina l’intero torneo
            if tournament.players.count() == 0:
                tournament.delete()
                return Response({"detail": "Left tournament and delete"}, status=status.HTTP_204_NO_CONTENT)
            

        # risposta “ok, sei uscito ma il torneo resta vivo”
        return Response({"detail": "Left tournament"}, status=status.HTTP_200_OK)
    
    def get_queryset(self):
        """
        Restituisce il torneo con lo stato 'created' o 'full' con player e match
        """
        return Tournament.objects.filter(
            id=self.kwargs['pk']
        ).prefetch_related('players', 'matches')
    
    def get(self, request, pk, *args, **kwargs):
        """
        Restituisce i dettagli del torneo con i player e i match
        """
        tournament = self.get_object()
        serializer = self.get_serializer(tournament)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request, pk, *args, **kwargs):
        """
        Creazione di un nuovo match nel torneo e response di game_id
        """
        user = request.user
        tournament = self.get_object()
        if tournament.status != Tournament.Status.FULL:
            return Response({"detail": "Tournament is not full"}, status=status.HTTP_400_BAD_REQUEST)
        if user not in tournament.players.all():
            return Response({"detail": "You are not in this tournament"}, status=status.HTTP_403_FORBIDDEN)
        
        slot = current_slot(tournament, user)
        if slot is None:
            return Response({"detail": "You have lost in this tournament"}, status=status.HTTP_403_FORBIDDEN)
        m_num = slot // 2
        print(f"Creating match for user {user.username} in slot {slot} (match number {m_num})")
        wait_key = f"wait_{tournament.id}_{m_num}"
        cond = get_condition(wait_key)

        # Determina la posizione di questo giocatore nel match
        user_position = get_player_position_in_match(tournament, m_num, user)
        if user_position is None:
            return Response({"detail": "You don't belong to this match"}, status=status.HTTP_400_BAD_REQUEST)

        cached = cache.get(wait_key)

        # Giocatore 2 trova il match
        if cached:
            if cached["username"] == user.username:
                return Response(
                    {"detail": "still waiting for opponent"},
                    status=status.HTTP_202_ACCEPTED
                )
            
            game_id = cached["game_id"]
            opponent_username = cached["username"]
            opponent = PongUser.objects.get(username=opponent_username)
        
            # Determina chi è player_1 e chi è player_2
            if user_position == 1:
                player_1, player_2 = user, opponent
            else:  # user_position == 2
                player_1, player_2 = opponent, user
        
            match = Match.objects.create(
                player_1=player_1,
                player_2=player_2,
                status="created",
                match_number=m_num,
                tournament=tournament
            )
            cache.set(f"match_id_for_game_{game_id}", match.id, timeout=3600)
            cache.delete(wait_key)
            with cond:
                cond.notify()
            return Response({"game_id": game_id}, status=status.HTTP_200_OK)
        
        # Giocatore 1 crea una condizione e aspetta
        game_id = str(uuid.uuid4())
        cache.set(wait_key, {"game_id": game_id, "username": user.username}, timeout=100)
        with cond:
            cond.wait(timeout=60)
        if not cache.get(wait_key):
            return Response({"game_id": game_id}, status=status.HTTP_200_OK)
        cache.delete(wait_key)
        # Giocatore vince il match a tavolino - trova l'avversario
        opponent = get_opponent_for_player(tournament, user)
        match = Match.objects.create(
            player_1 = user,
            player_2 = opponent,  # Ora include anche l'avversario
            status = "finished_walkover",
            match_number = m_num,
            tournament = tournament,
            winner = user
        )
        return Response({"detail": "win by walk_over"}, status=200)

        