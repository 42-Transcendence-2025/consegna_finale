/** @type {Controller} */
export class GameController {
    titleSuffix = "Game";


    init() {
        // Pulisci eventuali listener residui da sessioni precedenti
        this.cleanup();
        
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
		this.rightPlayerImage = null;
    	this.leftPlayerImage = null;

		// Proprietà per l'effetto fuoco
		this.fireThreshold = 15; // Velocità minima per attivare l'effetto fuoco
		this.fireParticles = []; // Array per le particelle di fuoco
		this.fireAnimationTime = 0; // Timer per l'animazione

		// OTTIMIZZAZIONE: Cache elementi DOM una sola volta
		this.domElements = {
			rightPlayerIcon: document.getElementById("rightPlayerIcon"),
			rightPlayerName: document.getElementById("rightPlayerName"),
			rightPlayerTrophies: document.getElementById("rightPlayerThropies"),
			leftPlayerIcon: document.getElementById("leftPlayerIcon"),
			leftPlayerName: document.getElementById("leftPlayerName"),
			leftPlayerTrophies: document.getElementById("leftPlayerThropies")
		};

		// OTTIMIZZAZIONE: Interpolazione per movimento fluido
		this.interpolation = {
			enabled: true,
			lerpFactor: 0.75, // Velocità interpolazione (0.1 = lento, 0.3 = veloce)
			targetState: null,
			previousDirection: null,
			currentState: {
				ball: { x: 400, y: 300 },
				leftPaddle: { y: 250 },
				rightPaddle: { y: 250 }
			}
		};

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
			// OTTIMIZZAZIONE: Salva come target per interpolazione
			if (this.interpolation.enabled) {
				this.interpolation.targetState = {
					ball: { x: gameState.ball.x, y: gameState.ball.y, dx: gameState.ball.dx, dy: gameState.ball.dy },
					leftPaddle: { y: gameState.left_paddle.y },
					rightPaddle: { y: gameState.right_paddle.y }
				};
			} else {
				// Fallback senza interpolazione
				this.state.updateFromServer(gameState);
			}
			
			// Aggiorna sempre i punteggi immediatamente (non interpolare i numeri)
			this.state.leftScore = gameState.left_score;
			this.state.rightScore = gameState.right_score;
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
			this.leftPlayerImage = gameState.left_player_image;
			this.leftPlayerThropies = gameState.left_player_trophies;
			this.rightPlayerThropies = gameState.right_player_trophies;
			this.rightPlayerImage = gameState.right_player_image;
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
		
		// OTTIMIZZAZIONE: Interpola movimento per fluidità
		if (this.interpolation.enabled && this.interpolation.targetState) {
			this.interpolateMovement();
		}
		
		// Aggiorna l'effetto fuoco
		this.updateFireParticles();
		
		this.sendMoves();
		this.draw();
		requestAnimationFrame(this.gameLoop.bind(this)); // Recursive call for animation
	}

	interpolateMovement() {
	    const lerp = this.interpolation.lerpFactor;
	    const current = this.interpolation.currentState;
	    const target = this.interpolation.targetState;
	
	    // NUOVO: Detection del cambio direzione per la palla
	    const ballDx = target.ball.x - current.ball.x;
	    const ballDy = target.ball.y - current.ball.y;
	
	    // Se non abbiamo una direzione precedente, salvala
	    if (!this.interpolation.previousDirection) {
	        this.interpolation.previousDirection = { dx: ballDx, dy: ballDy };
	    }
	
	    // Controlla se la direzione è cambiata (segno opposto = rimbalzo)
	    const directionChangedX = (ballDx * this.interpolation.previousDirection.dx) < 0;
	    const directionChangedY = (ballDy * this.interpolation.previousDirection.dy) < 0;
	
	    // Se la direzione è cambiata, aggiorna immediatamente (no interpolazione)
	    if (directionChangedX || directionChangedY) {
	        current.ball.x = target.ball.x;
	        current.ball.y = target.ball.y;
	        this.interpolation.previousDirection = { dx: ballDx, dy: ballDy };
	    } else {
	        // Interpolazione normale solo se la direzione non è cambiata
	        current.ball.x += (target.ball.x - current.ball.x) * lerp;
	        current.ball.y += (target.ball.y - current.ball.y) * lerp;
	        this.interpolation.previousDirection = { dx: ballDx, dy: ballDy };
	    }
	
	    // Interpola sempre i paddle (non hanno problemi di direzione critica)
	    current.leftPaddle.y += (target.leftPaddle.y - current.leftPaddle.y) * lerp;
	    current.rightPaddle.y += (target.rightPaddle.y - current.rightPaddle.y) * lerp;
	
	    // Aggiorna lo stato di rendering
	    this.state.ball.x = current.ball.x;
	    this.state.ball.y = current.ball.y;
	    this.state.ball.dx = target.ball.dx; // Mantieni la velocità della palla
	    this.state.ball.dy = target.ball.dy; // Mantieni la velocità della palla
	    this.state.leftPaddle.y = current.leftPaddle.y;
	    this.state.rightPaddle.y = current.rightPaddle.y;
	}

	sendMoves() {
		if (this.moveUp) {
			this.pongManager.sendMove("up");
		}
		
		if (this.moveDown) {
			this.pongManager.sendMove("down");
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
		const currentSpeed = this.getBallSpeed();
		const isBlueFire = currentSpeed >= 35; // Fiamme blu a velocità elevata
		
		// Disegna le particelle di fuoco se la pallina è infuocata
		if (this.isBallOnFire()) {
			this.drawFireParticles();
			this.drawFireGlow(ball);
		}
		
		// Disegna la pallina con colore appropriato
		if (isBlueFire) {
			this.ctx.fillStyle = "#E6F3FF"; // Colore blu chiaro per fiamme blu
		} else if (this.isBallOnFire()) {
			this.ctx.fillStyle = "#FFE4B5"; // Colore caldo per fiamme rosse
		} else {
			this.ctx.fillStyle = "white"; // Colore normale
		}
		
		this.ctx.beginPath();
		this.ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
		this.ctx.fill();
		
		// Bordo più luminoso se infuocata
		if (this.isBallOnFire()) {
			this.ctx.strokeStyle = isBlueFire ? "#4169E1" : "#FF6B35"; // Blu o arancione
			this.ctx.lineWidth = 2;
			this.ctx.stroke();
		}
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
	    // OTTIMIZZAZIONE: Usa cache DOM invece di query multiple
	    this.domElements.rightPlayerName.textContent = `${this.rightPlayer}`;
	    this.domElements.rightPlayerTrophies.textContent = `${this.rightPlayerThropies}`;
	
	    this.domElements.leftPlayerName.textContent = `${this.leftPlayer}`;
	    this.domElements.leftPlayerTrophies.textContent = `${this.leftPlayerThropies}`;
	
	    // NUOVO: Imposta le immagini profilo se disponibili
	    if (this.rightPlayerImage) {
	        this.domElements.rightPlayerIcon.src = this.rightPlayerImage;
	    } else {
	        this.domElements.rightPlayerIcon.src = "./assets/default_icons/vegeta.png";
	    }
	
	    if (this.leftPlayerImage) {
	        this.domElements.leftPlayerIcon.src = this.leftPlayerImage;
	    } else {
	        this.domElements.leftPlayerIcon.src = "./assets/default_icons/goku.png";
	    }
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
		
		// Leggi il tipo di partita dall'URL corrente
		const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
		const gameType = urlParams.get('type');
		
		// Reindirizza basandosi sul tipo di partita
		switch (gameType) {
			case 'tournament':
				window.location.hash = "#tournament";      // torna al bracket
				break;
			case 'private':
				window.location.hash = "#privateMatch";    // torna a partite private
				break;
			case 'ranked':
				window.location.hash = "#rankedMatch";     // torna a partite ranked
				break;
			default:
				window.location.hash = "#onlineGame";      // fallback generico
				break;
		}
	}

	cleanup() {		
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
		
		// Pulisci l'effetto fuoco
		this.fireParticles = [];
		this.fireAnimationTime = 0;
		
		// OTTIMIZZAZIONE: Pulisci la cache DOM
		this.domElements = null;
		
		// OTTIMIZZAZIONE: Pulisci interpolazione
		this.interpolation = null;
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
