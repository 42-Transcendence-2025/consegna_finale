import { PongGame } from "../../pong_ai/game.js";
import { Player } from "../../pong_ai/player.js";
import { AI } from "../../pong_ai/ai.js";
import { CONFIG } from "../../../config.js";

export class PongAIController {
    constructor() {
        this.titleSuffix = "Pong AI";
        this.userProfile = null;
    }

    async init() {	
		
		// Carica il profilo utente
		await this.#loadUserProfile();
		
		const menu = document.getElementById("menu");
		const AIgameContainer = document.getElementById("AIgameContainer");
		const game = new PongGame();
		const player = new Player(game);
		let ai = null;

		const startGame = (difficulty, aiImgPath, aiName, aiTrophy) => {
			ai = new AI(game, difficulty);
			menu.classList.add("visually-hidden");
			AIgameContainer.classList.remove("visually-hidden");
			this.#drawPlayerInfo(aiImgPath, aiName, aiTrophy);
			gameLoop();
		};

	
		document.getElementById("easy").addEventListener("click", () =>
		{
			startGame("easy", "./assets/default_icons/cole(easy).png", "Cole", 10);
		});
	
		document.getElementById("medium").addEventListener("click", () =>
		{
			startGame("medium", "./assets/default_icons/nick(medium).png", "Nick", 70);
		});

		document.getElementById("hard").addEventListener("click", () =>
		{
			startGame("hard", "./assets/default_icons/rin(hard).png", "Rin", 300);
		});
	
		document.getElementById("impossible").addEventListener("click", () =>
		{
			startGame("impossible", "./assets/default_icons/matt.png", "Matt (Pro)", 1000);
		});

		function gameLoop()
		{
			if (game.gameOver)
			{
				gameOverScreen();
				return;
			}
			if (!game.waitingToStart)
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
				let progress = Math.min((timestamp - start) / duration, 1);			let ctx = game.ctx;
			let winnerName = game.state.leftScore > game.state.rightScore ? $.i18n('youWon') : $.i18n('aiWins');
				
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
					ctx.fillText($.i18n('pressEscToGoBack'), 400, 500);
				}
			}
		
			requestAnimationFrame(animate);
		}
	}

	async #loadUserProfile() {
		try {
			const response = await $.ajax({
				url: `${CONFIG.apiRoutes.profileApiUrl}/profile/`,
				method: "GET",
				dataType: "json",
			});
			this.userProfile = response;
		} catch (error) {
			console.error("Errore nel caricamento del profilo utente:", error);
			// Fallback ai valori predefiniti
			this.userProfile = {
				username: "Player",
				profile_image: null
			};
		}
	}

	#drawPlayerInfo(aiImgPath, aiName, aiTrophy) {
		// Usa i dati reali dell'utente
		const playerImgPath = this.#getUserAvatarPath();
		const playerName = this.userProfile?.username || "Player";

		// Player Icon
		const playerIcon = document.getElementById("playerIcon");
		playerIcon.innerHTML = `<img src="${playerImgPath}" alt="Player">
			<div class="icon-label">${playerName}</div>
		`;
		playerIcon.classList.remove("visually-hidden");

		// AI Icon
		const aiIcon = document.getElementById("aiIcon");
		aiIcon.innerHTML = `<img src="${aiImgPath}" alt="AI">
			<div class="icon-label">${aiName}</div>
			<div class="trophy-label">
				<i class="bi bi-trophy-fill" style="color: gold;"></i> ${aiTrophy}
			</div>
		`;
		aiIcon.classList.remove("visually-hidden");
	}

	#getUserAvatarPath() {
		if (this.userProfile?.profile_image) {
			return this.userProfile.profile_image;
		}
		
		// Fallback al sistema hash-based
		const defaultIcons = [
			"cole(easy).png",
			"goku.png", 
			"lucia.png",
			"matt.png",
			"nick(medium).png",
			"rin(hard).png",
			"vegeta.png",
		];
		
		let avatar = defaultIcons[1]; // goku.png come default
		if (this.userProfile?.username) {
			const idx = Math.abs(this.#hashString(this.userProfile.username)) % defaultIcons.length;
			avatar = defaultIcons[idx];
		}
		
		return `assets/default_icons/${avatar}`;
	}

	#hashString(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	}
}
