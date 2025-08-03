# Generated manually for profile image feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user_mgmt_api', '0012_alter_tournament_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='ponguser',
            name='profile_image',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
