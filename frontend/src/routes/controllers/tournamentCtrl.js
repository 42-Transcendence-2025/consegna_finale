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
        this.fetchTournamentData(tournamentId);
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

        const qf_top_left = document.getElementById("TopLeftQuarterFinal");
        const qf_bottom_left = document.getElementById("BottomLeftQuarterFinal");
        const qf_top_right = document.getElementById("TopRightQuarterFinal");
        const qf_bottom_right = document.getElementById("BottomRightQuarterFinal");
        const sf_left = document.getElementById("LeftSemiFinal");
        const sf_right = document.getElementById("RightSemiFinal");
        const final = document.getElementById("Final");

        let player1 = matchResults.quarterfinals[0].player_1;
        let player2 = matchResults.quarterfinals[0].player_2;
        if (player1 === "null" || player1 === null)
            player1 = "Waiting...";
        if (player2 === "null" || player2 === null)
            player2 = "Waiting...";
        if (matchResults.quarterfinals[0].status === "finished")
        {
            if (matchResults.quarterfinals[0].winner === player1)
                qf_top_left.classList.add("p-green-red");
            else if (matchResults.quarterfinals[0].winner === player2)
                qf_top_left.classList.add("p-red-green");
        }
        qf_top_left.innerHTML = `${player1}<br><span class="vs-text">VS</span><br>${player2}`;

        player1 = matchResults.quarterfinals[1].player_1;
        player2 = matchResults.quarterfinals[1].player_2;
        if (player1 === "null" || player1 === null)
            player1 = "Waiting...";
        if (player2 === "null" || player2 === null)
            player2 = "Waiting...";
        if (matchResults.quarterfinals[1].status === "finished")
        {
            if (matchResults.quarterfinals[1].winner === player1)
                qf_bottom_left.classList.add("p-green-red");
            else if (matchResults.quarterfinals[1].winner === player2)
                qf_bottom_left.classList.add("p-red-green");
        }
        qf_bottom_left.innerHTML = `${player1}<br><span class="vs-text">VS</span><br>${player2}`;

        player1 = matchResults.quarterfinals[2].player_1;
        player2 = matchResults.quarterfinals[2].player_2;
        if (player1 === "null" || player1 === null)
            player1 = "Waiting...";
        if (player2 === "null" || player2 === null)
            player2 = "Waiting...";
        if (matchResults.quarterfinals[2].status === "finished")
        {
            if (matchResults.quarterfinals[2].winner === player1)
                qf_top_right.classList.add("p-green-red");
            else if (matchResults.quarterfinals[2].winner === player2)
                qf_top_right.classList.add("p-red-green");
        }
        qf_top_right.innerHTML = `${player1}<br><span class="vs-text">VS</span><br>${player2}`;

        player1 = matchResults.quarterfinals[3].player_1;
        player2 = matchResults.quarterfinals[3].player_2;
        if (player1 === "null" || player1 === null)
            player1 = "Waiting...";
        if (player2 === "null" || player2 === null)
            player2 = "Waiting...";
        if (matchResults.quarterfinals[3].status === "finished")
        {
            if (matchResults.quarterfinals[3].winner === player1)
                qf_bottom_right.classList.add("p-green-red");
            else if (matchResults.quarterfinals[3].winner === player2)
                qf_bottom_right.classList.add("p-red-green");
        }
        qf_bottom_right.innerHTML = `${player1}<br><span class="vs-text">VS</span><br>${player2}`;

        player1 = matchResults.semifinals[0].player_1;
        player2 = matchResults.semifinals[0].player_2;
        if (player1 === "null" || player1 === null)
            player1 = "Waiting...";
        if (player2 === "null" || player2 === null)
            player2 = "Waiting...";
        if (matchResults.semifinals[0].status === "finished")
        {
            if (matchResults.semifinals[0].winner === player1)
                sf_left.classList.add("p-green-red");
            else if (matchResults.semifinals[0].winner === player2)
                sf_left.classList.add("p-red-green");
        }
        sf_left.innerHTML = `${player1}<br><span class="vs-text">VS</span><br>${player2}`;

        player1 = matchResults.semifinals[1].player_1;
        player2 = matchResults.semifinals[1].player_2;
        if (player1 === "null" || player1 === null)
            player1 = "Waiting...";
        if (player2 === "null" || player2 === null)
            player2 = "Waiting...";
        if (matchResults.semifinals[1].status === "finished")
        {
            if (matchResults.semifinals[1].winner === player1)
                sf_right.classList.add("p-green-red");
            else if (matchResults.semifinals[1].winner === player2)
                sf_right.classList.add("p-red-green");
        }
        sf_right.innerHTML = `${player1}<br><span class="vs-text">VS</span><br>${player2}`;

        player1 = matchResults.final.player_1;
        player2 = matchResults.final.player_2;
        if (player1 === "null" || player1 === null)
            player1 = "Waiting...";
        if (player2 === "null" || player2 === null)
            player2 = "Waiting...";
        if (matchResults.final.status === "finished") {
            if (matchResults.final.winner === player1)
                final.classList.add("p-green-red");
            else if (matchResults.final.winner === player2)
                final.classList.add("p-red-green");
        }
        final.innerHTML = `${player1}<br><span class="vs-text">VS</span><br>${player2}`;

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
