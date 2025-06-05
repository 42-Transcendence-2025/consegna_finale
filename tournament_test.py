#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
client_tournament.py
CLI semplificata per testare le API dei tornei:

    • tournament create
    • tournament list
    • tournament join <id>

Dipendenze:  requests  (pip install requests)
"""

import json
import sys
import requests

# ───────────────────────────────────────────────────────────────
#  CONFIG
# ───────────────────────────────────────────────────────────────
BASE_URL  = "http://localhost:8003"          # auth/profile service
MATCH_URL = "http://localhost:8001"          # match/tournament service
TOURN_URL = f"{MATCH_URL}/match/tournament/" # endpoint REST tornei


# ───────────────────────────────────────────────────────────────
#  AUTH  (register → login → verify-otp → token refresh)
# ───────────────────────────────────────────────────────────────
def register_user() -> bool:
    print("\n### REGISTRAZIONE ###")
    payload = {
        "email"            : input("Email: "),
        "username"         : input("Username: "),
        "password"         : input("Password: "),
        "password_confirm" : input("Conferma password: "),
    }
    r = requests.post(f"{BASE_URL}/register/", json=payload)
    print("Risposta:", r.status_code, r.json())
    if  r.status_code == 201:
        return verify_otp()

def login_user() -> bool:
    print("\n### LOGIN ###")
    payload = {
        "username": input("Username: "),
        "password": input("Password: "),
    }
    r = requests.post(f"{BASE_URL}/login/", json=payload)
    print("Login response:", r.status_code, r.json())
    # Il backend restituisce 202 per indicare che serve OTP
    if r.status_code == 202:
        print("OTP richiesto, procedi con la verifica.")
        return verify_otp()
    elif r.status_code == 200:
        return r.json()  # {access, refresh}



def verify_otp() -> dict | None:
    print("\n### OTP ###")
    payload = {
        "username": input("Username (di nuovo): "),
        "otp_code": input("Codice OTP: "),
    }
    r = requests.post(f"{BASE_URL}/verify-otp/", json=payload)
    if r.status_code == 200:
        print("OTP OK, token ricevuti.")
        return r.json()                      # {access, refresh}
    print("Errore OTP:", r.status_code, r.json())
    return None


def refresh_access_token(refresh_token: str) -> str | None:
    r = requests.post(f"{BASE_URL}/token_refresh/", json={"refresh": refresh_token})
    if r.status_code == 200:
        return r.json()["access"]
    print("Refresh token fallito:", r.status_code, r.json())
    return None


# ───────────────────────────────────────────────────────────────
#  TOURNAMENT HELPERS
# ───────────────────────────────────────────────────────────────
def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def create_tournament(name: str, token: str) -> None:
    r = requests.post(TOURN_URL, json={"name": name}, headers=_auth_headers(token))
    if r.status_code == 201:
        print("Torneo creato! ID =", r.json()["tournament_id"])
    else:
        print("Errore creazione torneo:", r.status_code, r.json())


def list_tournaments(token: str) -> None:
    r = requests.get(TOURN_URL, headers=_auth_headers(token))
    if r.status_code != 200:
        print("Errore lista tornei:", r.status_code, r.json())
        return
    lobby = r.json()
    if not lobby:
        print("Nessun torneo disponibile.")
        return
    print("\nID  Giocatori  Nome")
    print("--  ---------  --------------------")
    for t in lobby:
        print(f"{t['id']:>2}  {t['players_count']}/8       {t['name']}")


def join_tournament(tid: int, token: str) -> None:
    r = requests.post(f"{TOURN_URL}{tid}/", headers=_auth_headers(token))
    match r.status_code:
        case 200:
            data = r.json()
            print(f"Unito al torneo {tid} con successo!")
        case 404:
            print("Torneo non trovato o già iniziato.")
        case 409:
            print("Torneo pieno.")
        case _:
            print("Errore join:", r.status_code, r.json())

def delete_tournament(tid: int, token: str) -> None:
    r = requests.delete(f"{TOURN_URL}{tid}/", headers=_auth_headers(token))
    if r.status_code == 204 or r.status_code == 200:
        print(f"Uscito dal torneo {tid} con successo!")
    else:
        print("Errore nell'uscire dal torneo", r.status_code, r.json())


# ───────────────────────────────────────────────────────────────
#  CLI LOOP
# ───────────────────────────────────────────────────────────────
def main() -> None:
    choice = input("register / login ? ").strip().lower()
    if choice == "register":
        tokens = register_user()
        if not tokens:
            sys.exit("Registrazione fallita.")
    elif choice == "login":
        tokens = login_user()
        if not tokens:
            sys.exit("Login fallito.")
    elif choice != "login":
        sys.exit("Scelta non valida.")

    access, refresh = tokens["access"], tokens["refresh"]

    # menu principale
    HELP = (
        "\nComandi:\n"
        "  tournament create      → crea torneo\n"
        "  tournament list        → lista lobby\n"
        "  tournament join <id>   → entra in un torneo\n"
        "  tournament delete <id> → esci da un torneo\n"
        "  refresh                → rinnova access token\n"
        "  exit                   → esci\n"
    )
    print(HELP)
    while True:
        cmd = input("> ").strip().split()
        if not cmd:
            continue
        match cmd[0]:
            case "tournament":
                if len(cmd) < 2:
                    print("Sub-comando mancante (create/list/join).")
                    continue
                sub = cmd[1]
                if sub == "create":
                    name = input("Nome torneo: ").strip()
                    create_tournament(name, access)
                elif sub == "list":
                    list_tournaments(access)
                elif sub == "join" and len(cmd) == 3 and cmd[2].isdigit():
                    join_tournament(int(cmd[2]), access)
                elif sub == "delete" and len(cmd) == 3 and cmd[2].isdigit():
                    delete_tournament(int(cmd[2]), access)
                else:
                    print("Uso: tournament join <id>")
            case "refresh":
                new = refresh_access_token(refresh)
                if new:
                    access = new
                    print("Access token aggiornato.")
            case "exit":
                print("Bye!")
                break
            case _:
                print(HELP)


if __name__ == "__main__":
    main()
