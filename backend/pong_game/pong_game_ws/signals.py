# mtcmkg_api/signals.py
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Match, Tournament

@receiver(post_save, sender=Match)
def check_tournament_finished(sender, instance, **kwargs):
    # match senza torneo? esci subito
    if instance.tournament_id is None:
        return

    if not instance.status.startswith("finished"):
        return

    with transaction.atomic():
        t = Tournament.objects.select_for_update().get(pk=instance.tournament_id)
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
                t.status = Tournament.Status.FINISHED
                # Imposta il vincitore dalla finale (match_number=6)
                final = t.matches.filter(match_number=6).first()
                if final and final.winner:
                    t.winner = final.winner.username
                t.save(update_fields=["status", "winner"])
