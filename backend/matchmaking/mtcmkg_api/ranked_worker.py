# matchmaking_worker.py

import json
import time
import uuid
import redis
from datetime import datetime
from django.core.cache import cache
from django.utils.timezone import now
from django.conf import settings
from dateutil.parser import isoparse  # per leggere gli ISO timestamp
from .models import PongUser, Match

redis_url = settings.CACHES["default"]["LOCATION"]
redis_conn = redis.Redis.from_url(redis_url)
POOL_KEY = "ranked_pool"

def get_time_diff_seconds(ts_string):
    return (now() - isoparse(ts_string)).total_seconds()

def players_compatible(p1, p2):
    t1 = get_time_diff_seconds(p1["timestamp"])
    t2 = get_time_diff_seconds(p2["timestamp"])
    tolerance_1 = int(t1 // 10 + 1) * 5   # es: 0–10s → 5, 10–20s → 10, ecc.
    tolerance_2 = int(t2 // 10 + 1) * 5
    diff = abs(p1["trophies"] - p2["trophies"])
    return diff <= max(tolerance_1, tolerance_2)

def matchmaking_loop():
    print("Ranked matchmaking worker started.")
    while True:
        try:
            # Prende tutta la pool
            raw_pool = redis_conn.lrange(POOL_KEY, 0, -1)
            pool = [json.loads(p) for p in raw_pool]

            matched = set()
            for i in range(len(pool)):
                if pool[i]["username"] in matched:
                    continue
                for j in range(i + 1, len(pool)):
                    if pool[j]["username"] in matched:
                        continue
                    if players_compatible(pool[i], pool[j]):
                        # Match trovato!
                        p1 = pool[i]
                        p2 = pool[j]
                        game_id = str(uuid.uuid4())

                        # crea match
                        player_1 = PongUser.objects.get(username=p1["username"])
                        player_2 = PongUser.objects.get(username=p2["username"])

                        match = Match.objects.create(
                            player_1=player_1,
                            player_2=player_2,
                            status="created"
                        )

                        # salva in cache
                        cache.set(f"match_id_for_game_{game_id}", match.id, timeout=3600)
                        print(f"[MATCH] {p1['username']} vs {p2['username']} → {game_id}")

                        # Scrive nella cache il risultato per ciascun player
                        cache.set(f"ranked_wait_{p1['username']}", {"game_id": game_id}, timeout=60)
                        cache.set(f"ranked_wait_{p2['username']}", {"game_id": game_id}, timeout=60)

                        # Rimuove i player dalla lista
                        redis_conn.lrem(POOL_KEY, 0, json.dumps(p1))
                        redis_conn.lrem(POOL_KEY, 0, json.dumps(p2))

                        matched.add(p1["username"])
                        matched.add(p2["username"])
                        break  # esce dal ciclo interno

            time.sleep(1)

        except Exception as e:
            print(f"[ERROR] {e}")
            time.sleep(5)
