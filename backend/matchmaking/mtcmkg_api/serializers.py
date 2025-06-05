from rest_framework import serializers
from .models import Match, PongUser, Tournament  # importa i modelli corretti

class MatchSerializer(serializers.ModelSerializer):
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
    