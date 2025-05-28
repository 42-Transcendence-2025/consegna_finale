export class AIvsAI {
    constructor(game, side) {
        this.game = game;
        this.side = side; // 'left' or 'right'
        this.ball = game.state.ball;
        this.paddle = side === 'left' ? game.state.leftPaddle : game.state.rightPaddle;
        // Initialize prediction to the center of the canvas height
        this.prediction = this.game.canvas.height / 2;
        this.predictionLocked = false;
        this.lastBallDx = this.ball.dx;
        this.offset = this.game.paddleHeight / 2; // Default offset to aim center of paddle
    }

    update() {
        this.ball = this.game.state.ball;
        this.paddle = this.side === 'left' ? this.game.state.leftPaddle : this.game.state.rightPaddle;

        const ballIsMovingTowardsAI = (this.side === 'left' && this.ball.dx < 0) || (this.side === 'right' && this.ball.dx > 0);

        if (this.ball.dx !== this.lastBallDx) { // Ball direction changed
            this.predictionLocked = false; // Unlock prediction for new trajectory
            this.lastBallDx = this.ball.dx;
        }

        if (ballIsMovingTowardsAI) {
            // Ball is coming towards AI
            if (!this.predictionLocked) {
                this.predictBallPosition(); // Sets this.prediction to ball's impact Y
                this.offset = this.computeStrategicOffset(); // Sets this.offset for strategic hit
                this.predictionLocked = true;
            }
            // If predictionLocked is true, AI continues to use the existing (strategic) prediction and offset
            // for the current incoming ball trajectory.
        } else {
            // Ball is moving away from AI (or stationary horizontally)
            // AI should target center of the canvas to return to a neutral position.
            this.prediction = this.game.canvas.height / 2;
            this.offset = this.game.paddleHeight / 2; // Aim with the center of the paddle
            // predictionLocked is not changed here; it's reset when ball direction changes towards AI again.
        }

        // Movement logic: AI tries to align (this.paddle.y + this.offset) with this.prediction
        const currentHitPointY = this.paddle.y + this.offset;
        const tolerance = 5; 

        if (this.prediction < (currentHitPointY - tolerance)) {
            this.moveUp();
        } else if (this.prediction > (currentHitPointY + tolerance)) {
            this.moveDown();
        }
    }

    computeStrategicOffset() {
        const opponentPaddle = this.side === 'left'
            ? this.game.state.rightPaddle
            : this.game.state.leftPaddle;

        const opponentY = opponentPaddle.y + this.game.paddleHeight / 2;
        const canvasCenter = this.game.canvas.height / 2;

        // Obiettivo: mirare dalla parte opposta rispetto all'avversario
        const aimHigh = opponentY > canvasCenter;

        // Determina l'offset per colpire la palla in alto o in basso
        const impactZone = aimHigh
            ? this.game.paddleHeight * 0.25   // colpisci in basso per mandarla in alto
            : this.game.paddleHeight * 0.75;  // colpisci in alto per mandarla in basso

        // Aggiungi un piccolo random per evitare che sia sempre esattamente uguale
        const jitter = (Math.random() - 0.5) * 10; // ±5 pixel

        return Math.max(0, Math.min(this.game.paddleHeight, impactZone + jitter));
    }



    predictBallPosition() {
        
        let predictedY = this.ball.y;
        let predictedDy = this.ball.dy;
        let predictedX = this.ball.x;
        const currentBallDx = this.ball.dx; // Use the ball's current horizontal direction

        // If ball is not moving horizontally, predict center.
        if (currentBallDx === 0) {
            this.prediction = this.game.canvas.height / 2;
            return;
        }

        if (this.side === 'left') {
            // Left AI: if ball is moving away (right), do not change prediction, just return.
            if (currentBallDx > 0) { // Ball moving right, away from left paddle
                return; // Keep current prediction (stay in place)
            }

            // Ball is moving left (currentBallDx < 0). Predict Y when X reaches left paddle's edge.
            // Loop while ball is to the right of the left paddle's collision interface.
            const targetX = this.game.paddleWidth + this.game.ballRadius;
            while (predictedX > targetX && predictedX > 0) { // Ensure predictedX is decreasing and within bounds
                predictedX += currentBallDx;

                let nextPredictedY = predictedY + predictedDy;
                if (nextPredictedY - this.game.ballRadius < 0 || nextPredictedY + this.game.ballRadius > this.game.canvas.height) {
                    predictedDy = -predictedDy;
                }
                predictedY += predictedDy;
                // Safety break if somehow dx was not negative
                if (currentBallDx >=0) break;
            }
        } else { // this.side === 'right'
            // Right AI: if ball is moving away (left), do not change prediction, just return.
            if (currentBallDx < 0) { // Ball moving left, away from right paddle
                return; // Keep current prediction (stay in place)
            }

            // Ball is moving right (currentBallDx > 0). Predict Y when X reaches right paddle's edge.
            // Loop while ball is to the left of the right paddle's collision interface.
            const targetX = this.game.canvas.width - this.game.paddleWidth - this.game.ballRadius;
            while (predictedX < targetX && predictedX < this.game.canvas.width) { // Ensure predictedX is increasing and within bounds
                predictedX += currentBallDx;

                let nextPredictedY = predictedY + predictedDy;
                if (nextPredictedY - this.game.ballRadius < 0 || nextPredictedY + this.game.ballRadius > this.game.canvas.height) {
                    predictedDy = -predictedDy;
                }
                predictedY += predictedDy;
                // Safety break if somehow dx was not positive
                if (currentBallDx <= 0) break;
            }
        }
        this.prediction = predictedY;
    }

    moveUp() {
        if (this.paddle.y > 0) {
            this.paddle.y -= this.game.paddleSpeed;
        }
    }

    moveDown() {
        if (this.paddle.y < this.game.canvas.height - this.game.paddleHeight) {
            this.paddle.y += this.game.paddleSpeed;
        }
    }
}
