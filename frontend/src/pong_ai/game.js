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
            ball: { x: 400, y: 300, dx: -6, dy: 1 },
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
            ai.predction = ai.paddle.y + (this.paddleHeight / 2); // Reset AI prediction
            this.adjustAIDifficulty(ai);
        }
    }

    resetBall() {
        const ball = this.state.ball;
        ball.x = this.canvas.width / 2;
        ball.y = this.canvas.height / 2;
        ball.dx = this.lastScored === 1 ? -6 : 6; // Direction based on scorer
        ball.dy = 1; // Random angle

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

    // Draw the game state
    draw(preciseSpot, aimedSpot) {
        this.clearCanvas();
		this.drawPlayerInfo();
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
        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
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
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
    }

    drawDebugInfo(preciseSpot, aimedSpot) {
        if (this.debugStat) {
            this.ctx.fillStyle = "red";
            this.ctx.fillRect(this.canvas.width - this.paddleWidth - 10, preciseSpot - 5, 10, 10);
            this.ctx.fillStyle = "yellow";
            this.ctx.fillRect(this.canvas.width - this.paddleWidth - 10, aimedSpot - 5, 10, 10);
        }
    }

    drawStartMessage() {
        if (this.waitingToStart) {
            this.ctx.font = "25px Arial";
            this.ctx.fillStyle = "grey";
            if (Math.floor(Date.now() / 1000) % 2 === 0) {
                this.ctx.fillText("Press an arrow to start the game", 228, 250);
            }
        }
    }

	drawPlayerInfo() {
		const playerImgPath = "./assets/default_icons/goku.png";
		const aiImgPath = "./assets/default_icons/matt.png";

		// Player Icon
		const playerIcon = document.getElementById("playerIcon");
		playerIcon.innerHTML = `<img src="${playerImgPath}" alt="Player">
			<div class="icon-label">Player</div>
		`;
		playerIcon.classList.remove("visually-hidden");


		// AI Icon
		const aiIcon = document.getElementById("aiIcon");
		aiIcon.innerHTML = `<img src="${aiImgPath}" alt="AI">
			<div class="icon-label">Matt</div>
		`;
		aiIcon.classList.remove("visually-hidden");
	}
}
