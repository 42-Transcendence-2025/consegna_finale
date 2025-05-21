import asyncio
import json

class PongGame:
    GAME_WIDTH = 800
    GAME_HEIGHT = 600
    PADDLE_HEIGHT = 100
    PADDLE_WIDTH = 20
    BALL_RADIUS = 10
    WINNING_SCORE = 5

    def __init__(self, game_id):
        self.game_id = game_id
        self.state = {
            "ball": {"x": self.GAME_WIDTH // 2, "y": self.GAME_HEIGHT // 2, "dx": 6, "dy": 0},
            "left_paddle": {"y": self.GAME_HEIGHT // 2 - self.PADDLE_HEIGHT // 2},
            "right_paddle": {"y": self.GAME_HEIGHT // 2 - self.PADDLE_HEIGHT // 2},
            "left_score": 0,
            "right_score": 0,
        }
        self.clients = []
        self.game_loop_running = False
        self.left_player = None
        self.right_player = None
        self.game_over = False
        self.winner = None
        self.loser = None

        self.ready = {
            "left": False,
            "right": False
        }

    async def wait_players(self):
        """
        Wait for both players to be ready.
        """
        timeout = 60  # seconds
        for i in range(timeout * 10):
            if self.ready["left"] and self.ready["right"]:
                return "start"
            await asyncio.sleep(0.1)
        
        if not self.ready["left"] or not self.ready["right"]:
            self.game_over = True
            return "aborted"
        if self.ready["left"] or self.ready["right"]:
            self.winner = self.left_player if self.ready["left"] else self.right_player
            self.loser = self.right_player if self.ready["left"] else self.left_player
            self.game_over = True
            return "finished_walkover"
        


    async def process_input(self, client, input_data):
        """
        Process input from a player.
        """
        if not self.game_loop_running:
            print(f"Processing input from {client}: {input_data}")
            if input_data.get("action") == "move":
                if client == "left":
                    self.ready["left"] = True
                    print("Left player is ready.")
                elif client == "right":
                    self.ready["right"] = True
                    print("Right player is ready.")
            return

        paddle_speed = 8
        if input_data.get("action") == "move":
            direction = input_data.get("direction")
            if client == "left" and direction == "up" and self.state["left_paddle"]["y"] > 0:
                self.state["left_paddle"]["y"] -= paddle_speed
            elif client == "left" and direction == "down" and self.state["left_paddle"]["y"] < self.GAME_HEIGHT - self.PADDLE_HEIGHT:
                self.state["left_paddle"]["y"] += paddle_speed
            elif client == "right" and direction == "up" and self.state["right_paddle"]["y"] > 0:
                self.state["right_paddle"]["y"] -= paddle_speed
            elif client == "right" and direction == "down" and self.state["right_paddle"]["y"] < self.GAME_HEIGHT - self.PADDLE_HEIGHT:
                self.state["right_paddle"]["y"] += paddle_speed

    async def update_game_state(self):
        """
        Update game logic: ball position, collisions, scores.
        """
        if self.game_over:
            return

        ball = self.state["ball"]

        # Update ball position
        ball["x"] += ball["dx"]
        ball["y"] += ball["dy"]

        # Collision with top and bottom walls
        if ball["y"] <= 0 or ball["y"] >= self.GAME_HEIGHT - self.BALL_RADIUS:
            ball["dy"] = -ball["dy"]

        # Collision with paddles
        if (
            ball["x"] <= self.PADDLE_WIDTH
            and self.state["left_paddle"]["y"] <= ball["y"] <= self.state["left_paddle"]["y"] + self.PADDLE_HEIGHT
        ):
            ball["dx"] = -ball["dx"]
            offset = (ball["y"] - self.state["left_paddle"]["y"]) - (self.PADDLE_HEIGHT // 2)
            ball["dy"] = offset // 10

        if (
            ball["x"] >= self.GAME_WIDTH - self.PADDLE_WIDTH - self.BALL_RADIUS
            and self.state["right_paddle"]["y"] <= ball["y"] <= self.state["right_paddle"]["y"] + self.PADDLE_HEIGHT
        ):
            ball["dx"] = -ball["dx"]
            offset = (ball["y"] - self.state["right_paddle"]["y"]) - (self.PADDLE_HEIGHT // 2)
            ball["dy"] = offset // 10

        # Handle scoring
        if ball["x"] < 0:
            self.state["right_score"] += 1
            self.reset_ball()
        elif ball["x"] > self.GAME_WIDTH:
            self.state["left_score"] += 1
            self.reset_ball()
        if self.state["left_score"] >= self.WINNING_SCORE or self.state["right_score"] >= self.WINNING_SCORE:
            if self.state["left_score"] >= self.WINNING_SCORE:
                self.winner = self.left_player
                self.loser = self.right_player
            else:
                self.winner = self.right_player
                self.loser = self.left_player
            self.game_over = True

    def reset_ball(self):
        """
        Reset the ball's position to the center.
        """
        self.state["ball"] = {"x": self.GAME_WIDTH // 2, "y": self.GAME_HEIGHT // 2, "dx": 6, "dy": 0}

    async def broadcast_state(self):
        """
        Broadcast the updated game state to all connected clients.
        """
        disconnected_clients = []
        for client in self.clients:
            try:
                await client.send_json({
                "type": "game_state",
                "state": self.state
            })
            except:
                print(f"Client {client} disconnected.")
                disconnected_clients.append(client)

        # Rimuove i client disconnessi dalla lista
        for client in disconnected_clients:
            self.clients.remove(client)
