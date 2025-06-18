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

        const pyramid = document.getElementById("bracket-container")
                               .querySelector(".tournament-pyramid");
        if (!pyramid) return;

        // Rimuovo righe eventualmente generate
        pyramid.innerHTML = "";

        const layers = [8, 4, 2, 1];
        layers.forEach((count, layerIndex) => {
            const row = document.createElement("div");
            row.className = "pyramid-row";

            for (let i = 0; i < count; i++) {
                const block = document.createElement("div");
                block.className = "pyramid-block";

                let name = "-";
                const baseStart = 0;

                if (layerIndex === 0 && i < players.length) {
                    name = players[i];
                }

                block.textContent = name;
                row.appendChild(block);
            }
            pyramid.appendChild(row);
        });
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
