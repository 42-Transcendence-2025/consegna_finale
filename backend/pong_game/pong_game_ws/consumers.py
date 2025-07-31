from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
import asyncio
import json
from .pong import PongGame  # Assumendo che la classe PongGame sia in un file separato
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from .models import Match

class GameConsumer(AsyncWebsocketConsumer):
    games = {}  # Dizionario condiviso per memorizzare le istanze del gioco per ogni `game_id`

    async def connect(self):
        self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
        self.room_group_name = f"game_{self.game_id}"
        self.player_side = None  # Sarà assegnato come "left" o "right" dopo l'autenticazione
        self.user = None  # Utente autenticato
        self.game = None  # Istanza del gioco

        # Verifica se il match esiste e non è già finito
        self.match_id = await self.get_match_id()
        if self.match_id is None:
            # Match non trovato nella cache
            await self.close(code=4004)  # Game not found
            return

        # Verifica lo stato del match
        match_status = await self.get_match_status()
        if match_status in ['finished', 'finished_walkover', 'aborted']:
            # Match già finito
            await self.close(code=4005)  # Game already finished
            return

        # Accetta la connessione WebSocket per ricevere il token
        await self.accept()

    async def receive(self, text_data):
        """
        Gestisce i messaggi ricevuti dal WebSocket.
        """
        # Se l'utente non è autenticato, prova a autenticare con il primo messaggio
        if not self.user:
            token = text_data.strip()
            self.user = await self.authenticate_user(token)
            if self.user is None:
                await self.send_json({"error": "Authentication failed. Closing connection."})
                await self.close(code=4001)  # Codice di errore personalizzato
                return

            # Aggiungi l'utente autenticato alla stanza
            await self.join_game()
            return
        
        # Elabora i dati inviati dal client
        try:
            input_data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        await self.game.process_input(self.player_side, input_data)

    async def disconnect(self, close_code):
        """
        Gestisce la disconnessione del client.
        """
        # Rimuovi l'utente dalla stanza
        await self.leave_game()

    async def authenticate_user(self, token):
        """
        Autentica l'utente utilizzando il token JWT fornito.
        """
        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(token)
            user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
            return user
        except AuthenticationFailed:
            return None

    async def join_game(self):
        """
        Aggiunge l'utente autenticato alla stanza e assegna un lato del campo.
        """
        # Verifica che l'utente possa giocare questa partita
        can_play = await self.can_user_play_match()
        if not can_play:
            await self.send_json({"error": "You are not authorized to play this match."})
            await self.close(code=4003)  # Unauthorized
            return

        # Ottieni i dati del match per assegnare correttamente i lati
        match_data = await self.get_match_data()
        if not match_data:
            await self.send_json({"error": "Match data not found."})
            await self.close(code=4004)  # Match not found
            return

        # Aggiungi l'utente al gruppo del canale
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        # Crea una nuova istanza del gioco se non esiste
        if self.game_id not in GameConsumer.games:
            GameConsumer.games[self.game_id] = PongGame(self.game_id)
        self.game = GameConsumer.games[self.game_id]

        # Assegna i lati basandosi sui dati del match dal database
        # player_1 -> left_player, player_2 -> right_player
        if self.user.id == match_data['player_1_id']:
            self.player_side = "left"
            self.game.left_player = self.user
        elif self.user.id == match_data['player_2_id']:
            self.player_side = "right"
            self.game.right_player = self.user
        else:
            await self.send_json({"error": "You are not a player in this match."})
            await self.close(code=4003)  # Unauthorized
            return

        # Aggiungi il client alla lista dei giocatori se non è già presente
        if self not in self.game.clients:
            self.game.clients.append(self)
        await self.send_json({
            "message": "Authentication successful. Welcome to the game!",
            "player_side": self.player_side,
        })


        # SEMPRE invia l'aggiornamento dei giocatori quando qualcuno si unisce
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "players_update",
                "left_player": self.game.left_player.username if self.game.left_player else None,
                "left_player_trophies": self.game.left_player.trophies if self.game.left_player else None,
                "right_player": self.game.right_player.username if self.game.right_player else None,
                "right_player_trophies": self.game.right_player.trophies if self.game.right_player else None,
            }
        )

        # Avvia il processo di readiness solo se entrambi i giocatori sono presenti E non è già in corso
        if (len(self.game.clients) == 2 and 
            not self.game.game_loop_running and 
            not hasattr(self.game, 'waiting_for_ready')):

            # Flag per evitare múltipli wait_for_ready
            self.game.waiting_for_ready = True
            asyncio.create_task(self.wait_for_ready())

    async def leave_game(self):
        """
        Rimuove l'utente dalla stanza e aggiorna lo stato del gioco.
        """
        # Rimuovi il client dal gruppo
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

        # Rimuovi il client dall'istanza del gioco
        game = self.game
        if game:
            if self in game.clients:
                game.clients.remove(self)
            if not game.clients:  # Se non ci sono più client, elimina l'istanza del gioco
                await asyncio.sleep(5)  # Attendere 5 secondi prima di eliminare il gioco
                del GameConsumer.games[self.game_id]

    async def wait_for_ready(self):
        print(f"Waiting for players to be ready in game {self.game_id}")

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "wait_ready",
                "message": "Waiting for players to be ready"
            }
        )

        # loop per attendere readiness
        timeout = 60
        already_sent_left = False
        already_sent_right = False
        for _ in range(timeout * 10):  # ogni 100ms per 60s
            # Controlla se entrambi i giocatori sono pronti e invia un messaggio al gruppo
            if (self.game.ready["left"] and not already_sent_left) or (self.game.ready["right"] and not already_sent_right):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "players_ready",
                        "left_ready": self.game.ready["left"],
                        "right_ready": self.game.ready["right"],
                    }
                )
                already_sent_left = self.game.ready["left"]
                already_sent_right = self.game.ready["right"]
            if self.game.ready["left"] and self.game.ready["right"]:
                outcome = "start"
                break
            await asyncio.sleep(0.1)
            if not self.game.ready["left"] and not self.game.ready["right"]:
                outcome = "aborted"
            if self.game.ready["left"] or self.game.ready["right"]:
                outcome = "finished_walkover"
                self.game.winner = self.game.left_player if self.game.ready["left"] else self.game.right_player
                self.game.loser = self.game.right_player if self.game.ready["left"] else self.game.left_player

        # Rimuovi il flag di attesa
        if hasattr(self.game, 'waiting_for_ready'):
            delattr(self.game, 'waiting_for_ready')

        if outcome != "start":
            await self.update_match_status(outcome, self.game.winner, self.game.loser)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "game_over",
                    "by": outcome,
                    "winner": self.game.winner.username if self.game.winner else None,
                }
            )
        else:
            # DOPPIO CONTROLLO per evitare múltipli game loop
            if not self.game.game_loop_running:
                self.game.game_loop_running = True
                await self.update_match_status('in_game')
                asyncio.create_task(self.game_loop())
            else:
                print(f"[WARNING] Game loop already running for game {self.game_id}, skipping")


    async def game_loop(self):
        """
        Aggiorna periodicamente lo stato del gioco e lo trasmette ai client.
        """
        game = self.game
        if not game:
            return

        print(f"Starting game loop for game {self.game_id}")
        while game.clients:  # Esegui il ciclo finché ci sono client connessi
            if game.game_over:
                winner = self.game.winner
                loser = self.game.loser

                # Salva i punteggi nel database con la mappatura corretta:
                # left_score (left_player) -> points_player_1 (player_1 nel DB)
                # right_score (right_player) -> points_player_2 (player_2 nel DB)
                await self.update_match_finished(
                    points_player_1=self.game.state["left_score"],   # left_player = player_1
                    points_player_2=self.game.state["right_score"]   # right_player = player_2
                )

                # Invia un messaggio di fine gioco ai client
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "game_over",
                        "by": "points",
                        "winner": winner.username,
                    }
                )
                break

            # Aggiorna lo stato del gioco e invia i dati ai client
            await game.update_game_state()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "game_state",  # chiama .game_state(event) nel consumer
                    "state": self.game.state
                }
            )
            await asyncio.sleep(1 / 60)  # Ciclo a 60 FPS

        # Una volta che non ci sono più giocatori connessi, ferma il loop
        game.game_loop_running = False


    async def send_json(self, content):
        """
        Funzione helper per inviare messaggi JSON al WebSocket.
        """
        await self.send(text_data=json.dumps(content))

    async def wait_ready(self, event):
        await self.send_json({
            "type": "wait_ready",
            "message": event["message"]
        })
    
    async def players_ready(self, event):
        await self.send_json({
            "type": "players_ready",
            "left_ready": event["left_ready"],
            "right_ready": event["right_ready"],
        })

    async def game_state(self, event):
        await self.send_json({
            "type": "game_state",
            "state": event["state"]
        })

    async def game_over(self, event):
        """
        Gestisce la fine del gioco inviando un messaggio ai client.
        """
        await self.send_json({
            "type": "game_over",
            "by": event["by"],
            "winner": event["winner"],
        })

    async def players_update(self, event):
        """
        Gestisce l'aggiornamento dei giocatori inviando un messaggio ai client.
        """
        await self.send_json({
            "type": "players_update",
            "left_player": event["left_player"],
            "left_player_trophies": event["left_player_trophies"],
            "right_player": event["right_player"],
            "right_player_trophies": event["right_player_trophies"],
        })


    @database_sync_to_async
    def get_match_id(self):
        return cache.get(f"match_id_for_game_{self.game_id}")
    
    @database_sync_to_async
    def get_match_data(self):
        """Ottiene i dati del match dal database"""
        try:
            if not self.match_id:
                return None
                
            match = Match.objects.get(id=self.match_id)
            return {
                'player_1_id': match.player_1.id if match.player_1 else None,
                'player_2_id': match.player_2.id if match.player_2 else None,
                'player_1_username': match.player_1.username if match.player_1 else None,
                'player_2_username': match.player_2.username if match.player_2 else None,
                'status': match.status
            }
        except Match.DoesNotExist:
            return None
        except Exception as e:
            print(f"[ERROR] Error getting match data: {e}")
            return None
    
    @database_sync_to_async
    def get_match_status(self):
        """Ottiene lo status del match dal database"""
        try:
            if self.match_id:
                match = Match.objects.get(id=self.match_id)
                return match.status
            return None
        except Match.DoesNotExist:
            return None
        except Exception as e:
            print(f"[ERROR] Error getting match status: {e}")
            return None
    
    @database_sync_to_async
    def can_user_play_match(self):
        """Verifica se l'utente può giocare questa partita"""
        try:
            if not self.match_id:
                return False
            
            match = Match.objects.get(id=self.match_id)
            
            # Verifica che l'utente sia uno dei due giocatori del match
            return (match.player_1 == self.user or match.player_2 == self.user)
            
        except Match.DoesNotExist:
            return False
        except Exception as e:
            print(f"[ERROR] Error checking user permissions: {e}")
            return False
    
    @database_sync_to_async
    def update_match_status(self, status, winner=None, loser=None):
        try:
            if not self.match_id:
                print(f"[ERROR] Cannot update match status: match_id is None")
                return False
                
            match = Match.objects.get(id=self.match_id)
            match.status = status
            if winner:
                match.winner = winner
            if loser:
                match.loser = loser
            match.save()
            return True
        except Exception as e:
            print(f"[ERROR] Match update failed: {e}")
            return False

    @database_sync_to_async
    def update_match_finished(self, points_player_1, points_player_2):
        """
        Aggiorna il match con i punteggi finali.
        points_player_1: punteggio del left_player (che corrisponde a player_1 nel DB)
        points_player_2: punteggio del right_player (che corrisponde a player_2 nel DB)
        """
        try:
            if not self.match_id:
                print(f"[ERROR] Cannot finish match: match_id is None")
                return False
                
            match = Match.objects.get(id=self.match_id)
            
            # Verifica che il match non sia già finito
            if match.status in ['finished', 'finished_walkover', 'aborted']:
                print(f"[WARNING] Attempted to finish already completed match {self.match_id}")
                return False
            
            # Salva i punteggi: left_score -> player_1, right_score -> player_2
            match.points_player_1 = points_player_1
            match.points_player_2 = points_player_2
            match.status = 'finished'
            
            # Il metodo save() del modello Match si occuperà automaticamente 
            # di impostare winner e loser basandosi sui punteggi
            match.save()
            
            print(f"[INFO] Match {self.match_id} finished: player_1({match.player_1.username})={points_player_1}, player_2({match.player_2.username})={points_player_2}")
            return True
        except Exception as e:
            print(f"[ERROR] Final match update failed: {e}")
            return False
