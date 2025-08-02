/** @type {Controller} */
export class GameController {
    titleSuffix = "Game";


    init() {
        // Pulisci eventuali listener residui da sessioni precedenti
        this.cleanup();
        
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
			alert("Game ID not found.");
			this.#goBack();
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
			localStorage.removeItem("game_id");
			
		});

		this.pongManager.on("onWaitReady", (data) => {
			this.startTimer();
		});

		this.pongManager.on("onPlayersReady", (data) => {
			this.playersReady(data);
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

	startTimer() {
		const timerElement = document.getElementById("readyTimer");
		const countdownElement = document.getElementById("timerCountdown");

		let countdown = 60; // 60 seconds countdown
		countdownElement.textContent = countdown;
		timerElement.classList.remove("visually-hidden");
		
		// Salva il riferimento per poterlo cancellare nel cleanup
		this.timerInterval = setInterval(() => {
			countdown -= 1;
			countdownElement.textContent = countdown;

			if (countdown <= 0) {
				clearInterval(this.timerInterval);
				timerElement.classList.add("visually-hidden");
			}
		}, 1000);
	}

	playersReady(data) {
		const leftReady = data.left_ready;
		const rightReady = data.right_ready;
		const leftReadyStatus = document.getElementById("leftIsReady");
		const rightReadyStatus = document.getElementById("rightIsReady");
		const timer = document.getElementById("readyTimer");

		console.log("[GameController] Players ready status:", leftReady, rightReady);
		

		if (leftReady) {
			leftReadyStatus.classList.remove("visually-hidden");
		}
		if (rightReady) {
			rightReadyStatus.classList.remove("visually-hidden");
		}

		if (leftReady && rightReady) {
			const rightReadyText = document.getElementById("timerInstruction");
			rightReadyText.classList.add("visually-hidden");
			leftReadyStatus.classList.add("visually-hidden");
			rightReadyStatus.classList.add("visually-hidden");
			timer.classList.add("visually-hidden");
		}
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

	drawPlayerInfo() {
		const rightPlayerIcon = document.getElementById("rightPlayerIcon");
		const rightPlayerImgPath = "./assets/default_icons/vegeta.png";
		rightPlayerIcon.src = rightPlayerImgPath;
		
		const rightPlayerName = document.getElementById("rightPlayerName");
		rightPlayerName.textContent = `${this.rightPlayer}`;
		
		const rightPlayerThropies = document.getElementById("rightPlayerThropies");
		rightPlayerThropies.textContent = `${this.rightPlayerThropies}`;

		const leftPlayerIcon = document.getElementById("leftPlayerIcon");
        const leftPlayerImgPath = "./assets/default_icons/goku.png";
		leftPlayerIcon.src = leftPlayerImgPath;

		const leftPlayerName = document.getElementById("leftPlayerName");
		leftPlayerName.textContent = `${this.leftPlayer}`;

		const leftPlayerThropies = document.getElementById("leftPlayerThropies");
		leftPlayerThropies.textContent = `${this.leftPlayerThropies}`;
    }

    initInputListeners()
	{
        // Salva i riferimenti ai listener per poterli rimuovere dopo
        this.keydownHandler = (event) => {
            if (event.key === "ArrowUp") {
                this.moveUp = true;
            } else if (event.key === "ArrowDown") {
                this.moveDown = true;
            }
        };

        this.keyupHandler = (event) => {
            if (event.key === "ArrowUp") {
                this.moveUp = false;
            } else if (event.key === "ArrowDown") {
                this.moveDown = false;
            }
        };

        document.addEventListener("keydown", this.keydownHandler);
        document.addEventListener("keyup", this.keyupHandler);
    }

	exitInputListener() {
		this.escapeKeydownHandler = (event) => {
			if (event.key === "Escape" && this.gameOver) {
				this.#goBack();
			}
		};

		this.escapeKeyupHandler = (event) => {
			if (event.key === "Escape" && this.gameOver) {
				this.#goBack();
			}
		};

		document.addEventListener("keydown", this.escapeKeydownHandler);
		document.addEventListener("keyup", this.escapeKeyupHandler);
	}

	gameOverScreen() {
		this.exitInputListener();
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
		this.cleanup(); // Pulisci prima di cambiare pagina
		
    	const tId = localStorage.getItem("currentTournamentId");
    	if (tId)
    	    window.location.hash = "#tournament";      // torna al bracket
    	else
    	    window.location.hash = "#onlineGame";    // caso normale
	}

	cleanup() {
		console.log("GameController cleanup started");
		
		// Rimuovi i listener per i movimenti
		if (this.keydownHandler) {
			document.removeEventListener("keydown", this.keydownHandler);
			this.keydownHandler = null;
		}
		if (this.keyupHandler) {
			document.removeEventListener("keyup", this.keyupHandler);
			this.keyupHandler = null;
		}
		
		// Rimuovi i listener per Escape
		if (this.escapeKeydownHandler) {
			document.removeEventListener("keydown", this.escapeKeydownHandler);
			this.escapeKeydownHandler = null;
		}
		if (this.escapeKeyupHandler) {
			document.removeEventListener("keyup", this.escapeKeyupHandler);
			this.escapeKeyupHandler = null;
		}
		
		// Pulisci il timer
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
		
		// Disconnetti il pongManager e rimuovi i listener
		if (this.pongManager) {
			// Verifica se il metodo esiste prima di chiamarlo
			if (typeof this.pongManager.removeAllListeners === 'function') {
				this.pongManager.removeAllListeners();
			}
			if (typeof this.pongManager.disconnect === 'function') {
				this.pongManager.disconnect();
			}
			this.pongManager = null;
		}
		
		// Ferma il game loop
		this.gameOver = true;
		
		// Nascondi il timer se visibile
		const timerElement = document.getElementById("readyTimer");
		if (timerElement) {
			timerElement.classList.add("visually-hidden");
		}
		
		// Reset delle variabili di stato
		this.moveUp = false;
		this.moveDown = false;
		
		console.log("GameController cleanup completed");
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
		if (winner === "null" || winner === null) {
			ctx.fillText($.i18n('aborted'), canvas.width / 2, canvas.height / 2 + 80);
		}
		else {
			ctx.fillText(`${winner} ${$.i18n('wins')}!`, canvas.width / 2, canvas.height / 2 + 80);
		}
	}

	if (progress < 1) {
		requestAnimationFrame((timestamp) => animateGameOver(timestamp, context));
	} else {
		ctx.font = "25px Arial";
		ctx.fillStyle = "grey";
		ctx.fillText($.i18n('pressEscToGoBack'), canvas.width / 2, canvas.height - 50);
	}

}
