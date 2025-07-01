import { AIvsAIGame } from "../../ai_vs_ai/game_homepage.js";
import { AIvsAI } from "../../ai_vs_ai/ai_homepage.js";


/** @type {Controller} */
export class HomeController {
	titleSuffix = "Home";

	async init() {
		console.log("Home Controller");

		if (window.tools?.authManager?.isLoggedIn()) {
			await window.tools.authManager.getUserInfo();
			console.log("User info loaded:", window.tools.authManager.username);
			const navbarUsername = document.getElementById('navbar-username');
			if (navbarUsername) {
				navbarUsername.textContent = window.tools.authManager.username;
				navbarUsername.classList.remove('d-none');
			}
		} else {
			console.warn("User not logged in.");
		}
		
		this.game = new AIvsAIGame();
		this.leftAI = new AIvsAI(this.game, "left");
		this.rightAI = new AIvsAI(this.game, "right");
		this.gameLoop();
	}

	gameLoop() {
		if (this.game.gameOver) {
			this.gameOverScreen();
			return;
		}
		this.game.update();
		this.leftAI.update();
		this.rightAI.update();
		this.game.draw();
		requestAnimationFrame(() => this.gameLoop());
	}

	gameOverScreen() {
		let start = null;
		let duration = 1500; // durata animazione in ms

		let canvas = this.game.canvas;
		
		// Posizioni iniziali
		let scoreStartY = 50;
	
		// Posizione finale (verticale)
		let targetY = canvas.height / 2 - 100;
		
		// Dimensioni del font
		let startFontSize = 30;
		let endFontSize = 80;

		function animate(timestamp) {
			if (!start) start = timestamp;
			let progress = Math.min((timestamp - start) / duration, 1);
			let ctx = this.game.ctx;
			let winnerName = this.game.state.leftScore > this.game.state.rightScore ? "Lucia (Pro)" : "Matt (Pro)";

			let currentY = scoreStartY + (targetY - scoreStartY) * progress;
			let currentFontSize = startFontSize + (endFontSize - startFontSize) * progress;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = "white";
			ctx.textAlign = "center";
			ctx.font = `${currentFontSize}px 'pong-score', sans-serif`;
			ctx.fillText(this.game.state.leftScore, canvas.width / 4, currentY);
			ctx.fillText(this.game.state.rightScore, 3 * canvas.width / 4, currentY);
			if (progress >= 1) {
				ctx.font = "60px Arial";
				ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 + 20);
				ctx.font = "40px Arial";
				ctx.fillText(`${winnerName} wins!`, canvas.width / 2, canvas.height / 2 + 80);
			}

			requestAnimationFrame(animate.bind(this));
		}
		requestAnimationFrame(animate.bind(this));
	}
}
