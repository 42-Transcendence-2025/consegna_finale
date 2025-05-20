/** @type {Controller} */
export class GameController {
    titleSuffix = "Game";

    init() {
        console.log("Game Controller");
        this.canvas = document.getElementById("onlineGameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = 800;
        this.canvas.height = 600;
		this.paddleWidth = 20;
        this.paddleHeight = 70;
        this.ballRadius = 10;

        this.#bindEvents();
        this.#connectWebSocket();
        this.#drawInitialState();
    }

    #bindEvents() {
        // Eventuali eventi per interazioni future
    }

    #connectWebSocket() {
		const gameId = localStorage.getItem("game_id");
		if (!gameId) {
			console.error("Game ID not found!");
			return;
		}
        this.socket = new WebSocket("ws://localhost:8002/ws/game/" + gameId + "/");

        this.socket.onopen = () => {
            console.log("WebSocket connection established");
        };

        this.socket.onmessage = (event) => {
            const gameState = JSON.parse(event.data);
            this.#updateCanvas(gameState);
        };

        this.socket.onclose = () => {
            console.log("WebSocket connection closed");
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    #drawInitialState() {
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.drawNet();
		// this.drawScores();

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

    #updateCanvas(gameState) {
		console.log("Game state received:", gameState);
		
        // Pulizia del canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Sfondo
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Linea centrale
        this.ctx.strokeStyle = "#fff";
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();

        // Paddles
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(
            10,
            gameState.leftPaddle.y,
            20,
            70
        ); // Sinistra
        this.ctx.fillRect(
            this.canvas.width - 30,
            gameState.rightPaddle.y,
            20,
            70
        ); // Destra

        // Ball
        this.ctx.beginPath();
        this.ctx.arc(
            gameState.ball.x,
            gameState.ball.y,
            10,
            0,
            2 * Math.PI
        );
        this.ctx.fill();
    }
}