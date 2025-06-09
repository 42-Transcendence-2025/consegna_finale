# bracket.py  – helper riutilizzabile
from .models import Tournament, Match, PongUser

# ------- alberatura -------------------------------------------------
def parent_slot(child: int) -> int:
    if child < 8:          # 0-7 → semifinali 8-11
        return 8 + child // 2
    if child < 12:         # 8-11 → finale 12-13
        return 12 + (child - 8) // 2
    return 14              # 12-13 → slot 14 (vincitore)

# ------- slot corrente di un player ---------------------------------
def current_slot(tournament: Tournament, player: PongUser) -> int | None:
    """
    Ritorna lo slot (0-14) del player nel bracket oppure None
    se non è nel torneo o non ha ancora un percorso valido.
    """
    ordered = list(tournament.players.all())            # foglie 0-7
    slot_map = {p.id: idx for idx, p in enumerate(ordered)}

    for m in tournament.matches.order_by("match_number"):   # 0-6
        if m.winner_id is None:
            continue
        s1 = slot_map.get(m.player_1_id)
        s2 = slot_map.get(m.player_2_id)
        if s1 is None or s2 is None:
            continue
        slot_map[m.winner_id] = parent_slot(min(s1, s2))

    return slot_map.get(player.id)
