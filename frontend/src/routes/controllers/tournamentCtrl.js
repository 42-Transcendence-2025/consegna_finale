export class TournamentController {
    titleSuffix = "Tournament Bracket";

    async init(tournamentId) {
        if (!tournamentId) {
            tournamentId = localStorage.getItem('currentTournamentId');
        }
        if (!tournamentId) {
            this.#showError($.i18n('noTournamentId'));
            window.location.hash = "#tournamentMenu";
            return;
        }
        // Fetch iniziale
        await this.fetchTournamentData(tournamentId);

        // Aggiorna ogni 5 secondi
        if (this._tournamentInterval) {
            clearInterval(this._tournamentInterval);
        }
        this._tournamentInterval = setInterval(() => {
            this.fetchTournamentData(tournamentId);
        }, 5000);
    }

    async fetchTournamentData(tournamentId) {
        try {
            const response = await window.tools.matchManager.getTournamentDetails(tournamentId);

            this.#bindQuitButton(tournamentId, response.status);
            this.#bindPlayButton(tournamentId, response.ready || false);
            this.#renderBracket(response);
        }
        catch (error) {
            this.#showError($.i18n('failedToLoadTournamentData'));
            this.#bindQuitButton(tournamentId, null);
        }
    }

    #renderBracket(tournamentData) {
        // Ottieni i risultati dei match per aggiornare il bracket
        const matchResults = this.#getMatchResults(tournamentData.matches || []);
        const tournamentBracket = document.getElementById("tournament-bracket");

        if (!tournamentBracket)
            return;

        // Configurazione per ogni fase del torneo
        const bracketConfig = [
            // Quarti di finale
            { elementId: "TopLeftQuarterFinal", match: matchResults.quarterfinals[0], template: "vs" },
            { elementId: "BottomLeftQuarterFinal", match: matchResults.quarterfinals[1], template: "vs" },
            { elementId: "TopRightQuarterFinal", match: matchResults.quarterfinals[2], template: "vs" },
            { elementId: "BottomRightQuarterFinal", match: matchResults.quarterfinals[3], template: "vs" },
            
            // Semifinali
            { elementId: "LeftSemiFinal", match: matchResults.semifinals[0], template: "vs" },
            { elementId: "RightSemiFinal", match: matchResults.semifinals[1], template: "vs" },
            
            // Finale (solo nomi dei giocatori)
            { elementId: "LeftPlayerFinal", match: matchResults.final, template: "player1" },
            { elementId: "RightPlayerFinal", match: matchResults.final, template: "player2" }
        ];

        // Renderizza ogni elemento del bracket
        bracketConfig.forEach(config => this.#renderBracketElement(config));
    }

    #renderBracketElement({ elementId, match, template }) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const player1 = this.#formatPlayerName(match.player_1);
        const player2 = this.#formatPlayerName(match.player_2);

        // Applica la classe CSS per il vincitore se il match è finito
        // this.#applyWinnerStyle(element, match, player1, player2);

        // Imposta il contenuto HTML basato sul template
        switch (template) {
            case "vs":
                const player1WithScore = this.#formatPlayerWithScore(player1, match.points_player_1, match.status, match.winner);
                const player2WithScore = this.#formatPlayerWithScore(player2, match.points_player_2, match.status, match.winner);
                
                // Gestisci il testo VS/Aborted con stile appropriato
                let vsText, vsStyle;
                if (match.status === "aborted") {
                    vsText = $.i18n('aborted') || 'Aborted';
                    vsStyle = 'style="color: red; font-weight: bold; font-size: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.7);"';
                } else {
                    vsText = 'VS';
                    vsStyle = 'class="vs-text"';
                }
                
                element.innerHTML = `${player1WithScore}<br><span ${vsStyle}>${vsText}</span><br>${player2WithScore}`;
                break;
            case "player1":
                const finalPlayer1 = this.#formatPlayerWithScore(player1, match.points_player_1, match.status, match.winner);
                element.innerHTML = finalPlayer1;
                break;
            case "player2":
                const finalPlayer2 = this.#formatPlayerWithScore(player2, match.points_player_2, match.status, match.winner);
                element.innerHTML = finalPlayer2;
                break;
        }
    }

    #formatPlayerName(playerName) {
        return (playerName === "null" || playerName === null) 
            ? "Waiting..." 
            : playerName;
    }

    #formatPlayerWithScore(playerName, points, status, winner = null) {
        // Se il match non è finito o i punti non sono disponibili, mostra solo il nome
        if (!["finished", "walkover", "aborted"].includes(status) || playerName === "Waiting...") {
            return playerName;
        }
        
        // Determina lo stile in base al vincitore
        let playerStyle = "";
        if (status === "aborted") {
            // Entrambi i giocatori vengono scuriti se il match è annullato
            playerStyle = 'class="loser-dim"';
        } else if (winner && winner !== "null") {
            if (playerName === winner) {
                playerStyle = 'class="winner-highlight"';
            } else {
                playerStyle = 'class="loser-dim"';
            }
        }
        
        // Gestisci i diversi casi di visualizzazione del punteggio
        let scoreDisplay = points;
        if (status === "walkover" || status === "aborted") {
            scoreDisplay = "-";
        }
        
        // Mostra il nome del giocatore con il punteggio appropriato
        return `<span ${playerStyle}>${playerName}</span><span style="color: yellow; font-size: 1.2em; margin-left: 15px; font-weight: bold;">${scoreDisplay}</span>`;
    }

    #getMatchResults(matches) {
        if (!matches || matches.length < 7) {
            // Ritorna una struttura vuota se i dati non sono validi
            const emptyMatch = { player_1: "null", player_2: "null", winner: "null", status: "created" };
            return {
                quarterfinals: Array(4).fill(emptyMatch),
                semifinals: Array(2).fill(emptyMatch),
                final: emptyMatch
            };
        }

        return {
            quarterfinals: [matches[0], matches[1], matches[2], matches[3]],
            semifinals: [matches[4], matches[5]],
            final: matches[6]
        };
    }

    #bindQuitButton(tournamentId, status) {
        const quitBtn = document.getElementById("quitTournamentBtn");
        if (!quitBtn)
            return;

        // Rimuovi eventuali listener precedenti in modo più efficiente
        quitBtn.onclick = null;

        quitBtn.onclick = async () => {
            try {
                // Manda DELETE solo se lo status è 'created'
                if (status === 'created') {
                    await window.tools.matchManager.quitTournament(tournamentId);
                }
                // Rimuovi l'ID del torneo dal localStorage
                localStorage.removeItem("currentTournamentId");
                // Rimanda sempre alla pagina tournament menu
                window.location.hash = "#tournamentMenu";
            } catch (err) {
                console.error("Failed to quit tournament:", err);
                // Anche in caso di errore, torna al menu
                localStorage.removeItem("currentTournamentId");
                window.location.hash = "#tournamentMenu";
            }
        };
    }

    #bindPlayButton(tournamentId, ready) {
        const playBtn = document.getElementById("playTournamentBtn");
        if (!playBtn) return;

        // Mostra/nascondi il bottone in base al ready state
        if (ready) {
            playBtn.style.display = 'inline-block';
        } else {
            playBtn.style.display = 'none';
            return;
        }

        // Rimuovi eventuali listener precedenti in modo più efficiente
        playBtn.onclick = null;

        playBtn.onclick = async () => {
            try {
                // Disabilita il bottone durante la richiesta
                playBtn.disabled = true;
                playBtn.textContent = "Starting...";

                const res = await window.tools.matchManager.matchTournament(tournamentId);
                if (res && res.game_id) {
                    localStorage.setItem("game_id", res.game_id);
                    window.location.hash = "#game";
                } else {
                    // Re-abilita il bottone se non c'è game_id
                    playBtn.disabled = false;
                    playBtn.textContent = "Play";
                    console.warn("No game_id received from match start");
                }
            } catch (err) {
                console.error("Match start failed:", err);
                // Re-abilita il bottone in caso di errore
                playBtn.disabled = false;
                playBtn.textContent = "Play";
                
                // Mostra messaggio di errore all'utente
                let errorMsg = "Failed to start match";
                if (err.responseJSON?.detail) {
                    errorMsg = err.responseJSON.detail;
                } else if (err.responseText) {
                    errorMsg = err.responseText;
                }
                this.#showTemporaryMessage(errorMsg, true);
            }
        };
    }

    #showError(msg) {
        const container = document.getElementById("bracket-container");
        if (container) {
            container.innerHTML = `<div class='alert alert-danger'>${msg}</div>`;
        }
    }

    #showTemporaryMessage(message, isError = false) {
        const msgDiv = document.createElement("div");
        msgDiv.textContent = message;
        msgDiv.className = `position-fixed start-50 translate-middle-x px-4 py-2 rounded shadow text-white fw-bold ${isError ? "bg-danger" : "bg-success"}`;
        msgDiv.style.zIndex = "9999";
        msgDiv.style.top = "3rem";
        msgDiv.style.fontSize = "1.25rem";
        document.body.appendChild(msgDiv);
        setTimeout(() => {
            msgDiv.remove();
        }, 3000);
    }
}
