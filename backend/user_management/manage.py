#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import json


def load_mock_users():
    """Carica utenti mock dal file JSON se non esistono già"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_mgmt.settings')
    
    try:
        import django
        django.setup()
        
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Percorso del file JSON
        json_file = os.path.join(os.path.dirname(__file__), 'mock_users.json')
        
        if not os.path.exists(json_file):
            print("❌ File mock_users.json non trovato")
            return
        
        with open(json_file, 'r', encoding='utf-8') as f:
            users_data = json.load(f)
        
        created_count = 0
        existing_count = 0
        
        for user_data in users_data:
            username = user_data['username']
            
            # Controlla se l'utente esiste già
            if User.objects.filter(username=username).exists():
                existing_count += 1
                continue
            
            # Crea l'utente
            user = User.objects.create_user(
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password']
            )
            created_count += 1
            print(f"✅ Creato utente: {username}")
        
        if existing_count > 0:
            print(f"ℹ️  {existing_count} utenti già esistenti (non ricreati)")
        
        if created_count > 0:
            print(f"🎉 {created_count} nuovi utenti mock creati!")
        else:
            print("✅ Tutti gli utenti mock sono già presenti")
            
    except Exception as e:
        print(f"❌ Errore nel caricamento utenti mock: {e}")


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_mgmt.settings')
    
    # 🔧 UNCOMMENT THE LINE BELOW TO AUTO-LOAD MOCK USERS ON STARTUP
    load_mock_users()  # Commenta questa riga per disabilitare il caricamento automatico
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
