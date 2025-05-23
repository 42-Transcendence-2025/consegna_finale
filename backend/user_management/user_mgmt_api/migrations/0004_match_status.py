# Generated by Django 5.1.3 on 2025-05-15 14:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user_mgmt_api', '0003_tournament_match'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='status',
            field=models.CharField(choices=[('created', 'Created'), ('in_game', 'In Game'), ('finished', 'Finished'), ('finished_walkover', 'Finished Walkover'), ('aborted', 'Aborted')], default='created', max_length=20),
        ),
    ]
