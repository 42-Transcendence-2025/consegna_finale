/** @type {Controller} */
export class GameController {
    titleSuffix = "Game";


    init() {
        console.log("Game Controller");
        this.canvas = document.getElementById("onlineGameCanvas");
        this.ctx = this.canvas.getContext("2d");
		const gameContainer = document.getElementById("onlineGameContainer");
        this.canvas.width = 800;
        this.canvas.height = 600;
		this.paddleWidth = 20;
        this.paddleHeight = 70;
        this.ballRadius = 10;
		this.gameOver = false;
		this.winner = null;
		this.moveUp = false;
		this.moveDown = false;

		this.state = {
            ball: { x: 400, y: 300, dx: 1, dy: 1 },
            leftPaddle: { y: 250 },
            rightPaddle: { y: 250 },
            leftScore: 0,
            rightScore: 0,

			updateFromServer(gameState) {
				this.ball = gameState.ball;
				this.leftPaddle = gameState.left_paddle;
				this.rightPaddle = gameState.right_paddle;
				this.leftScore = gameState.left_score;
				this.rightScore = gameState.right_score;
			}
		};

		gameContainer.classList.remove("visually-hidden");
		this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw();
		// Recupera il game_id dal localStorage
		const gameId = localStorage.getItem("game_id");
		if (!gameId) {
			console.error("Game ID not found!");
			return;
		}
		this.pongManager = window.tools.pongManager;
		this.pongManager.connect(gameId);
		this.pongManager.on("onGameState", (gameState) => {
			this.state.updateFromServer(gameState);
		});

		this.pongManager.on("onGameOver", (gameState) => {
			this.gameOver = true;
			this.winner = gameState.winner;
		});

		this.pongManager.on("onPlayersUpdate", (gameState) => {
			this.leftPlayer = gameState.left_player;
			this.rightPlayer = gameState.right_player;
			this.leftPlayerThropies = gameState.left_player_trophies;
			this.rightPlayerThropies = gameState.right_player_trophies;
		});
		this.initInputListeners();
		this.gameLoop();
    }

	gameLoop() {
		if (this.gameOver) {
			this.gameOverScreen();
			return;
		}
		this.sendMoves();
		this.draw();
		requestAnimationFrame(this.gameLoop.bind(this)); // Recursive call for animation
	}

	sendMoves() {
		if (this.moveUp) {
			this.pongManager.sendMove("up");
		}
		
		if (this.moveDown) {
			this.pongManager.sendMove("down");
		}
	}



	draw() {
        this.clearCanvas();
        this.drawBall();
        this.drawPaddles();
        this.drawScores();
        this.drawNet();
		this.drawPlayerInfo();
        // this.drawStartMessage();
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

	drawNet() {
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
    }

	drawScores() {
        this.ctx.font = "30px 'pong-score', sans-serif";
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.state.leftScore, 200, 50);
        this.ctx.fillText(this.state.rightScore, 600, 50);
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
        const leftPlayerImgPath = "./assets/default_icons/goku.png";
		const rightPlayerImgPath = "./assets/default_icons/vegeta.png";

		const leftPlayerIcon = document.getElementById("leftPlayerIcon");
		const rightPlayerIcon = document.getElementById("rightPlayerIcon");

		leftPlayerIcon.innerHTML = `
		<img src="${leftPlayerImgPath}" 
		alt="Left Player">
		<div class="icon-label">${this.leftPlayer}</div>
		<div class="trophy-label">
			<i class="bi bi-trophy-fill" style="color: gold;"></i> ${this.leftPlayerThropies}
		</div>
		`;
		leftPlayerIcon.classList.remove("visually-hidden");

		rightPlayerIcon.innerHTML = `
		<img src="${rightPlayerImgPath}"
		alt="Right Player"
		<div class="icon-label">${this.rightPlayer}</div>
		<div class="trophy-label">
			<i class="bi bi-trophy-fill" style="color: gold;"></i> ${this.rightPlayerThropies}
		</div>
		`;
		rightPlayerIcon.classList.remove("visually-hidden");
    }

    initInputListeners()
	{
        document.addEventListener("keydown", (event) =>
		{
            if (event.key === "ArrowUp")
			{
				this.moveUp = true;
            }
			else if (event.key === "ArrowDown")
			{
				this.moveDown = true;
            }
			else if (event.key === "Escape" && this.gameOver)
			{
				this.#goBack();
			}
        });

		document.addEventListener("keyup", (event) =>
		{
			if (event.key === "ArrowUp")
			{
				this.moveUp = false;
			}
			else if (event.key === "ArrowDown")
			{
				this.moveDown = false;
			}
			else if (event.key === "Escape" && this.gameOver)
			{
				this.#goBack();
			}
		});
    }

	gameOverScreen() {
		let duration = 1500; // durata animazione in ms
		let canvas = this.canvas;
	
		// Posizioni iniziali
		let scoreStartY = 50;
	
		// Posizione finale (verticale)
		let targetY = canvas.height / 2 - 100;
	
		// Dimensioni del font
		let startFontSize = 30;
		let endFontSize = 80;
	
		const context = {
			start: null,
			duration,
			canvas,
			scoreStartY,
			targetY,
			startFontSize,
			endFontSize,
			game: this,
			winner: this.winner,
		};
	
		requestAnimationFrame((timestamp) => animateGameOver(timestamp, context));
	}

	#goBack() {
    	const tId = localStorage.getItem("currentTournamentId");
    	if (tId)
    	    window.location.hash = "#tournament";      // torna al bracket
    	else
    	    window.location.hash = "#privateMatch";    // caso normale
	}
}

function animateGameOver(timestamp, context) {
	const { start, duration, canvas, scoreStartY, targetY, startFontSize, endFontSize, game, winner } = context;

	if (!context.start) context.start = timestamp;
	let progress = Math.min((timestamp - context.start) / duration, 1);
	let ctx = game.ctx;

	// 2. Score animati
	let currentY = scoreStartY + (targetY - scoreStartY) * progress;
	let fontSize = startFontSize + (endFontSize - startFontSize) * progress;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.textAlign = "center";
	ctx.fillStyle = "white";
	ctx.font = `${fontSize}px 'pong-score', sans-serif`;

	// Sinistra
	ctx.fillText(game.state.leftScore, canvas.width / 4, currentY);
	// Destra
	ctx.fillText(game.state.rightScore, 3 * canvas.width / 4, currentY);

	// 3. Testo centrale
	if (progress >= 1) {
		ctx.font = "60px Arial";
		ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 + 20);

		ctx.font = "40px Arial";
		ctx.fillText(`${winner} ${$.i18n('wins')}!`, canvas.width / 2, canvas.height / 2 + 80);
	}

	if (progress < 1) {
		requestAnimationFrame((timestamp) => animateGameOver(timestamp, context));
	} else {
		ctx.font = "25px Arial";
		ctx.fillStyle = "grey";
		ctx.fillText($.i18n('pressEscToGoBack'), canvas.width / 2, canvas.height - 50);
	}

}
