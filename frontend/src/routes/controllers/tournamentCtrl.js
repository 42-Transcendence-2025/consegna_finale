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
        try {
            const data = await $.ajax({
                url: window.config.apiRoutes.matchApiUrl + "/match/tournament/" + tournamentId + "/",
                method: "GET",
                dataType: "json"
            });
            this.#renderPyramid(data);
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

    #showError(msg) {
        const container = document.getElementById("bracket-container");
        if (container) {
            container.innerHTML = `<div class='alert alert-danger'>${msg}</div>`;
        }
    }
}
