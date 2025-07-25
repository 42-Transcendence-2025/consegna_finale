# mtcmkg_api/signals.py
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Match, Tournament, PongUser

@receiver(post_save, sender=Match)
def check_match_finished(sender, instance, **kwargs):

    # Gestisci partite finite - aggiorna trofei
    if instance.status.startswith("finished"):
        update_player_trophies(instance)
    else:
        return
    
    # match senza torneo? esci subito
    if instance.tournament_id is None:
        return

    check_tournament_completion(instance.tournament)


def update_player_trophies(match):
    """
    Aggiorna i trofei dei giocatori quando un match è finito.
    Vincitore: +3 trofei, Perdente: -3 trofei
    """
    if not match.winner or not match.status.startswith("finished"):
        return
    
    # Determina il perdente
    if match.player_1 and match.player_2:
        loser = match.player_2 if match.winner == match.player_1 else match.player_1
        
        with transaction.atomic():
            # Aggiorna trofei del vincitore (+3)
            winner = PongUser.objects.select_for_update().get(pk=match.winner.pk)
            winner.trophies += 3
            winner.save(update_fields=['trophies'])
            
            # Aggiorna trofei del perdente (-3)
            loser_obj = PongUser.objects.select_for_update().get(pk=loser.pk)
            loser_obj.trophies = max(0, loser_obj.trophies - 3)  # Non andare sotto 0
            loser_obj.save(update_fields=['trophies'])

def check_tournament_completion(tournament):
    """
    Controlla se il torneo è completato (tutte le 7 partite finite)
    e assegna bonus trofei al vincitore del torneo.
    """
    with transaction.atomic():
        t = Tournament.objects.select_for_update().get(pk=tournament.pk)
        if t.status == Tournament.Status.FINISHED:
            return

        # controlla che ci siano tutte le 7 partite e che siano tutte finite o abortite
        total_matches = t.matches.count()
        if total_matches == 7:
            # Verifica che tutte le partite abbiano status finished* o aborted
            finished_or_aborted_matches = t.matches.filter(
                status__in=['finished', 'finished_walkover', 'aborted']
            ).count()
            
            if finished_or_aborted_matches == 7:
                # Trova il vincitore dalla finale (match_number=6)
                final = t.matches.filter(match_number=6).first()
                tournament_winner = None
                
                if final and final.winner:
                    tournament_winner = final.winner
                    t.winner = tournament_winner.username
                
                # Aggiorna lo status del torneo
                t.status = Tournament.Status.FINISHED
                t.save(update_fields=["status", "winner"])
                
                # Assegna bonus trofei al vincitore del torneo (+10)
                if tournament_winner:
                    award_tournament_winner_bonus(tournament_winner)


def award_tournament_winner_bonus(winner):
    """
    Assegna +10 trofei bonus al vincitore del torneo.
    """
    with transaction.atomic():
        winner_obj = PongUser.objects.select_for_update().get(pk=winner.pk)
        winner_obj.trophies += 10
        winner_obj.save(update_fields=['trophies'])
