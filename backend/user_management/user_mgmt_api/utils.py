def get_client_ip(request):
    """Ritorna l'indirizzo IP del client, considerando possibili proxy."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]  # Prendi il primo IP (il client reale)
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_user_agent(request):
    """Ritorna il valore dell'header User-Agent."""
    return request.META.get('HTTP_USER_AGENT', '')

