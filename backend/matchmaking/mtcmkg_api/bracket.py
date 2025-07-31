from .models import Tournament, Match, PongUser

def parent_slot(child: int) -> int:
    if child < 8:
        return 8 + child // 2          # quarti → semifinali
    if child < 12:
        return 12 + (child - 8) // 2   # semifinali → finale
    return 14                          # finale → root (vincitore)

def current_slot(tournament: Tournament, player: PongUser) -> int | None:
    """
    Ritorna lo slot (0-14) se il player è ancora "vivo" nel bracket,
    altrimenti None.
    """
    ordered_players = list(tournament.players.order_by('id'))
    slot_map  = {p.id: idx for idx, p in enumerate(ordered_players)}

    for m in tournament.matches.order_by("match_number"):  # 0-6
        # Gestisci partite abortite - entrambi i giocatori vengono eliminati
        if m.status == "aborted":
            if m.player_1_id in slot_map:
                slot_map[m.player_1_id] = None
            if m.player_2_id in slot_map:
                slot_map[m.player_2_id] = None
            continue
            
        # Gestisci partite finite normalmente (inclusi walkover)
        if m.winner_id is None:
            continue

        # Per i walkover, uno dei due giocatori può essere None
        # Dobbiamo comunque processare il match se c'è un vincitore
        
        # Ottieni gli slot dei giocatori (potrebbero essere None per walkover)
        s1 = slot_map.get(m.player_1_id) if m.player_1_id else None
        s2 = slot_map.get(m.player_2_id) if m.player_2_id else None
        
        # Per determinare lo slot target, usiamo lo slot più basso disponibile
        target_slot = None
        if s1 is not None and s2 is not None:
            # Match normale - usa il minimo
            target_slot = min(s1, s2)
        elif s1 is not None:
            # Walkover: player_2 è None, usa slot di player_1
            target_slot = s1
        elif s2 is not None:
            # Walkover: player_1 è None, usa slot di player_2
            target_slot = s2
        else:
            # Entrambi None - situazione anomala, skip
            continue
        
        # Aggiorna lo slot del vincitore
        slot_map[m.winner_id] = parent_slot(target_slot)

        # Azzera lo slot del perdente (se esiste)
        if m.player_1_id and m.player_1_id != m.winner_id:
            slot_map[m.player_1_id] = None
        if m.player_2_id and m.player_2_id != m.winner_id:
            slot_map[m.player_2_id] = None

    return slot_map.get(player.id)


def get_all_tournament_matches(tournament: Tournament) -> list:
    """
    Ritorna sempre tutti i 7 match del bracket, con i player pre-calcolati dove possibile.
    Se un match non esiste ancora, viene creato con valori null ma con i player calcolati se determinabili.
    """
    # Ottieni i match esistenti mappati per match_number
    existing_matches = {m.match_number: m for m in tournament.matches.all()}
    
    # Ottieni i giocatori ordinati (foglie 0-7)
    ordered_players = list(tournament.players.all())
    
    # Crea un mapping slot -> player per lo stato attuale
    slot_to_player = {}
    for player in ordered_players:
        slot = current_slot(tournament, player)
        if slot is not None:
            slot_to_player[slot] = player
    
    # Definisci la struttura del bracket: match_number -> (slot1, slot2)
    bracket_structure = {
        0: (0, 1),    # quarterfinal 1
        1: (2, 3),    # quarterfinal 2
        2: (4, 5),    # quarterfinal 3
        3: (6, 7),    # quarterfinal 4
        4: (8, 9),    # semifinal 1
        5: (10, 11),  # semifinal 2
        6: (12, 13),  # final
    }
    
    matches = []
    
    for match_number in range(7):  # 0-6
        slot1, slot2 = bracket_structure[match_number]
        
        # Controlla se esiste già questo match
        if match_number in existing_matches:
            existing_match = existing_matches[match_number]
            match_data = {
                "match_number": match_number,
                "player_1": existing_match.player_1.username if existing_match.player_1 else None,
                "player_2": existing_match.player_2.username if existing_match.player_2 else None,
                "winner": existing_match.winner.username if existing_match.winner else None,
                "status": existing_match.status,
                "points_player_1": existing_match.points_player_1,
                "points_player_2": existing_match.points_player_2,
            }
        else:
            # Match non ancora creato - calcola i player se possibili
            player1 = slot_to_player.get(slot1)
            player2 = slot_to_player.get(slot2)
            
            match_data = {
                "match_number": match_number,
                "player_1": player1.username if player1 else None,
                "player_2": player2.username if player2 else None,
                "winner": None,
                "status": None,
                "points_player_1": None,
                "points_player_2": None,
            }
        
        matches.append(match_data)
    
    return matches


def get_opponent_for_player(tournament: Tournament, player: PongUser) -> PongUser | None:
    """
    Trova l'avversario del giocatore nel prossimo match.
    Usa la stessa logica robusta del serializer get_ready.
    Ritorna il PongUser avversario o None se non trovato.
    """
    bracket_structure = {
        0: (0, 1), 1: (2, 3), 2: (4, 5), 3: (6, 7),
        4: (8, 9), 5: (10, 11), 6: (12, 13)
    }
    
    my_slot = current_slot(tournament, player)
    if my_slot is None:
        return None
    
    # Trova il match e lo slot dell'avversario
    for match_number, (s1, s2) in bracket_structure.items():
        if my_slot in (s1, s2):
            opponent_slot = s2 if my_slot == s1 else s1
            
            # Trova il giocatore nello slot dell'avversario
            for p in tournament.players.all():
                if current_slot(tournament, p) == opponent_slot:
                    return p
            return None
    
    return None

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

def test_current_slot_logic():
    """
    Funzione di test per verificare la logica di current_slot.
    Stampa degli scenari di test per verificare il comportamento.
    """
    print("=== TEST CURRENT_SLOT LOGIC ===")
    
    # Questo è un test conceptuale - nella pratica useresti Django's TestCase
    test_scenarios = [
        {
            "description": "8 giocatori iniziali, nessun match",
            "players": ["A", "B", "C", "D", "E", "F", "G", "H"],
            "matches": [],
            "expected_slots": {
                "A": 0, "B": 1, "C": 2, "D": 3, 
                "E": 4, "F": 5, "G": 6, "H": 7
            }
        },
        {
            "description": "Dopo il primo quarto: A batte B",
            "players": ["A", "B", "C", "D", "E", "F", "G", "H"],
            "matches": [
                {"match_number": 0, "player_1": "A", "player_2": "B", "winner": "A", "status": "finished"}
            ],
            "expected_slots": {
                "A": 8, "B": None, "C": 2, "D": 3, 
                "E": 4, "F": 5, "G": 6, "H": 7
            }
        },
        {
            "description": "Match abortito: A vs B aborted",
            "players": ["A", "B", "C", "D", "E", "F", "G", "H"],
            "matches": [
                {"match_number": 0, "player_1": "A", "player_2": "B", "winner": None, "status": "aborted"}
            ],
            "expected_slots": {
                "A": None, "B": None, "C": 2, "D": 3, 
                "E": 4, "F": 5, "G": 6, "H": 7
            }
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\nScenario: {scenario['description']}")
        print("Expected slots:", scenario['expected_slots'])
        # Qui implementeresti la logica di test effettiva
    
    return test_scenarios
