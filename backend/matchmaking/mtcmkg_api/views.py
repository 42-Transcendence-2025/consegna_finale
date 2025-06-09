import uuid
from threading import Condition
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import MatchCreateSerializer, TournamentCreateSerializer, TournamentListSerializer, TournamentDetailSerializer
from .models import Match, PongUser, Tournament
from rest_framework.generics import ListCreateAPIView, GenericAPIView
from django.db import transaction


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
               # TODO: creare i match del bracket qui
       # serializza lo stato corrente del torneo
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
            id=self.kwargs['pk'],
            status__in=[Tournament.Status.CREATED, Tournament.Status.FULL]
        ).prefetch_related('players', 'matches')
    
    def get(self, request, pk, *args, **kwargs):
        """
        Restituisce i dettagli del torneo con i player e i match
        """
        tournament = self.get_object()
        serializer = self.get_serializer(tournament)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

        