export class PongGame {
    constructor() {
        this.initializeCanvas();
        this.initializeGameState();
        this.inputListeners();
    }

    // Initialize the canvas and its context
    initializeCanvas() {
        this.canvas = document.getElementById("AIgameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.paddleWidth = 20;
        this.paddleHeight = 70;
        this.ballRadius = 10;
    }

    // Initialize the game state
    initializeGameState() {
        this.state = {
            ball: { x: 400, y: 300, dx: -6, dy: 0.1 },
            leftPaddle: { y: 250 },
            rightPaddle: { y: 250 },
            leftScore: 0,
            rightScore: 0,
        };

        this.paddleSpeed = 8;
        this.gameOver = false;
        this.pointsToWin = 5;
        this.lastScored = 0;
        this.waitingToStart = true;
        this.debugStat = false;
        
        // Proprietà per l'effetto fuoco
        this.fireThreshold = 15; // Velocità minima per attivare l'effetto fuoco (ridotta per più frequenza)
        this.fireParticles = []; // Array per le particelle di fuoco
        this.fireAnimationTime = 0; // Timer per l'animazione
    }

    // Setup all event listeners
    inputListeners() {
        document.addEventListener("keydown", (event) => {
            if (this.waitingToStart && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                this.waitingToStart = false; // Start the game
            }
            else if (event.key === "d") {
                this.debugStat = !this.debugStat; // Toggle debug mode
            }
            else if (event.key === "Escape" && !this.waitingToStart && this.gameOver) {
                window.location.reload(); // Reload the page to reset the game
            }
        });
        document.addEventListener("keyup", (event) => {
            if (event.key === "Escape" && !this.waitingToStart && this.gameOver) {
                window.location.reload(); // Reload the page to reset the game
            }
        });
    }

    update(ai) {
        if (this.gameOver) return;
        this.updateBall(ai);
        this.updateFireParticles(); // Aggiorna l'effetto fuoco
    }

    updateBall(ai) {
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
            this.checkScoreInterpolated(prevX, ball.x, ai);
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

        // Normalizza la posizione d'impatto da -1 a 1
        let normalizedIntersectY = relativeIntersectY / (this.paddleHeight / 2);

        // Limita leggermente la normalizzazione per evitare angoli troppo estremi
        normalizedIntersectY = Math.max(Math.min(normalizedIntersectY, 0.7), -0.7);

        // Angolo massimo di rimbalzo (in radianti) - 30 gradi
        const maxBounceAngle = Math.PI / 6;

        // Calcola angolo di rimbalzo proporzionale alla posizione d'impatto
        const bounceAngle = normalizedIntersectY * maxBounceAngle;

        // Calcola velocità totale della palla (modulo)
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 1.10; // aumenta leggermente la velocità

        // Direzione orizzontale invertita (la palla rimbalza)
        const direction = ball.dx > 0 ? -1 : 1;

        // Imposta nuova velocità con angolo calcolato
        ball.dx = direction * speed * Math.cos(bounceAngle);
        ball.dy = speed * Math.sin(bounceAngle);

        // Assicura un valore minimo assoluto di dy per evitare traiettorie quasi orizzontali
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

    checkScoreInterpolated(prevX, currX, ai) {
        if (prevX >= 0 && currX < 0) {
            this.state.rightScore++;
            this.lastScored = 1;
            this.checkGameOver(ai, 1);
        } else if (prevX <= this.canvas.width && currX > this.canvas.width) {
            this.state.leftScore++;
            this.lastScored = 0;
            this.checkGameOver(ai, 2);
        }
    }

    checkGameOver(ai, scorer) {
        if (this.state.rightScore >= this.pointsToWin
            || this.state.leftScore >= this.pointsToWin) {
            this.gameOver = true;
        } else {
            this.lastScored = scorer;
            this.resetBall();
            ai.prediction = this.canvas.height / 2; // Reset AI prediction
            ai.exactPrediction = this.canvas.height / 2; // Reset AI exact prediction
            ai.predictionLocked = false; // Unlock AI prediction
            this.adjustAIDifficulty(ai);            
        }
    }

    resetBall() {
        const ball = this.state.ball;
        ball.x = this.canvas.width / 2;
        ball.y = this.canvas.height / 2;
        ball.dx = this.lastScored === 1 ? -6 : 6; // Direction based on scorer
        ball.dy = 0.1;

        this.state.leftPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;
        this.state.rightPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;
    }

    adjustAIDifficulty(ai) {
        if (this.lastScored === 1 && ai.AILevel <= ai.minLevel) {
            ai.AILevel += 10;
        } else if (this.lastScored === 2 && ai.AILevel >= ai.maxLevel) {
            ai.AILevel -= 10;
        }
    }

    // Calcola la velocità attuale della pallina
    getBallSpeed() {
        const ball = this.state.ball;
        return Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    }

    // Verifica se la pallina è "infuocata"
    isBallOnFire() {
        return this.getBallSpeed() >= this.fireThreshold;
    }

    // Aggiorna le particelle di fuoco
    updateFireParticles() {
        this.fireAnimationTime += 0.1;
        const currentlyOnFire = this.isBallOnFire();
        
        this.wasOnFire = currentlyOnFire;
        
        if (currentlyOnFire) {
            // Genera nuove particelle di fuoco
            const ball = this.state.ball;
            const speed = this.getBallSpeed();
            const numParticles = Math.min(2 + Math.floor(speed / 8), 6); // Più veloce = più particelle (max 6)
            
            for (let i = 0; i < numParticles; i++) {
                // Posiziona le particelle dietro la pallina
                const angle = Math.atan2(ball.dy, ball.dx) + Math.PI; // Direzione opposta al movimento
                const distance = this.ballRadius + Math.random() * 5;
                const offsetAngle = (Math.random() - 0.5) * Math.PI * 0.5; // Dispersione
                
                this.fireParticles.push({
                    x: ball.x + Math.cos(angle + offsetAngle) * distance,
                    y: ball.y + Math.sin(angle + offsetAngle) * distance,
                    dx: Math.cos(angle + offsetAngle) * (1 + Math.random()) - ball.dx * 0.05,
                    dy: Math.sin(angle + offsetAngle) * (1 + Math.random()) - ball.dy * 0.05,
                    life: 1.0, // Vita della particella (1.0 = appena creata, 0.0 = morta)
                    size: Math.random() * 3 + 1.5
                });
            }
        }
        
        // Aggiorna e rimuovi particelle morte
        this.fireParticles = this.fireParticles.filter(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.dy += 0.1; // Leggera gravità verso l'alto (fuoco sale)
            particle.life -= 0.04; // Le particelle si spengono gradualmente
            particle.size *= 0.97; // Le particelle si rimpiccioliscono
            return particle.life > 0 && particle.size > 0.5;
        });
        
        // Limita il numero di particelle per performance
        if (this.fireParticles.length > 80) {
            this.fireParticles = this.fireParticles.slice(-80);
        }
    }

    // Draw the game state
    draw(preciseSpot, aimedSpot) {
        this.clearCanvas();
        this.drawBall();
        this.drawPaddles();
        this.drawScores();
        this.drawNet();
        this.drawDebugInfo(preciseSpot, aimedSpot);
        this.drawStartMessage();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBall() {
        const ball = this.state.ball;
        
        // Disegna le particelle di fuoco se la pallina è infuocata
        if (this.isBallOnFire()) {
            this.drawFireParticles();
            this.drawFireGlow(ball);
        }
        
        // Disegna la pallina
        this.ctx.fillStyle = this.isBallOnFire() ? "#FFE4B5" : "white"; // Colore più caldo quando infuocata
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Bordo più luminoso se infuocata
        if (this.isBallOnFire()) {
            this.ctx.strokeStyle = "#FF6B35";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawFireParticles() {
        const currentSpeed = this.getBallSpeed();
        const isBlueFire = currentSpeed >= 35; // Fiamme blu a velocità elevata
        
        for (const particle of this.fireParticles) {
            // Calcola il colore basato sulla vita della particella
            const life = particle.life;
            let red, green, blue, alpha;
            
            if (isBlueFire) {
                // Fiamme BLU per velocità >= 35
                if (life > 0.7) {
                    // Particelle giovani: bianco-blu
                    red = Math.floor(200 * life);
                    green = Math.floor(220 * life);
                    blue = 255;
                    alpha = life;
                } else if (life > 0.4) {
                    // Particelle medie: blu intenso
                    red = Math.floor(100 * (life / 0.7));
                    green = Math.floor(150 * (life / 0.7));
                    blue = 255;
                    alpha = life;
                } else {
                    // Particelle vecchie: blu scuro
                    red = 0;
                    green = 0;
                    blue = Math.floor(255 * (life / 0.4));
                    alpha = life * 0.8;
                }
            } else {
                // Fiamme ROSSE normali
                if (life > 0.7) {
                    // Particelle giovani: giallo-bianco
                    red = 255;
                    green = Math.floor(255 * life);
                    blue = Math.floor(100 * life);
                    alpha = life;
                } else if (life > 0.4) {
                    // Particelle medie: arancione
                    red = 255;
                    green = Math.floor(165 * (life / 0.7));
                    blue = 0;
                    alpha = life;
                } else {
                    // Particelle vecchie: rosso
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
        const isBlueFire = currentSpeed >= 35; // Fiamme blu a velocità elevata
        
        // Crea un effetto bagliore attorno alla pallina
        const glowRadius = this.ballRadius + 15;
        const gradient = this.ctx.createRadialGradient(
            ball.x, ball.y, this.ballRadius,
            ball.x, ball.y, glowRadius
        );
        
        if (isBlueFire) {
            // Bagliore BLU per velocità >= 35
            gradient.addColorStop(0, "rgba(173, 216, 255, 0.4)"); // Blu chiaro
            gradient.addColorStop(0.5, "rgba(0, 100, 255, 0.3)"); // Blu medio
            gradient.addColorStop(1, "rgba(0, 0, 255, 0.0)"); // Blu scuro
        } else {
            // Bagliore ROSSO normale
            gradient.addColorStop(0, "rgba(255, 165, 0, 0.3)"); // Arancione
            gradient.addColorStop(0.5, "rgba(255, 69, 0, 0.2)"); // Rosso-arancione
            gradient.addColorStop(1, "rgba(255, 0, 0, 0.0)"); // Rosso
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
        
        // Se stiamo aspettando l'inizio del gioco, creiamo un "buco" nella rete per il testo
        if (this.waitingToStart) {
            const textY = this.canvas.height / 3;
            const gapHeight = 30; // Altezza del buco nella rete
            const gapTop = textY - gapHeight / 2;
            const gapBottom = textY + gapHeight / 2;
            
            // Disegna la rete sopra il gap
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, gapTop);
            
            // Disegna la rete sotto il gap
            this.ctx.moveTo(this.canvas.width / 2, gapBottom);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        } else {
            // Disegna la rete completa durante il gioco
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        }
        
        this.ctx.stroke();
    }

    drawDebugInfo(preciseSpot, aimedSpot) {
        if (this.debugStat) {
            this.ctx.fillStyle = "red";
            this.ctx.fillRect(this.canvas.width - this.paddleWidth - 10, preciseSpot - 5, 10, 10);
            this.ctx.fillStyle = "yellow";
            this.ctx.fillRect(this.canvas.width - this.paddleWidth - 10, aimedSpot - 5, 10, 10);
            this.ctx.font = "16px Arial";
            this.ctx.fillStyle = "red";
            this.ctx.fillText("Precise Spot", this.canvas.width - this.paddleWidth - 120, preciseSpot + 5);
            this.ctx.fillStyle = "yellow";
            this.ctx.fillText("Aimed Spot", this.canvas.width - this.paddleWidth - 120, aimedSpot + 5);
        }
    }

    drawStartMessage() {
        if (this.waitingToStart) {
            this.ctx.font = "25px Arial";
            this.ctx.fillStyle = "grey";
            this.ctx.textAlign = "center";
            this.ctx.zIndex = 1000;
            if (Math.floor(Date.now() / 1000) % 2 === 0) {
                this.ctx.fillText($.i18n('pressArrowToStart'), this.canvas.width / 2, this.canvas.height / 3 + 8);
            }
        }
    }
}
