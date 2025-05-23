export class PongGame {
    constructor() {
        this.initializeCanvas();
        this.initializeGameState();
        this.setupListeners();
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
        this.pointsToWin = 7;
        this.lastScored = 0;
        this.waitingToStart = true;
        this.gamePaused = false;
        this.debugStat = false;
    }

    // Setup all event listeners
    setupListeners() {
        this.setupStartListener();
        this.setupPauseListener();
        this.setupDebugStatListener();
    }

    setupStartListener() {
        document.addEventListener("keydown", (event) => {
            if (this.waitingToStart && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                this.waitingToStart = false; // Start the game
            }
        });
    }

    setupPauseListener() {
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.gamePaused = !this.gamePaused; // Toggle pause
            }
        });
    }

    setupDebugStatListener() {
        document.addEventListener("keydown", (event) => {
            if (event.key === "d") {
                this.debugStat = !this.debugStat; // Toggle debug mode
            }
        });
    }

    // Update the game state
    update(ai) {
        if (this.gameOver || this.gamePaused) return;

        this.updateBallPosition();
        this.handleWallCollisions();
        this.handlePaddleCollisions(ai);
        this.handleScoring(ai);
    }

    updateBallPosition() {
        const ball = this.state.ball;
        ball.x += ball.dx;
        ball.y += ball.dy;
    }

    handleWallCollisions() {
        const ball = this.state.ball;

        // Top and bottom wall collisions
        if (ball.y - this.ballRadius <= 0 || ball.y + this.ballRadius >= this.canvas.height) {
            ball.dy = -ball.dy;
            ball.y = Math.max(this.ballRadius, Math.min(this.canvas.height - this.ballRadius, ball.y));
        }
    }

    handlePaddleCollisions(ai) {
        const ball = this.state.ball;

        // Left paddle collision
        if (this.isBallCollidingWithLeftPaddle(ball)) {
            this.handlePaddleBounce(ball, this.state.leftPaddle.y);
        }

        // Right paddle collision
        if (this.isBallCollidingWithRightPaddle(ball)) {
            this.handlePaddleBounce(ball, this.state.rightPaddle.y);
        }

        // Limit ball speed
        this.limitBallSpeed();
    }

    isBallCollidingWithLeftPaddle(ball) {
        return (
            ball.dx < 0 &&
            ball.x - this.ballRadius <= this.paddleWidth &&
            ball.y + this.ballRadius >= this.state.leftPaddle.y &&
            ball.y - this.ballRadius <= this.state.leftPaddle.y + this.paddleHeight
        );
    }

    isBallCollidingWithRightPaddle(ball) {
        return (
            ball.dx > 0 &&
            ball.x + this.ballRadius >= this.canvas.width - this.paddleWidth &&
            ball.y + this.ballRadius >= this.state.rightPaddle.y &&
            ball.y - this.ballRadius <= this.state.rightPaddle.y + this.paddleHeight
        );
    }

    handlePaddleBounce(ball, paddleY) {
        ball.dx = -ball.dx * 1.05; // Increase speed slightly
        const offset = (ball.y - paddleY) - this.paddleHeight / 2;
        ball.dy = offset / 10;
    }

    limitBallSpeed() {
        const maxSpeed = 20;
        const ball = this.state.ball;
        ball.dx = Math.sign(ball.dx) * Math.min(Math.abs(ball.dx), maxSpeed);
        ball.dy = Math.sign(ball.dy) * Math.min(Math.abs(ball.dy), maxSpeed);
    }

    handleScoring(ai) {
        const ball = this.state.ball;

        if (ball.x < 0) {
            this.state.rightScore++;
            this.checkGameOver(ai, 1);
        } else if (ball.x > this.canvas.width) {
            this.state.leftScore++;
            this.checkGameOver(ai, 2);
        }
    }

    checkGameOver(ai, scorer) {
        if (this.state.rightScore >= this.pointsToWin || this.state.leftScore >= this.pointsToWin) {
            this.gameOver = true;
        } else {
            this.lastScored = scorer;
            this.resetBall(ai);
        }
    }

    resetBall(ai) {
        const ball = this.state.ball;
        ball.x = this.canvas.width / 2;
        ball.y = this.canvas.height / 2;
        ball.dx = this.lastScored === 1 ? -6 : 6; // Direction based on scorer
        ball.dy = Math.random() * 4 - 2; // Random angle

        this.state.leftPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;
        this.state.rightPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;

        this.adjustAIDifficulty(ai);
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
		playerIcon.innerHTML = `<img src="${playerImgPath}" alt="Player">`;
		playerIcon.classList.remove("visually-hidden");


		// AI Icon
		const aiIcon = document.getElementById("aiIcon");
		aiIcon.innerHTML = `<img src="${aiImgPath}" alt="AI">`;
		aiIcon.classList.remove("visually-hidden");
	}
}
