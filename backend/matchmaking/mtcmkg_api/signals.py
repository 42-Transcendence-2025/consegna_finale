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

        if not t.matches.filter(status="created").exists():
            final = t.matches.filter(match_number=6).first()
            if final and final.winner:
                t.winner = final.winner
                t.status = Tournament.Status.FINISHED
            t.save(update_fields=["status", "winner"])
