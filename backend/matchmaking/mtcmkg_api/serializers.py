from rest_framework import serializers
from .models import Match, PongUser, Tournament  # importa i modelli corretti
from .bracket import current_slot

class MatchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = ['player_1', 'player_2', 'tournament', 'status']
        read_only_fields = ['status']  # se vuoi settarlo tu nella view

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
        # 1. ordine di ingresso = foglie 0-7
        ordered = list(obj.players.all())
        return [
            {"username": p.username, "slot": current_slot(obj, p)}
            for p in ordered
        ]

    # ---- matches --------------------------------------------------
    def get_matches(self, obj: Tournament):
        qs = obj.matches.order_by("match_number")
        return [
            {
                "player_1": m.player_1.username if m.player_1 else None,
                "player_2": m.player_2.username if m.player_2 else None,
                "winner"  : m.winner.username   if m.winner   else None,
                "status"  : m.status,
            }
            for m in qs
        ]
    def get_ready(self, obj: Tournament):
        """True se c’è un avversario nello slot opposto, altrimenti False."""
        user = self.context["request"].user
        my_slot = current_slot(obj, user)
        if my_slot is None:          # safety, non dovrebbe accadere
            return False

        opponent_slot = my_slot ^ 1  # 0↔1, 2↔3, 4↔5, 6↔7
        for p in obj.players.all():
            if current_slot(obj, p) == opponent_slot:
                return True
        return False

    