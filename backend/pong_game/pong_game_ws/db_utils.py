from channels.db import database_sync_to_async
from .models import Match
from django.core.cache import cache

@database_sync_to_async
def get_match_id(self):
    return cache.get(f"match_id_for_game_{self.game_id}")

@database_sync_to_async
def update_match_status(self, status, winner=None, loser=None):
    from .models import Match
    try:
        match = Match.objects.get(id=self.match_id)
        match.status = status
        if winner:
            match.winner = winner
        if loser:
            match.loser = loser
        match.save()
    except Exception as e:
        print(f"[ERROR] Match update failed: {e}")
        
@database_sync_to_async
def update_match_finished(self, points_player_1, points_player_2):
    from .models import Match
    try:
        match = Match.objects.get(id=self.match_id)
        match.points_player_1 = points_player_1
        match.points_player_2 = points_player_2
        match.status = 'finished'
        match.save()
    except Exception as e:
        print(f"[ERROR] Final match update failed: {e}")
        
@database_sync_to_async
def update_trophies(self, winner, loser):
    """
    Aggiorna i trofei dei giocatori dopo la partita.
    """
    try:
        winner.trophies += 3  # Aggiungi trofei al vincitore
        loser.trophies = max(loser.trophies - 1, 0)  # Rimuovi trofei dal perdente (ma non scendere sotto zero)
        winner.save()
        loser.save()
    except Exception as e:
        print(f"Errore durante l'aggiornamento dei trofei: {e}")