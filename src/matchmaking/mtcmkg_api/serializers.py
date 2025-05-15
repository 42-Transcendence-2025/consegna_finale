from rest_framework import serializers
from .models import Match, PongUser  # importa i modelli corretti

class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = ['player_1', 'player_2', 'tournament', 'status']
        read_only_fields = ['status']  # se vuoi settarlo tu nella view

    def create(self, validated_data):
        return Match.objects.create(**validated_data)
