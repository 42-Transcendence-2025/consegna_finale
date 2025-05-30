export class AIvsAIGame {
    constructor() {
        this.init();
    }

    init() {
        this.canvas = document.getElementById("AIvsAICanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.paddleWidth = 20;
        this.paddleHeight = 70;
        this.ballRadius = 10;
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
    }

    update() {
        if (this.gameOver) return;
        this.updateBall();
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

    checkScoreInterpolated(prevX, currX) {
        if (prevX >= 0 && currX < 0) {
            this.state.rightScore++;
            this.lastScored = 1;
            this.checkGameOver();
        } else if (prevX <= this.canvas.width && currX > this.canvas.width) {
            this.state.leftScore++;
            this.lastScored = 0;
            this.checkGameOver();
        }
    }

    checkGameOver() {
        if (
            this.state.leftScore >= this.pointsToWin ||
            this.state.rightScore >= this.pointsToWin
        ) {
            this.gameOver = true;
        } else {
            this.resetBall();
        }
    }

    resetBall() {
        this.state.ball.x = this.canvas.width / 2;
        this.state.ball.y = this.canvas.height / 2;
        this.state.ball.dx = this.lastScored === 0 ? -6 : 6;
        this.state.ball.dy = 1;
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

    // handlePaddleBounce(ball, paddleY) {
    //     ball.dx = -ball.dx * 1.05;
    //     const offset = (ball.y - paddleY) - this.paddleHeight / 2;
    //     ball.dy = offset / 10;
    // }

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

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawPlayerInfo();
        this.drawBall();
        this.drawPaddles();
        this.drawScores();
        this.drawNet();
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

    drawPlayerInfo() {
        // Left AI (Lucia)
        const leftIcon = document.getElementById("AILeftIcon");
        
        if (leftIcon){
            leftIcon.innerHTML = `<img src="./assets/default_icons/lucia.png" alt="Lucia">
                <div class="icon-label">Lucia (Pro)</div>
                <div class="trophy-label">
                    <i class="bi bi-trophy-fill" style="color: gold;"></i> 1000
                </div>
            `;
        }

        // Right AI (Matt)
        const rightIcon = document.getElementById("AIRightIcon");

        if (rightIcon) {
            rightIcon.innerHTML = `<img src="./assets/default_icons/matt.png" alt="Matt">
                <div class="icon-label">Matt (Pro)</div>
                <div class="trophy-label">
                    <i class="bi bi-trophy-fill" style="color: gold;"></i> 1000
                </div>
            `;
        }
    }
}
