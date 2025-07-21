#!/usr/bin/env python3
"""
Test script per verificare la logica di current_slot e bracket
"""

# Simula la logica di current_slot senza Django per test rapidi
def parent_slot(child: int) -> int:
    if child < 8:
        return 8 + child // 2          # quarti → semifinali
    if child < 12:
        return 12 + (child - 8) // 2   # semifinali → finale
    return 14                          # finale → root (vincitore)

def simulate_current_slot(players, matches):
    """
    Simula la logica di current_slot per test
    players: lista di username ['A', 'B', 'C', 'D', ...]
    matches: lista di dict con match info
    """
    # Inizializza slot_map con i player iniziali (foglie 0-7)
    slot_map = {player: idx for idx, player in enumerate(players)}
    
    for match in matches:
        # Gestisci partite abortite
        if match.get("status") == "aborted":
            if match.get("player_1") in slot_map:
                slot_map[match["player_1"]] = None
            if match.get("player_2") in slot_map:
                slot_map[match["player_2"]] = None
            continue
            
        # Gestisci partite finite normalmente
        winner = match.get("winner")
        if winner is None:
            continue

        player_1 = match.get("player_1")
        player_2 = match.get("player_2")
        
        s1 = slot_map.get(player_1)
        s2 = slot_map.get(player_2)
        if s1 is None or s2 is None:
            continue

        # aggiorna lo slot del vincitore
        slot_map[winner] = parent_slot(min(s1, s2))

        # azzera lo slot del perdente
        loser = player_2 if player_1 == winner else player_1
        slot_map[loser] = None

    return slot_map

def test_current_slot_scenarios():
    """Test diversi scenari del bracket"""
    
    print("=== TEST CURRENT_SLOT LOGIC ===\n")
    
    # Scenario 1: 8 giocatori iniziali, nessun match
    print("Scenario 1: 8 giocatori iniziali, nessun match")
    players = ["A", "B", "C", "D", "E", "F", "G", "H"]
    matches = []
    result = simulate_current_slot(players, matches)
    print(f"Result: {result}")
    expected = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6, "H": 7}
    print(f"Expected: {expected}")
    print(f"✅ PASS" if result == expected else f"❌ FAIL")
    print()
    
    # Scenario 2: Primo quarto - A batte B
    print("Scenario 2: Primo quarto - A batte B")
    matches = [
        {"match_number": 0, "player_1": "A", "player_2": "B", "winner": "A", "status": "finished"}
    ]
    result = simulate_current_slot(players, matches)
    print(f"Result: {result}")
    expected = {"A": 8, "B": None, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6, "H": 7}
    print(f"Expected: {expected}")
    print(f"✅ PASS" if result == expected else f"❌ FAIL")
    print()
    
    # Scenario 3: Due quarti completati
    print("Scenario 3: Due quarti completati - A batte B, C batte D")
    matches = [
        {"match_number": 0, "player_1": "A", "player_2": "B", "winner": "A", "status": "finished"},
        {"match_number": 1, "player_1": "C", "player_2": "D", "winner": "C", "status": "finished"}
    ]
    result = simulate_current_slot(players, matches)
    print(f"Result: {result}")
    expected = {"A": 8, "B": None, "C": 9, "D": None, "E": 4, "F": 5, "G": 6, "H": 7}
    print(f"Expected: {expected}")
    print(f"✅ PASS" if result == expected else f"❌ FAIL")
    print()
    
    # Scenario 4: Match abortito
    print("Scenario 4: Match abortito - A vs B aborted")
    matches = [
        {"match_number": 0, "player_1": "A", "player_2": "B", "winner": None, "status": "aborted"}
    ]
    result = simulate_current_slot(players, matches)
    print(f"Result: {result}")
    expected = {"A": None, "B": None, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6, "H": 7}
    print(f"Expected: {expected}")
    print(f"✅ PASS" if result == expected else f"❌ FAIL")
    print()
    
    # Scenario 5: Tutti i quarti completati
    print("Scenario 5: Tutti i quarti completati")
    matches = [
        {"match_number": 0, "player_1": "A", "player_2": "B", "winner": "A", "status": "finished"},
        {"match_number": 1, "player_1": "C", "player_2": "D", "winner": "C", "status": "finished"},
        {"match_number": 2, "player_1": "E", "player_2": "F", "winner": "E", "status": "finished"},
        {"match_number": 3, "player_1": "G", "player_2": "H", "winner": "G", "status": "finished"}
    ]
    result = simulate_current_slot(players, matches)
    print(f"Result: {result}")
    expected = {"A": 8, "B": None, "C": 9, "D": None, "E": 10, "F": None, "G": 11, "H": None}
    print(f"Expected: {expected}")
    print(f"✅ PASS" if result == expected else f"❌ FAIL")
    print()
    
    # Scenario 6: Prima semifinale - A batte C
    print("Scenario 6: Prima semifinale - A batte C (dopo aver vinto i quarti)")
    matches = [
        {"match_number": 0, "player_1": "A", "player_2": "B", "winner": "A", "status": "finished"},
        {"match_number": 1, "player_1": "C", "player_2": "D", "winner": "C", "status": "finished"},
        {"match_number": 2, "player_1": "E", "player_2": "F", "winner": "E", "status": "finished"},
        {"match_number": 3, "player_1": "G", "player_2": "H", "winner": "G", "status": "finished"},
        {"match_number": 4, "player_1": "A", "player_2": "C", "winner": "A", "status": "finished"}
    ]
    result = simulate_current_slot(players, matches)
    print(f"Result: {result}")
    expected = {"A": 12, "B": None, "C": None, "D": None, "E": 10, "F": None, "G": 11, "H": None}
    print(f"Expected: {expected}")
    print(f"✅ PASS" if result == expected else f"❌ FAIL")
    print()

def test_bracket_structure():
    """Test della struttura del bracket"""
    print("=== TEST BRACKET STRUCTURE ===\n")
    
    bracket_structure = {
        0: (0, 1),    # quarterfinal 1
        1: (2, 3),    # quarterfinal 2
        2: (4, 5),    # quarterfinal 3
        3: (6, 7),    # quarterfinal 4
        4: (8, 9),    # semifinal 1
        5: (10, 11),  # semifinal 2
        6: (12, 13),  # final
    }
    
    print("Struttura del bracket:")
    for match_num, (slot1, slot2) in bracket_structure.items():
        round_name = ""
        if match_num <= 3:
            round_name = "Quarterfinal"
        elif match_num <= 5:
            round_name = "Semifinal"
        else:
            round_name = "Final"
        
        print(f"Match {match_num} ({round_name}): Slot {slot1} vs Slot {slot2}")
    print()

if __name__ == "__main__":
    test_current_slot_scenarios()
    test_bracket_structure()
