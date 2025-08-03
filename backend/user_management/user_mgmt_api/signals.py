from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def assign_random_profile_image(sender, instance, created, **kwargs):
    """Assegna un'immagine casuale quando viene creato un nuovo utente"""
    if created and not instance.profile_image:
        instance.assign_random_profile_image()
