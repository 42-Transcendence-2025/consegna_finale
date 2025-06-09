# bracket.py
from .models import Tournament, Match, PongUser

def parent_slot(child: int) -> int:
    if child < 8:
        return 8 + child // 2          # quarti → semifinali
    if child < 12:
        return 12 + (child - 8) // 2   # semifinali → finale
    return 14                          # finale → root (vincitore)

def current_slot(tournament: Tournament, player: PongUser) -> int | None:
    """
    Ritorna lo slot (0-14) se il player è ancora “vivo” nel bracket,
    altrimenti None.
    """
    ordered   = list(tournament.players.all())          # foglie 0-7
    slot_map  = {p.id: idx for idx, p in enumerate(ordered)}

    for m in tournament.matches.order_by("match_number"):  # 0-6
        if m.winner_id is None:
            continue

        s1 = slot_map.get(m.player_1_id)
        s2 = slot_map.get(m.player_2_id)
        if s1 is None or s2 is None:
            continue

        # aggiorna lo slot del vincitore
        slot_map[m.winner_id] = parent_slot(min(s1, s2))

        # azzera lo slot del perdente
        loser_id = m.player_2_id if m.player_1_id == m.winner_id else m.player_1_id
        slot_map[loser_id] = None      # oppure slot_map.pop(loser_id, None)

    return slot_map.get(player.id)
