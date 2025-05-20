// pongManager.js
export function createPongManager() {
	let socket = null;
	let gameId = null;
	let accessToken = null;
  
	// Callback registrabili dal frontend
	const listeners = {
	  onGameState: null,
	  onGameOver: null,
	  onPlayersUpdate: null,
	  onError: null,
	};
  
	/**
	 * Connette al server WebSocket usando il gameId e manda subito il token.
	 */
	function connect(_gameId) {
	  gameId = _gameId;
	  accessToken = window.localStorage.getItem("accessToken");
  
	  socket = new WebSocket(`ws://localhost:8002/ws/game/${gameId}/`);
  
	  socket.onopen = () => {
		console.log("[PongManager] Connessione aperta");
		// Autenticazione: invia il token come semplice stringa
		socket.send(accessToken);
	  };
  
	  socket.onmessage = (event) => {
		let data;
		try {
		  data = JSON.parse(event.data);
		} catch (e) {
		  console.error("[PongManager] Errore parsing JSON:", e);
		  return;
		}
  
		// Gestione messaggi ricevuti
		switch (data.type) {
		  case "game_state":
			listeners.onGameState?.(data.state);
			break;
  
		  case "game_over":
			listeners.onGameOver?.(data);
			break;
  
		  case "players_update":
			listeners.onPlayersUpdate?.(data);
			break;
  
		  default:
			console.warn("[PongManager] Tipo di messaggio sconosciuto:", data.type);
		}
	  };
  
	  socket.onerror = (error) => {
		console.error("[PongManager] Errore WebSocket:", error);
		listeners.onError?.(error);
	  };
  
	  socket.onclose = (event) => {
		console.warn("[PongManager] Connessione chiusa:", event);
	  };
	}
  
	/**
	 * Invia un comando di movimento (es. "up", "down").
	 */
	function sendMove(direction) {
	  if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({
		  action: "move",
		  direction: direction,
		}));
	  } else {
		console.warn("[PongManager] Connessione non pronta, comando ignorato.");
	  }
	}
  
	/**
	 * Disconnette la WebSocket.
	 */
	function disconnect() {
	  if (socket) {
		socket.close();
		socket = null;
	  }
	}
  
	/**
	 * Registra un listener per un evento specifico.
	 * Eventi supportati: "onGameState", "onGameOver", "onPlayersUpdate", "onError"
	 */
	function on(eventType, callback) {
	  if (listeners.hasOwnProperty(eventType)) {
		listeners[eventType] = callback;
	  } else {
		console.warn(`[PongManager] Listener non valido: ${eventType}`);
	  }
	}
  
	return {
	  connect,
	  sendMove,
	  disconnect,
	  on,
	};
  }
  