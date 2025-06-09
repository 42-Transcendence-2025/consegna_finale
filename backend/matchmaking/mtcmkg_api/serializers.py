from rest_framework import serializers
from .models import Match, PongUser, Tournament  # importa i modelli corretti

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


def parent_slot(child: int) -> int:
    if child < 8:
        return 8 + child // 2
    if child < 12:
        return 12 + (child - 8) // 2
    return 14


class TournamentDetailSerializer(serializers.ModelSerializer):
    players  = serializers.SerializerMethodField()
    matches  = serializers.SerializerMethodField()

    class Meta:
        model  = Tournament
        fields = ("id", "name", "status", "players", "matches")

    # ---- players --------------------------------------------------
    def get_players(self, obj: Tournament):
        # 1. ordine di ingresso = foglie 0-7
        ordered = list(obj.players.all())
        slot_map = {p.id: idx for idx, p in enumerate(ordered)}

        # 2. propaga le vittorie (solo se il match ha winner)
        matches = obj.matches.order_by("match_number")     # index 0..6 salvato a creazione
        for m in matches:
            if m.winner_id is None:
                continue
            slot1 = slot_map.get(m.player_1_id)
            slot2 = slot_map.get(m.player_2_id)
            if slot1 is None or slot2 is None:
                continue
            slot_map[m.winner_id] = parent_slot(min(slot1, slot2))

        # 3. serializza
        return [
            {"username": p.username, "slot": slot_map.get(p.id)}
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

    