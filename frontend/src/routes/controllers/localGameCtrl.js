export class LocalGameCtrl {
    constructor() {
        this.titleSuffix = "Local Game";
        this.canvas = null;
        this.ctx = null;
        this.paddleWidth = 20;
        this.paddleHeight = 70;
        this.ballRadius = 10;
        this.paddleSpeed = 8;
        this.gameOver = false;
        this.pointsToWin = 5;
        this.lastScored = 0;
        this.waitingToStart = true;
        this.debugStat = false;
        
        // Proprietà per l'effetto fuoco
        this.fireThreshold = 15;
        this.fireParticles = [];
        this.fireAnimationTime = 0;
        
        // Controlli per i giocatori
        this.player1Keys = { up: false, down: false }; // W, S
        this.player2Keys = { up: false, down: false }; // ArrowUp, ArrowDown
        
        // Stati di ready dei giocatori
        this.player1Ready = false;
        this.player2Ready = false;
        
        // Event handlers per cleanup
        this.keydownHandler = null;
        this.keyupHandler = null;
        this.escapeKeydownHandler = null;
        
        // Game state
        this.state = {
            ball: { x: 400, y: 300, dx: -6, dy: 0.1 },
            leftPaddle: { y: 250 },
            rightPaddle: { y: 250 },
            leftScore: 0,
            rightScore: 0,
        };
    }

    async init() {
        console.log("Local Game Controller");
        
        this.initializeCanvas();
        this.inputListeners();
        this.gameLoop();
    }

    initializeCanvas() {
        this.canvas = document.getElementById("localGameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Aggiungi solo il bordo bianco, senza background nero
        this.canvas.style.border = "2px solid white";
    }

    inputListeners() {
        // Salva i riferimenti ai listener per poterli rimuovere dopo
        this.keydownHandler = (event) => {
            // Player 1 (Left) - W/S - Check ready state
            if ((event.key === "w" || event.key === "W") && this.waitingToStart) {
                if (!this.player1Ready) {
                    this.player1Ready = true;
                    document.getElementById("leftIsReady").classList.remove("visually-hidden");
                    this.checkBothPlayersReady();
                }
                this.player1Keys.up = true;
            }
            if ((event.key === "s" || event.key === "S") && this.waitingToStart) {
                if (!this.player1Ready) {
                    this.player1Ready = true;
                    document.getElementById("leftIsReady").classList.remove("visually-hidden");
                    this.checkBothPlayersReady();
                }
                this.player1Keys.down = true;
            }
            
            // Player 2 (Right) - Arrow Keys - Check ready state
            if (event.key === "ArrowUp" && this.waitingToStart) {
                if (!this.player2Ready) {
                    this.player2Ready = true;
                    document.getElementById("rightIsReady").classList.remove("visually-hidden");
                    this.checkBothPlayersReady();
                }
                this.player2Keys.up = true;
            }
            if (event.key === "ArrowDown" && this.waitingToStart) {
                if (!this.player2Ready) {
                    this.player2Ready = true;
                    document.getElementById("rightIsReady").classList.remove("visually-hidden");
                    this.checkBothPlayersReady();
                }
                this.player2Keys.down = true;
            }
            
            // Durante il gioco (non waiting)
            if (!this.waitingToStart) {
                if (event.key === "w" || event.key === "W") {
                    this.player1Keys.up = true;
                }
                if (event.key === "s" || event.key === "S") {
                    this.player1Keys.down = true;
                }
                if (event.key === "ArrowUp") {
                    this.player2Keys.up = true;
                }
                if (event.key === "ArrowDown") {
                    this.player2Keys.down = true;
                }
            }
        };

        this.keyupHandler = (event) => {
            // Player 1 (Left) - W/S
            if (event.key === "w" || event.key === "W") {
                this.player1Keys.up = false;
            }
            if (event.key === "s" || event.key === "S") {
                this.player1Keys.down = false;
            }
            
            // Player 2 (Right) - Arrow Keys
            if (event.key === "ArrowUp") {
                this.player2Keys.up = false;
            }
            if (event.key === "ArrowDown") {
                this.player2Keys.down = false;
            }
        };

        document.addEventListener("keydown", this.keydownHandler);
        document.addEventListener("keyup", this.keyupHandler);
    }

    exitInputListener() {
        this.escapeKeydownHandler = (event) => {
            if (event.key === "Escape" && this.gameOver) {
                this.cleanup();
                window.location.hash = "#playMenu";
            }
        };

        document.addEventListener("keydown", this.escapeKeydownHandler);
    }

    checkBothPlayersReady() {
        if (this.player1Ready && this.player2Ready) {
            // Entrambi i giocatori sono pronti, inizia il gioco
            this.waitingToStart = false;
            
            // Nascondi le icone "Ready" dopo un breve delay
            setTimeout(() => {
                document.getElementById("leftIsReady").classList.add("visually-hidden");
                document.getElementById("rightIsReady").classList.add("visually-hidden");
            }, 1000);
        }
    }

    updatePlayers() {
        // Player 1 (Left paddle)
        if (this.player1Keys.up && this.state.leftPaddle.y > 0) {
            this.state.leftPaddle.y -= this.paddleSpeed;
        }
        if (this.player1Keys.down && this.state.leftPaddle.y < this.canvas.height - this.paddleHeight) {
            this.state.leftPaddle.y += this.paddleSpeed;
        }
        
        // Player 2 (Right paddle)
        if (this.player2Keys.up && this.state.rightPaddle.y > 0) {
            this.state.rightPaddle.y -= this.paddleSpeed;
        }
        if (this.player2Keys.down && this.state.rightPaddle.y < this.canvas.height - this.paddleHeight) {
            this.state.rightPaddle.y += this.paddleSpeed;
        }
    }

    gameLoop() {
        if (this.gameOver) {
            this.gameOverScreen();
            return;
        }
        if (!this.waitingToStart) {
            this.updatePlayers();
            this.update();
        }
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.gameOver) return;
        this.updateBall();
        this.updateFireParticles();
    }

    updateBall() {
        const ball = this.state.ball;
        const steps = Math.ceil(Math.max(Math.abs(ball.dx), Math.abs(ball.dy)) / this.ballRadius);
        const dxStep = ball.dx / steps;
        const dyStep = ball.dy / steps;

        for (let i = 0; i < steps; i++) {
            const prevX = ball.x;
            const prevY = ball.y;

            ball.x += dxStep;
            ball.y += dyStep;

            this.handleInterpolatedPaddleCollision(prevX, ball.x, ball.y);
            this.handleWallCollisions();
            this.checkScoreInterpolated(prevX, ball.x);
        }
    }

    handleInterpolatedPaddleCollision(prevX, currX, y) {
        const ball = this.state.ball;

        // Left paddle
        if (
            prevX - this.ballRadius > this.paddleWidth &&
            currX - this.ballRadius <= this.paddleWidth &&
            this.isYOverlappingWithPaddle(y, this.state.leftPaddle.y)
        ) {
            ball.x = this.paddleWidth + this.ballRadius;
            this.handlePaddleBounce(ball, this.state.leftPaddle.y);
        }

        // Right paddle
        if (
            prevX + this.ballRadius < this.canvas.width - this.paddleWidth &&
            currX + this.ballRadius >= this.canvas.width - this.paddleWidth &&
            this.isYOverlappingWithPaddle(y, this.state.rightPaddle.y)
        ) {
            ball.x = this.canvas.width - this.paddleWidth - this.ballRadius;
            this.handlePaddleBounce(ball, this.state.rightPaddle.y);
        }

        this.limitBallSpeed();
    }

    isYOverlappingWithPaddle(ballY, paddleY) {
        return (
            ballY + this.ballRadius >= paddleY &&
            ballY - this.ballRadius <= paddleY + this.paddleHeight
        );
    }

    handlePaddleBounce(ball, paddleY) {
        const paddleCenter = paddleY + this.paddleHeight / 2;
        const relativeIntersectY = ball.y - paddleCenter;
        let normalizedIntersectY = relativeIntersectY / (this.paddleHeight / 2);
        normalizedIntersectY = Math.max(Math.min(normalizedIntersectY, 0.7), -0.7);

        const maxBounceAngle = Math.PI / 6;
        const bounceAngle = normalizedIntersectY * maxBounceAngle;
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 1.10;
        const direction = ball.dx > 0 ? -1 : 1;

        ball.dx = direction * speed * Math.cos(bounceAngle);
        ball.dy = speed * Math.sin(bounceAngle);

        const minDy = 1.0;
        if (Math.abs(ball.dy) < minDy) {
            ball.dy = ball.dy < 0 ? -minDy : minDy;
        }
    }

    limitBallSpeed() {
        const maxSpeed = 40;
        const ball = this.state.ball;
        ball.dx = Math.sign(ball.dx) * Math.min(Math.abs(ball.dx), maxSpeed);
        ball.dy = Math.sign(ball.dy) * Math.min(Math.abs(ball.dy), maxSpeed);
    }

    handleWallCollisions() {
        const ball = this.state.ball;

        if (ball.y - this.ballRadius < 0) {
            ball.y = this.ballRadius;
            ball.dy = Math.abs(ball.dy);
        }

        if (ball.y + this.ballRadius > this.canvas.height) {
            ball.y = this.canvas.height - this.ballRadius;
            ball.dy = -Math.abs(ball.dy);
        }
    }

    checkScoreInterpolated(prevX, currX) {
        if (prevX >= 0 && currX < 0) {
            this.state.rightScore++;
            this.lastScored = 1;
            this.checkGameOver(1);
        } else if (prevX <= this.canvas.width && currX > this.canvas.width) {
            this.state.leftScore++;
            this.lastScored = 0;
            this.checkGameOver(0);
        }
    }

    checkGameOver(scorer) {
        if (this.state.rightScore >= this.pointsToWin || this.state.leftScore >= this.pointsToWin) {
            this.gameOver = true;
        } else {
            this.lastScored = scorer;
            this.resetBall();
        }
    }

    resetBall() {
        const ball = this.state.ball;
        ball.x = this.canvas.width / 2;
        ball.y = this.canvas.height / 2;
        ball.dx = this.lastScored === 1 ? -6 : 6;
        ball.dy = 0.1;

        this.state.leftPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;
        this.state.rightPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;
    }

    getBallSpeed() {
        const ball = this.state.ball;
        return Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    }

    isBallOnFire() {
        return this.getBallSpeed() >= this.fireThreshold;
    }

    updateFireParticles() {
        this.fireAnimationTime += 0.1;
        const currentlyOnFire = this.isBallOnFire();
        
        this.wasOnFire = currentlyOnFire;
        
        if (currentlyOnFire) {
            const ball = this.state.ball;
            const speed = this.getBallSpeed();
            const numParticles = Math.min(2 + Math.floor(speed / 8), 6);
            
            for (let i = 0; i < numParticles; i++) {
                const angle = Math.atan2(ball.dy, ball.dx) + Math.PI;
                const distance = this.ballRadius + Math.random() * 5;
                const offsetAngle = (Math.random() - 0.5) * Math.PI * 0.5;
                
                this.fireParticles.push({
                    x: ball.x + Math.cos(angle + offsetAngle) * distance,
                    y: ball.y + Math.sin(angle + offsetAngle) * distance,
                    dx: Math.cos(angle + offsetAngle) * (1 + Math.random()) - ball.dx * 0.05,
                    dy: Math.sin(angle + offsetAngle) * (1 + Math.random()) - ball.dy * 0.05,
                    life: 1.0,
                    size: Math.random() * 3 + 1.5
                });
            }
        }
        
        this.fireParticles = this.fireParticles.filter(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.dy += 0.1;
            particle.life -= 0.04;
            particle.size *= 0.97;
            return particle.life > 0 && particle.size > 0.5;
        });
        
        if (this.fireParticles.length > 80) {
            this.fireParticles = this.fireParticles.slice(-80);
        }
    }

    draw() {
        this.clearCanvas();
        this.drawBall();
        this.drawPaddles();
        this.drawScores();
        this.drawNet();
        this.drawStartMessage();
        this.updateScoreDisplay();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBall() {
        const ball = this.state.ball;
        const currentSpeed = this.getBallSpeed();
        const isBlueFire = currentSpeed >= 35;
        
        if (this.isBallOnFire()) {
            this.drawFireParticles();
            this.drawFireGlow(ball);
        }
        
        if (isBlueFire) {
            this.ctx.fillStyle = "#E6F3FF";
        } else if (this.isBallOnFire()) {
            this.ctx.fillStyle = "#FFE4B5";
        } else {
            this.ctx.fillStyle = "white";
        }
        
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        if (this.isBallOnFire()) {
            this.ctx.strokeStyle = isBlueFire ? "#4169E1" : "#FF6B35";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawFireParticles() {
        const currentSpeed = this.getBallSpeed();
        const isBlueFire = currentSpeed >= 35;
        
        for (const particle of this.fireParticles) {
            const life = particle.life;
            let red, green, blue, alpha;
            
            if (isBlueFire) {
                if (life > 0.7) {
                    red = Math.floor(200 * life);
                    green = Math.floor(220 * life);
                    blue = 255;
                    alpha = life;
                } else if (life > 0.4) {
                    red = Math.floor(100 * (life / 0.7));
                    green = Math.floor(150 * (life / 0.7));
                    blue = 255;
                    alpha = life;
                } else {
                    red = 0;
                    green = 0;
                    blue = Math.floor(255 * (life / 0.4));
                    alpha = life * 0.8;
                }
            } else {
                if (life > 0.7) {
                    red = 255;
                    green = Math.floor(255 * life);
                    blue = Math.floor(100 * life);
                    alpha = life;
                } else if (life > 0.4) {
                    red = 255;
                    green = Math.floor(165 * (life / 0.7));
                    blue = 0;
                    alpha = life;
                } else {
                    red = Math.floor(255 * (life / 0.4));
                    green = 0;
                    blue = 0;
                    alpha = life * 0.8;
                }
            }
            
            this.ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawFireGlow(ball) {
        const currentSpeed = this.getBallSpeed();
        const isBlueFire = currentSpeed >= 35;
        
        const glowRadius = this.ballRadius + 15;
        const gradient = this.ctx.createRadialGradient(
            ball.x, ball.y, this.ballRadius,
            ball.x, ball.y, glowRadius
        );
        
        if (isBlueFire) {
            gradient.addColorStop(0, "rgba(173, 216, 255, 0.4)");
            gradient.addColorStop(0.5, "rgba(0, 100, 255, 0.3)");
            gradient.addColorStop(1, "rgba(0, 0, 255, 0.0)");
        } else {
            gradient.addColorStop(0, "rgba(255, 165, 0, 0.3)");
            gradient.addColorStop(0.5, "rgba(255, 69, 0, 0.2)");
            gradient.addColorStop(1, "rgba(255, 0, 0, 0.0)");
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPaddles() {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, this.state.leftPaddle.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(
            this.canvas.width - this.paddleWidth,
            this.state.rightPaddle.y,
            this.paddleWidth,
            this.paddleHeight
        );
    }

    drawScores() {
        this.ctx.font = "30px 'pong-score', sans-serif";
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.state.leftScore, 200, 50);
        this.ctx.fillText(this.state.rightScore, 600, 50);
    }

    drawNet() {
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        if (this.waitingToStart) {
            const textY = this.canvas.height / 3;
            const gapHeight = 30;
            const gapTop = textY - gapHeight / 2;
            const gapBottom = textY + gapHeight / 2;
            
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, gapTop);
            
            this.ctx.moveTo(this.canvas.width / 2, gapBottom);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        } else {
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        }
        
        this.ctx.stroke();
    }

    drawStartMessage() {
        if (this.waitingToStart) {
            this.ctx.font = "25px Arial";
            this.ctx.fillStyle = "grey";
            this.ctx.textAlign = "center";
            this.ctx.zIndex = 1000;
            if (Math.floor(Date.now() / 1000) % 2 === 0) {
                if (!this.player1Ready && !this.player2Ready) {
                    this.ctx.fillText("Player 1: W/S - Player 2: ↑/↓", this.canvas.width / 2, this.canvas.height / 3);
                } else if (this.player1Ready && !this.player2Ready) {
                    this.ctx.fillText("Waiting for Player 2...", this.canvas.width / 2, this.canvas.height / 3);
                } else if (!this.player1Ready && this.player2Ready) {
                    this.ctx.fillText("Waiting for Player 1...", this.canvas.width / 2, this.canvas.height / 3);
                } else {
                    this.ctx.fillText("Both players ready! Starting...", this.canvas.width / 2, this.canvas.height / 3);
                }
            }
        }
    }

    updateScoreDisplay() {
        // Aggiorna i punteggi nell'HTML
        const leftScoreElement = document.getElementById("leftScore");
        const rightScoreElement = document.getElementById("rightScore");
        
        if (leftScoreElement) {
            leftScoreElement.textContent = this.state.leftScore;
        }
        if (rightScoreElement) {
            rightScoreElement.textContent = this.state.rightScore;
        }
    }

    gameOverScreen() {
        this.exitInputListener(); // Attiva il listener per ESC
        let start = null;
        let duration = 1500;

        let canvas = this.canvas;
        
        let scoreStartY = 50;
        let targetY = canvas.height / 2 - 100;
        
        let startFontSize = 30;
        let endFontSize = 80;

        const animate = (timestamp) => {
            if (!start) start = timestamp;
            let progress = Math.min((timestamp - start) / duration, 1);
            let ctx = this.ctx;
            let winnerName = this.state.leftScore > this.state.rightScore ? "Player 1 Wins" : "Player 2 Wins";
            
            let currentY = scoreStartY + (targetY - scoreStartY) * progress;
            let fontSize = startFontSize + (endFontSize - startFontSize) * progress;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = "center";
            ctx.fillStyle = "white";
            ctx.font = `${fontSize}px 'pong-score', sans-serif`;

            ctx.fillText(this.state.leftScore, canvas.width / 4, currentY);
            ctx.fillText(this.state.rightScore, 3 * canvas.width / 4, currentY);

            if (progress >= 1) {
                ctx.font = "60px Arial";
                ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 + 20);

                ctx.font = "40px Arial";
                ctx.fillText(`${winnerName}!`, canvas.width / 2, canvas.height / 2 + 80);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                ctx.font = "25px Arial";
                ctx.fillStyle = "grey";
                ctx.fillText("Press ESC to go back", 400, 500);
            }
        };

        requestAnimationFrame(animate);
    }

    cleanup() {
        console.log("LocalGameController cleanup started");
        
        // Rimuovi i listener per i movimenti
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
            this.keydownHandler = null;
        }
        if (this.keyupHandler) {
            document.removeEventListener("keyup", this.keyupHandler);
            this.keyupHandler = null;
        }
        
        // Rimuovi il listener per Escape
        if (this.escapeKeydownHandler) {
            document.removeEventListener("keydown", this.escapeKeydownHandler);
            this.escapeKeydownHandler = null;
        }
        
        // Ferma il game loop
        this.gameOver = true;
        
        // Nascondi le icone "Ready" se visibili
        const leftReady = document.getElementById("leftIsReady");
        const rightReady = document.getElementById("rightIsReady");
        if (leftReady) {
            leftReady.classList.add("visually-hidden");
        }
        if (rightReady) {
            rightReady.classList.add("visually-hidden");
        }
        
        // Reset delle variabili di stato
        this.player1Keys = { up: false, down: false };
        this.player2Keys = { up: false, down: false };
        this.player1Ready = false;
        this.player2Ready = false;
        
        // Pulisci l'effetto fuoco
        this.fireParticles = [];
        this.fireAnimationTime = 0;
        
        console.log("LocalGameController cleanup completed");
    }
}
