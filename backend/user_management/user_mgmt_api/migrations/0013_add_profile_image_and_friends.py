# Generated manually to resolve migration conflicts

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user_mgmt_api', '0012_alter_tournament_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='ponguser',
            name='friends',
            field=models.ManyToManyField(blank=True, related_name='friends_list', symmetrical=True, to='user_mgmt_api.ponguser'),
        ),
    ]
