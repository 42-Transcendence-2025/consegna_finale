from rest_framework import serializers
from .models import Match, PongUser, Tournament
from .bracket import current_slot, get_all_tournament_matches, get_opponent_for_player

class MatchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = ['player_1', 'player_2', 'tournament', 'status']
        read_only_fields = ['status']  # se vuoi settarlo tu nella view

    def validate(self, data):
        """Valida che il torneo non abbia più di 7 partite"""
        tournament = data.get('tournament')
        if tournament and tournament.matches.count() >= 7:
            raise serializers.ValidationError(
                "Il torneo ha già raggiunto il numero massimo di partite (7)"
            )
        return data

    def create(self, validated_data):
        return Match.objects.create(**validated_data)
    
class TournamentCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=150, allow_blank=False)

    class Meta:
        model   = Tournament
        fields  = ("id", "name")          # id == tournament_id
        read_only_fields = ("id",)

    def create(self, validated_data):
        """
        • Crea il torneo in stato 'created'
        • Aggiunge subito l’utente che ha fatto la richiesta alla M2M `players`
        """
        user = self.context["request"].user          # GenericAPIView la inserisce nel context
        tournament = Tournament.objects.create(
            name = validated_data["name"],
        )
        tournament.players.add(user)
        return tournament
    
class TournamentListSerializer(serializers.ModelSerializer):
    """Usato per la GET: mostra i tornei ancora in lobby."""
    players_count = serializers.SerializerMethodField()

    class Meta:
        model  = Tournament
        fields = ("id", "name", "players_count", "created_at")

    def get_players_count(self, obj):
        return obj.players.count()


class TournamentDetailSerializer(serializers.ModelSerializer):
    players  = serializers.SerializerMethodField()
    matches  = serializers.SerializerMethodField()
    ready = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Tournament
        fields = ("id", "name", "status", "players", "matches", "ready")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        req  = self.context.get("request")
        user = getattr(req, "user", None)
        obj  = self.instance                     # è un singolo Tournament
        include = (
            obj
            and obj.status == Tournament.Status.FULL
            and user
            and obj.players.filter(pk=user.pk).exists()
        )
        if not include:
            self.fields.pop("ready")

    # ---- players --------------------------------------------------
    def get_players(self, obj: Tournament):
        """Ritorna solo la lista degli username dei giocatori, senza slot"""
        ordered = list(obj.players.all())
        return [p.username for p in ordered]

    # ---- matches --------------------------------------------------
    def get_matches(self, obj: Tournament):
        """
        Ritorna sempre tutti i 7 match del bracket, con i player pre-calcolati dove possibile.
        Per i match non ancora creati, tutti i campi sono null eccetto player_1, player_2 se determinabili.
        """
        return get_all_tournament_matches(obj)

    def get_ready(self, obj: Tournament):
        """True se c’è un avversario nello slot opposto, altrimenti False."""

        user = self.context["request"].user
        my_slot = current_slot(obj, user)
        if my_slot is None:
            return False
        
        # Usa la nuova funzione helper invece di duplicare la logica
        opponent = get_opponent_for_player(obj, user)
        return opponent is not None

    