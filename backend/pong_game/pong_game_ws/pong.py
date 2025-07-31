import asyncio
import json

import math

class PongGame:
    GAME_WIDTH = 800
    GAME_HEIGHT = 600
    PADDLE_HEIGHT = 70
    PADDLE_WIDTH = 20
    BALL_RADIUS = 10
    WINNING_SCORE = 5
    MAX_SPEED = 40
    SPEED_INCREASE_FACTOR = 1.10

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
        
        # Initialize ball with randomized direction
        self.reset_ball()


    async def process_input(self, client, input_data):
        """
        Process input from a player with enhanced paddle movement.
        """
        if not self.game_loop_running:
            print(f"Processing input from {client}: {input_data}")
            if input_data.get("action") == "move":
                if client == "left":
                    self.ready["left"] = True
                elif client == "right":
                    self.ready["right"] = True
            return

        # Enhanced paddle speed for more responsive gameplay
        paddle_speed = 12
        if input_data.get("action") == "move":
            direction = input_data.get("direction")
            
            # Left paddle movement with boundary checking
            if client == "left":
                if direction == "up" and self.state["left_paddle"]["y"] > 0:
                    self.state["left_paddle"]["y"] = max(0, self.state["left_paddle"]["y"] - paddle_speed)
                elif direction == "down" and self.state["left_paddle"]["y"] < self.GAME_HEIGHT - self.PADDLE_HEIGHT:
                    self.state["left_paddle"]["y"] = min(self.GAME_HEIGHT - self.PADDLE_HEIGHT, 
                                                        self.state["left_paddle"]["y"] + paddle_speed)
            
            # Right paddle movement with boundary checking
            elif client == "right":
                if direction == "up" and self.state["right_paddle"]["y"] > 0:
                    self.state["right_paddle"]["y"] = max(0, self.state["right_paddle"]["y"] - paddle_speed)
                elif direction == "down" and self.state["right_paddle"]["y"] < self.GAME_HEIGHT - self.PADDLE_HEIGHT:
                    self.state["right_paddle"]["y"] = min(self.GAME_HEIGHT - self.PADDLE_HEIGHT, 
                                                        self.state["right_paddle"]["y"] + paddle_speed)

    async def update_game_state(self):
        """
        Update game logic with advanced ball physics: interpolated movement, collisions, scores.
        """
        if self.game_over:
            return

        ball = self.state["ball"]
        
        # Use interpolated movement for smooth collision detection
        self.update_ball_with_interpolation()
        
        # Handle scoring after ball update
        if ball["x"] < -self.BALL_RADIUS:
            self.state["right_score"] += 1
            self.reset_ball("left")  # Ball goes to left player (who lost the point)
            self.reset_paddles()
        elif ball["x"] > self.GAME_WIDTH + self.BALL_RADIUS:
            self.state["left_score"] += 1
            self.reset_ball("right")  # Ball goes to right player (who lost the point)
            self.reset_paddles()

        # Check for game over
        if self.state["left_score"] >= self.WINNING_SCORE or self.state["right_score"] >= self.WINNING_SCORE:
            self.game_over = True
            self.winner = self.left_player if self.state["left_score"] >= self.WINNING_SCORE else self.right_player
            self.loser = self.right_player if self.state["left_score"] >= self.WINNING_SCORE else self.left_player

    def update_ball_with_interpolation(self):
        """
        Update ball position with interpolation for smooth collision detection.
        """
        ball = self.state["ball"]
        
        # Calculate steps for interpolation based on ball speed
        steps = max(1, int(max(abs(ball["dx"]), abs(ball["dy"])) / self.BALL_RADIUS))
        dx_step = ball["dx"] / steps
        dy_step = ball["dy"] / steps
        
        for i in range(steps):
            prev_x = ball["x"]
            prev_y = ball["y"]
            
            # Update position incrementally
            ball["x"] += dx_step
            ball["y"] += dy_step
            
            # Check for paddle collisions with interpolation
            self.handle_interpolated_paddle_collision(prev_x, ball["x"], ball["y"])
            
            # Handle wall collisions
            self.handle_wall_collisions()

    def handle_interpolated_paddle_collision(self, prev_x, curr_x, ball_y):
        """
        Handle paddle collisions with interpolated positions for accuracy.
        """
        ball = self.state["ball"]
        
        # Left paddle collision
        if (prev_x - self.BALL_RADIUS > self.PADDLE_WIDTH and 
            curr_x - self.BALL_RADIUS <= self.PADDLE_WIDTH and
            self.is_y_overlapping_with_paddle(ball_y, self.state["left_paddle"]["y"])):
            
            # Position ball at paddle edge
            ball["x"] = self.PADDLE_WIDTH + self.BALL_RADIUS
            self.handle_sophisticated_paddle_bounce(ball_y, self.state["left_paddle"]["y"], "left")
        
        # Right paddle collision  
        elif (prev_x + self.BALL_RADIUS < self.GAME_WIDTH - self.PADDLE_WIDTH and
              curr_x + self.BALL_RADIUS >= self.GAME_WIDTH - self.PADDLE_WIDTH and
              self.is_y_overlapping_with_paddle(ball_y, self.state["right_paddle"]["y"])):
            
            # Position ball at paddle edge
            ball["x"] = self.GAME_WIDTH - self.PADDLE_WIDTH - self.BALL_RADIUS
            self.handle_sophisticated_paddle_bounce(ball_y, self.state["right_paddle"]["y"], "right")
        
        # Apply speed limiting after collision
        self.limit_ball_speed()

    def is_y_overlapping_with_paddle(self, ball_y, paddle_y):
        """
        Check if ball Y position overlaps with paddle.
        """
        return (ball_y + self.BALL_RADIUS >= paddle_y and 
                ball_y - self.BALL_RADIUS <= paddle_y + self.PADDLE_HEIGHT)

    def handle_sophisticated_paddle_bounce(self, ball_y, paddle_y, side):
        """
        Handle paddle bounce with sophisticated angle calculation.
        """
        ball = self.state["ball"]
        
        # Calculate relative intersection point
        paddle_center = paddle_y + self.PADDLE_HEIGHT / 2
        relative_intersect = ball_y - paddle_center
        
        # Normalize intersection (-0.7 to 0.7 to prevent extreme angles)
        normalized_intersect = max(min(relative_intersect / (self.PADDLE_HEIGHT / 2), 0.7), -0.7)
        
        # Calculate bounce angle (max 30 degrees)
        max_bounce_angle = math.pi / 6  # 30 degrees in radians
        bounce_angle = normalized_intersect * max_bounce_angle
        
        # Calculate current speed and increase it slightly
        current_speed = math.sqrt(ball["dx"]**2 + ball["dy"]**2) * self.SPEED_INCREASE_FACTOR
        
        # Set new velocity based on side and angle
        if side == "left":
            ball["dx"] = current_speed * math.cos(bounce_angle)
        else:  # right paddle
            ball["dx"] = -current_speed * math.cos(bounce_angle)
            
        ball["dy"] = current_speed * math.sin(bounce_angle)
        
        # Ensure minimum vertical velocity to avoid purely horizontal movement
        min_dy = 1.0
        if abs(ball["dy"]) < min_dy:
            ball["dy"] = min_dy if ball["dy"] >= 0 else -min_dy

    def handle_wall_collisions(self):
        """
        Handle collisions with top and bottom walls.
        """
        ball = self.state["ball"]
        
        # Top wall collision
        if ball["y"] - self.BALL_RADIUS < 0:
            ball["y"] = self.BALL_RADIUS
            ball["dy"] = abs(ball["dy"])  # Ensure downward movement
            
        # Bottom wall collision
        if ball["y"] + self.BALL_RADIUS > self.GAME_HEIGHT:
            ball["y"] = self.GAME_HEIGHT - self.BALL_RADIUS
            ball["dy"] = -abs(ball["dy"])  # Ensure upward movement

    def limit_ball_speed(self):
        """
        Limit ball speed to prevent it from becoming too fast.
        """
        ball = self.state["ball"]
        current_speed = math.sqrt(ball["dx"]**2 + ball["dy"]**2)
        
        if current_speed > self.MAX_SPEED:
            factor = self.MAX_SPEED / current_speed
            ball["dx"] *= factor
            ball["dy"] *= factor

    def get_ball_speed(self):
        """
        Get current ball speed for visual effects.
        """
        ball = self.state["ball"]
        return math.sqrt(ball["dx"]**2 + ball["dy"]**2)

    def reset_ball(self, towards_player=None):
        """
        Reset the ball's position to the center, directed towards the specified player.
        If no player specified, use random direction.
        """
        import random
        initial_speed = 6
        
        
        # Determine direction based on who should receive the ball
        if towards_player == "left":
            dx_direction = -1  # Ball goes towards left player
        elif towards_player == "right":
            dx_direction = 1   # Ball goes towards right player
        else:
            dx_direction = random.choice([-1, 1])  # Random direction for game start
        
        self.state["ball"] = {
            "x": self.GAME_WIDTH // 2, 
            "y": self.GAME_HEIGHT // 2, 
            "dx": initial_speed * dx_direction,
            "dy": 0
        }

    def reset_paddles(self):
        """
        Reset paddles to the center of the game area.
        """
        self.state["left_paddle"]["y"] = self.GAME_HEIGHT // 2 - self.PADDLE_HEIGHT // 2
        self.state["right_paddle"]["y"] = self.GAME_HEIGHT // 2 - self.PADDLE_HEIGHT // 2

