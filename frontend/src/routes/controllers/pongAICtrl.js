import { PongGame } from "../../pong_ai/game.js";
import { Player } from "../../pong_ai/player.js";
import { AI } from "../../pong_ai/ai.js";

export class PongAIController {
    constructor() {
        this.titleSuffix = "Pong AI";
    }

    init() {
		console.log("Pong AI Controller");		
		const menu = document.getElementById("menu");
		const gameContainer = document.getElementById("gameContainer");
		const game = new PongGame();
		const player = new Player(game);
		let ai = null;

		const startGame = (difficulty) => {
			ai = new AI(game, difficulty);
			menu.classList.add("visually-hidden");
			gameContainer.classList.remove("visually-hidden");
			game.setupStartListener();
			game.setupDebugStatListener();
			game.setupPauseListener();
			gameLoop();
		};

	
		document.getElementById("easy").addEventListener("click", () =>
		{
			startGame("easy");	
		});
	
		document.getElementById("medium").addEventListener("click", () =>
		{
			startGame("medium");
		});
	
		document.getElementById("hard").addEventListener("click", () =>
		{
			startGame("hard");
		});
	
		document.getElementById("impossible").addEventListener("click", () =>
		{
			startGame("impossible");
		});
	
		function gameLoop() 
		{
			if (game.gameOver)
			{
				gameOverScreen();
				return;
			}
			if (!game.waitingToStart && !game.gamePaused)
			{
				player.update();
				ai.update();
				game.update(ai);
			}
			game.draw(ai.exactPrediction, ai.prediction);
			requestAnimationFrame(gameLoop); // Recursive call for animation
		}
	
		function gameOverScreen()
		{
			let start = null;
			let duration = 1500; // durata animazione in ms
	
			let canvas = game.canvas;
			
			// Posizioni iniziali
			let scoreStartY = 50;
		
			// Posizione finale (verticale)
			let targetY = canvas.height / 2 - 100;
			
			// Dimensioni del font
			let startFontSize = 30;
			let endFontSize = 80;
	
			function animate(timestamp)
			{
				if (!start) start = timestamp;
				let progress = Math.min((timestamp - start) / duration, 1);
				let ctx = game.ctx;
				let winnerName = game.state.leftScore > game.state.rightScore ? "You won" : "A.I. wins";
				
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
				if (progress >= 1)
				{
					ctx.font = "60px Arial";
					ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 + 20);
		
					ctx.font = "40px Arial";
					ctx.fillText(`${winnerName}!`, canvas.width / 2, canvas.height / 2 + 80);
				}
		
				if (progress < 1)
				{
					requestAnimationFrame(animate);
				}
				else
				{
					ctx.font = "25px Arial";
					ctx.fillStyle = "grey";
					ctx.fillText("Press r to restart the game", 400, 500);
				}
			}
		
			requestAnimationFrame(animate);
		}
			
    }
}
