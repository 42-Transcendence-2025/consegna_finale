# Generated by Django 5.1.3 on 2025-06-05 16:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user_mgmt_api', '0008_match_points_player_1_match_points_player_2'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tournament',
            name='status',
            field=models.CharField(choices=[('created', 'Created'), ('full', 'Full'), ('finished', 'Finished'), ('aborted', 'Aborted')], default='created', max_length=20),
        ),
    ]
