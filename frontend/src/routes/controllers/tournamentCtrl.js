export class TournamentController {
    titleSuffix = "Tournament Bracket";

    async init(tournamentId) {
        if (!tournamentId) {
            tournamentId = localStorage.getItem('currentTournamentId');
        }
        if (!tournamentId) {
            this.#showError("No tournament ID provided");
            return;
        }

        if (this._tournamentInterval)
            clearInterval(this._tournamentInterval);

        this.#fetchAndRenderPyramid(tournamentId);
        this._tournamentInterval = setInterval(() => this.#fetchAndRenderPyramid(tournamentId), 5000);

        $(window).one("hashchange", () => clearInterval(this._tournamentInterval));
    }

    async #fetchAndRenderPyramid(tournamentId) {
        try {
            const data = await window.tools.matchManager.getTournamentDetails(tournamentId);
            this.#renderPyramid(data);
            this.#bindQuitButton(tournamentId);
            if (
               data.status === "full" &&
               data.ready === true &&
               !this._matchStarted          // flag interno
            ) {
                this._matchStarted = true;   // evita richieste ogni 5 s
                try {
                    const res = await window.tools.matchManager.matchTournament(tournamentId);
                    if (res && res.game_id) {
                        localStorage.setItem("game_id", res.game_id);
                        window.location.hash = "#game";
                    } else {
                        this._matchStarted = false; // fallback
                    }
                } catch (e) {
                    console.error("Match start failed:", e);
                    this._matchStarted = false;
                }
            }
        } catch (err) {
            this.#showError("Failed to load tournament data");
        }
    }

    #renderPyramid(tournament) {
        const NUM_BASE_SLOTS = 8;
        const players = Array(NUM_BASE_SLOTS).fill("-");
        if (Array.isArray(tournament.players)) {
            tournament.players.forEach(p => {
                if (typeof p.slot === "number" && p.slot >= 0 && p.slot < NUM_BASE_SLOTS) {
                    players[p.slot] = p.username;
                }
            });
        }

        const pyramid = document.querySelector(".tournament-bracket-container");
        if (!pyramid) return;
        
        // Pulisce il contenuto esistente
        pyramid.innerHTML = "";
        
        // Sezione sinistra (primi 4 giocatori)
        const leftSection = document.createElement("div");
        leftSection.className = "bracket-section left-section";
        
        // Crea le coppie di giocatori
        for (let i = 0; i < 4; i += 2) {
            const matchGroup = document.createElement("div");
            matchGroup.className = "match-group";
            
            const matchBlock = document.createElement("div");
            matchBlock.className = "tournament-match-block";
            
            const player1Name = document.createElement("div");
            player1Name.className = "player-name";
            player1Name.textContent = players[i] || "-";
            
            const vsText = document.createElement("div");
            vsText.className = "vs-text";
            vsText.textContent = "VS";
            
            const player2Name = document.createElement("div");
            player2Name.className = "player-name";
            player2Name.textContent = players[i + 1] || "-";
            
            matchBlock.appendChild(player1Name);
            matchBlock.appendChild(vsText);
            matchBlock.appendChild(player2Name);
            matchGroup.appendChild(matchBlock);
            leftSection.appendChild(matchGroup);
        }
        
        // Sezione destra (ultimi 4 giocatori)
        const rightSection = document.createElement("div");
        rightSection.className = "bracket-section right-section";
        
        // Crea le coppie di giocatori
        for (let i = 4; i < 8; i += 2) {
            const matchGroup = document.createElement("div");
            matchGroup.className = "match-group";
            
            const matchBlock = document.createElement("div");
            matchBlock.className = "tournament-match-block";
            
            const player1Name = document.createElement("div");
            player1Name.className = "player-name";
            player1Name.textContent = players[i] || "-";
            
            const vsText = document.createElement("div");
            vsText.className = "vs-text";
            vsText.textContent = "VS";
            
            const player2Name = document.createElement("div");
            player2Name.className = "player-name";
            player2Name.textContent = players[i + 1] || "-";
            
            matchBlock.appendChild(player1Name);
            matchBlock.appendChild(vsText);
            matchBlock.appendChild(player2Name);
            matchGroup.appendChild(matchBlock);
            rightSection.appendChild(matchGroup);
        }
        
        // Sezione semifinale sinistra (tra quarti sinistri e finale)
        const leftSemifinalSection = document.createElement("div");
        leftSemifinalSection.className = "bracket-section semifinal-section";
        
        const semifinal1Group = document.createElement("div");
        semifinal1Group.className = "match-group";
        const semifinal1Block = document.createElement("div");
        semifinal1Block.className = "tournament-match-block semifinal";
        
        const semi1Player1 = document.createElement("div");
        semi1Player1.className = "player-name";
        semi1Player1.textContent = "TBD";
        
        const semi1Vs = document.createElement("div");
        semi1Vs.className = "vs-text";
        semi1Vs.textContent = "VS";
        
        const semi1Player2 = document.createElement("div");
        semi1Player2.className = "player-name";
        semi1Player2.textContent = "TBD";
        
        semifinal1Block.appendChild(semi1Player1);
        semifinal1Block.appendChild(semi1Vs);
        semifinal1Block.appendChild(semi1Player2);
        semifinal1Group.appendChild(semifinal1Block);
        leftSemifinalSection.appendChild(semifinal1Group);
        
        // Sezione finale (centro assoluto)
        const finalSection = document.createElement("div");
        finalSection.className = "bracket-section final-section";
        
        const finalGroup = document.createElement("div");
        finalGroup.className = "match-group final-match-group";
        
        // Primo rettangolo della finale
        const finalPlayer1Block = document.createElement("div");
        finalPlayer1Block.className = "tournament-player-block final-player";
        finalPlayer1Block.textContent = "TBD";
        
        // Scritta VS centrale
        const finalVsText = document.createElement("div");
        finalVsText.className = "final-vs-text";
        finalVsText.textContent = "VS";
        
        // Secondo rettangolo della finale
        const finalPlayer2Block = document.createElement("div");
        finalPlayer2Block.className = "tournament-player-block final-player";
        finalPlayer2Block.textContent = "TBD";
        
        finalGroup.appendChild(finalPlayer1Block);
        finalGroup.appendChild(finalVsText);
        finalGroup.appendChild(finalPlayer2Block);
        finalSection.appendChild(finalGroup);
        
        // Sezione semifinale destra (tra quarti destri e finale)
        const rightSemifinalSection = document.createElement("div");
        rightSemifinalSection.className = "bracket-section semifinal-section";
        
        const semifinal2Group = document.createElement("div");
        semifinal2Group.className = "match-group";
        const semifinal2Block = document.createElement("div");
        semifinal2Block.className = "tournament-match-block semifinal";
        
        const semi2Player1 = document.createElement("div");
        semi2Player1.className = "player-name";
        semi2Player1.textContent = "TBD";
        
        const semi2Vs = document.createElement("div");
        semi2Vs.className = "vs-text";
        semi2Vs.textContent = "VS";
        
        const semi2Player2 = document.createElement("div");
        semi2Player2.className = "player-name";
        semi2Player2.textContent = "TBD";
        
        semifinal2Block.appendChild(semi2Player1);
        semifinal2Block.appendChild(semi2Vs);
        semifinal2Block.appendChild(semi2Player2);
        semifinal2Group.appendChild(semifinal2Block);
        rightSemifinalSection.appendChild(semifinal2Group);
        
        pyramid.appendChild(leftSection);
        pyramid.appendChild(leftSemifinalSection);
        pyramid.appendChild(finalSection);
        pyramid.appendChild(rightSemifinalSection);
        pyramid.appendChild(rightSection);
    }

    #bindQuitButton(tournamentId) {
        const quitBtn = document.getElementById("quitTournamentBtn");
        if (!quitBtn) return;

        quitBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to quit this tournament?")) return;

            try {
                await window.tools.matchManager.quitTournament(tournamentId);        // vedi nota ①
                clearInterval(this._tournamentInterval);
                localStorage.removeItem("currentTournamentId");
                window.location.hash = "#tournamentMenu";
            } catch (err) {
                alert("Failed to quit tournament");
            }
        });
    }

    #showError(msg) {
        const container = document.getElementById("bracket-container");
        if (container) {
            container.innerHTML = `<div class='alert alert-danger'>${msg}</div>`;
        }
    }
}
