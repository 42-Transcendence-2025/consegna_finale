export class AI 
{
    constructor(game, difficulty) 
	{
        this.game = game;
		this.ball = game.state.ball;
		this.paddle = game.state.rightPaddle;
		this.prediction = game.canvas.height / 2; // Default prediction to center of canvas height
		this.exactPrediction = game.canvas.height / 2; // Exact prediction for AI
		this.lastAIUpdate = Date.now();
		this.lastPrediction = Date.now();
		this.previousBallDir = game.state.ball.dx;
		this.predictionLocked = false;
		const difficultyLevels = {
            easy: { AILevel: 120, maxLevel: 120, minLevel: 180 },
            medium: { AILevel: 100, maxLevel: 80, minLevel: 140 },
            hard: { AILevel: 50, maxLevel: 40, minLevel: 70 },
            impossible: { AILevel: 0, maxLevel: 11, minLevel: -11 },
        };

        const level = difficultyLevels[difficulty] || difficultyLevels.easy;
        this.AILevel = level.AILevel;
        this.maxLevel = level.maxLevel;
        this.minLevel = level.minLevel;
    }

    update()
	{
		const currentTime = Date.now();
		this.paddle = this.game.state.rightPaddle;

		if (this.previousBallDir !== this.ball.dx)
		{
			this.predictionLocked = false; // Unlock prediction for new trajectory
			this.previousBallDir = this.ball.dx;
		}

		if (currentTime - this.lastAIUpdate >= 1000)
		{
			this.ball = this.game.state.ball;
			this.lastAIUpdate = currentTime;
		}
		
		let paddleCenter = this.paddle.y + (this.game.paddleHeight / 2);
		if (this.ball.dx > 0)
		{
			if (currentTime - this.lastPrediction >= 1000 && !this.predictionLocked)
			{
				this.predictBallPosition();
				this.lastPrediction = currentTime;
				this.predictionLocked = true; // Lock prediction for the current trajectory

				// Angle the shot randomly for impossible AI
				if (this.AILevel < 40) {
					const upOrDown = Math.random() < 0.5 ? 0 : 1;
					if (upOrDown) {
						this.prediction += 15;
					}
					else {
						this.prediction -= 15;
					}
				}
			}
		}
		else if (this.ball.dx < 0 && this.AILevel < 40)
		{
			this.prediction = this.game.canvas.height / 2;
			this.exactPrediction = this.game.canvas.height / 2;
		}
		const tolerance = 5;
		if (this.prediction < (paddleCenter - tolerance))
		{
			this.moveUp();
		}
		else if (this.prediction > (paddleCenter + tolerance))
		{
			this.moveDown();
		}
    }

	moveUp()
	{
        if (this.game.state.rightPaddle.y > 0)
		{
            this.game.state.rightPaddle.y -= this.game.paddleSpeed;
        }
    }

    moveDown() 
	{
        if (this.game.state.rightPaddle.y < this.game.canvas.height - this.game.paddleHeight) 
		{
            this.game.state.rightPaddle.y += this.game.paddleSpeed;
        }
    }

	predictBallPosition()
	{
		let predictedY = this.ball.y;
		let predictedDy = this.ball.dy;
		let predictedX = this.ball.x;
		let predictedDx = this.ball.dx;

		while (predictedX < this.game.canvas.width - this.game.paddleWidth) 
		{
			predictedX += predictedDx;

			// Check for wall collisions and adjust direction
			if (predictedY + predictedDy < 0 || predictedY + predictedDy > this.game.canvas.height) 
			{
				predictedDy = -predictedDy;
			}

			predictedY += predictedDy;
		}

		this.prediction = predictedY;
		this.exactPrediction = predictedY;
		const closeness = (this.ball.dx < 0
			? this.ball.x - this.paddle.x
			: (this.game.canvas.width - this.ball.x)) / this.game.canvas.width;

		const error = this.AILevel * closeness;
	
		this.prediction += -error + (Math.random() * (error - (-error)));
	}
	
}
