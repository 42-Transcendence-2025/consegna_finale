"""
Serializers for profile API.

These classes format user, tournament and match information for output via
the profile endpoints. They include computed fields such as the
participant's position in each tournament and opponent names in each
match. Sensitive fields like email are only exposed when the requesting
user is viewing their own profile.
"""

from rest_framework import serializers
from django.db.models import Q
from .models import PongUser, Tournament, Match


class TournamentSummarySerializer(serializers.Serializer):
    """Summarize a tournament for a user profile.

    This serializer produces a minimal representation of a tournament
    participation for a given user, including the user's final position
    (e.g. winner, finalist, semifinalist, quarterfinalist).
    """

    id = serializers.IntegerField()
    name = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    winner = serializers.CharField(allow_null=True)
    position = serializers.CharField()
    created_at = serializers.DateTimeField()


class MatchSummarySerializer(serializers.Serializer):
    """Summarize a match for a user profile.

    This representation includes the opponent's username, the tournament
    (if any), the points scored by the user and the opponent, and the
    match status.
    """

    match_id = serializers.IntegerField()
    tournament_id = serializers.IntegerField(allow_null=True)
    tournament_name = serializers.CharField(allow_null=True)
    opponent = serializers.CharField(allow_null=True)
    points_for = serializers.IntegerField(allow_null=True)
    points_against = serializers.IntegerField(allow_null=True)
    status = serializers.CharField()
    created_at = serializers.DateTimeField()


class UserProfileSerializer(serializers.ModelSerializer):
    """Aggregate profile information for a user.

    Exposes the basic user fields along with lists of tournaments and
    matches in which the user has participated. The requesting user is
    passed via the serializer context so that sensitive data (email) can
    be hidden for non-owners.
    """

    tournaments = serializers.SerializerMethodField()
    matches = serializers.SerializerMethodField()
    is_friend = serializers.SerializerMethodField()

    class Meta:
        model = PongUser
        fields = [
            'username',
            'email',
            'trophies',
            'profile_image',
            'last_activity',
            'tournaments',
            'matches',
            'is_friend',
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        # Hide email for profiles viewed by other users
        if request and request.user != instance:
            representation.pop('email', None)
        return representation

    def get_is_friend(self, obj):
        """Check if the requesting user is a friend of the profile owner."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Se stai guardando il tuo profilo, non mostrare il pulsante amicizia
        if request.user == obj:
            return None
            
        return request.user.friends.filter(id=obj.id).exists()

    def get_tournaments(self, obj):
        """Return a list of TournamentSummary for the user in reverse chronological order."""
        user = obj
        tournaments = obj.tournaments.all().order_by('-created_at')
        return [
            self._serialize_tournament(t, user)
            for t in tournaments
        ]

    def _serialize_tournament(self, tournament, user):
        """Helper to compute the user's position in the tournament and build a summary."""
        position = self._compute_position(user, tournament)
        return TournamentSummarySerializer({
            'id': tournament.id,
            'name': tournament.name,
            'status': tournament.status,
            'winner': tournament.winner,
            'position': position,
            'created_at': tournament.created_at,
        }).data

    def _compute_position(self, user, tournament):
        """Determine how far the user progressed in the tournament.

        The logic is simple: if the user is the recorded winner, they are
        "Winner". Otherwise we look at matches they won in this
        tournament; the match_number field encodes the round: 0-3
        quarterfinals, 4-5 semifinals, 6 final. The highest match_number
        they won determines their position. If they never won a match,
        they were eliminated in the first round.
        """
        # Winner is stored as username on Tournament
        if tournament.winner == user.username:
            return 'Winner'

        # Fetch matches where the user is recorded as the winner
        wins = Match.objects.filter(tournament=tournament, winner=user)
        # If no wins, the user lost in the first round
        if not wins.exists():
            return 'Participant'

        max_win_round = wins.order_by('-match_number').values_list('match_number', flat=True).first()
        if max_win_round is None:
            return 'Participant'
        # Determine position from the round number
        if max_win_round >= 6:
            return 'Finalist'
        elif max_win_round >= 4:
            return 'Semifinalist'
        else:
            return 'Quarterfinalist'

    def get_matches(self, obj):
        """Return a list of MatchSummary for the user in reverse chronological order."""
        user = obj
        # Retrieve all matches involving the user
        matches = Match.objects.filter(Q(player_1=user) | Q(player_2=user)).order_by('-created_at')
        summaries = []
        for m in matches:
            if m.player_1 == user:
                opponent = m.player_2.username if m.player_2 else None
                points_for = m.points_player_1
                points_against = m.points_player_2
            else:
                opponent = m.player_1.username if m.player_1 else None
                points_for = m.points_player_2
                points_against = m.points_player_1
            summaries.append(MatchSummarySerializer({
                'match_id': m.id,
                'tournament_id': m.tournament_id,
                'tournament_name': m.tournament.name if m.tournament else None,
                'opponent': opponent,
                'points_for': points_for,
                'points_against': points_against,
                'status': m.status,
                'created_at': m.created_at,
            }).data)
        return summaries
