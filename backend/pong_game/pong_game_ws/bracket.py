from .models import Tournament, Match, PongUser

def find_next_round_player(tournament: Tournament, aborted_match_number: int) -> PongUser | None:
    """
    Trova il giocatore che doveva incontrare il vincitore della partita abortita.
    Ritorna il giocatore che deve vincere per walkover, o None se non trovato.
    """
    # Mapping: quale match alimenta quale semifinale/finale
    next_round_mapping = {
        # Quarti → Semifinali
        0: (4, 1),  # Match 0 e 1 alimentano la semifinale 4
        1: (4, 0),  # Match 1 e 0 alimentano la semifinale 4  
        2: (5, 3),  # Match 2 e 3 alimentano la semifinale 5
        3: (5, 2),  # Match 3 e 2 alimentano la semifinale 5
        # Semifinali → Finale
        4: (6, 5),  # Match 4 e 5 alimentano la finale 6
        5: (6, 4),  # Match 5 e 4 alimentano la finale 6
    }
    
    if aborted_match_number not in next_round_mapping:
        return None  # È già la finale o match non valido
    
    next_match_number, sibling_match_number = next_round_mapping[aborted_match_number]
    
    # Verifica se il match del round successivo esiste già
    if tournament.matches.filter(match_number=next_match_number).exists():
        return None  # Il match successivo è già stato creato
    
    # Trova il vincitore del match "fratello"
    try:
        sibling_match = tournament.matches.get(match_number=sibling_match_number)
        if sibling_match.winner:
            return sibling_match.winner
    except Match.DoesNotExist:
        pass
    
    return None