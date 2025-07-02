import { MockTournamentApi } from "../../utils/mockTournamentApi.js";

export class TournamentController {
    titleSuffix = "Tournament Bracket";
    #mockApi = null;

    async init(tournamentId) {
        const useMock = true; // Imposta a true per usare l'API finta

        if (!tournamentId) {
            tournamentId = localStorage.getItem('currentTournamentId');
        }
        if (!tournamentId) {
            this.#showError($.i18n('noTournamentId'));
            return;
        }

        if (useMock) {
            console.log("Usando Mock Tournament API");
            this.#mockApi = new MockTournamentApi(tournamentId);
        } else {
            this.#mockApi = null;
        }

        if (this._tournamentInterval)
            clearInterval(this._tournamentInterval);

        this.#fetchAndRenderPyramid(tournamentId, useMock);
        this.#setupLanguageChangeListener(tournamentId, useMock);
        this._tournamentInterval = setInterval(() => this.#fetchAndRenderPyramid(tournamentId, useMock), 5000);

        $(window).one("hashchange", () => {
            clearInterval(this._tournamentInterval);
            if (this.#mockApi) {
                this.#mockApi.destroy();
            }
        });
    }

    async #fetchAndRenderPyramid(tournamentId, useMock = false) {
        try {
            const data = useMock
                ? await this.#mockApi.getTournamentDetails()
                : await window.tools.matchManager.getTournamentDetails(tournamentId);

            this.#renderPyramid(data);
            this.#bindQuitButton(tournamentId);

            if (
               !useMock && // Non iniziare match reali se usiamo l'API finta
               data.status === "full" &&
               data.ready === true
            ) {
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
            this.#showError($.i18n('failedToLoadTournamentData'));
        }
    }

    #renderPyramid(tournament) {
        // Ottieni i risultati dei match per aggiornare il bracket
        const matchResults = this.#getMatchResults(tournament.matches || []);

        const pyramid = document.querySelector(".tournament-bracket-container");
        if (!pyramid) return;
        
        // Pulisce il contenuto esistente
        pyramid.innerHTML = "";

        // --- QUARTI DI FINALE ---
        const qf_top_left = matchResults.quarterfinals[0];
        const qf_bottom_left = matchResults.quarterfinals[1];
        const qf_top_right = matchResults.quarterfinals[2];
        const qf_bottom_right = matchResults.quarterfinals[3];

        // --- SEMIFINALI ---
        const sf_left = matchResults.semifinals[0];
        const sf_right = matchResults.semifinals[1];
        // --- FINALE ---
        const final = matchResults.final;
        
        // Sezione sinistra (primi 2 quarti)
        const leftSection = document.createElement("div");
        leftSection.className = "bracket-section left-section";
        leftSection.appendChild(this.#createMatchElement(qf_top_left, [qf_top_left?.player_1, qf_top_left?.player_2]));
        leftSection.appendChild(this.#createMatchElement(qf_bottom_left, [qf_bottom_left?.player_1, qf_bottom_left?.player_2]));
        
        // Sezione destra (ultimi 2 quarti)
        const rightSection = document.createElement("div");
        rightSection.className = "bracket-section right-section";
        rightSection.appendChild(this.#createMatchElement(qf_top_right, [qf_top_right?.player_1, qf_top_right?.player_2]));
        rightSection.appendChild(this.#createMatchElement(qf_bottom_right, [qf_bottom_right?.player_1, qf_bottom_right?.player_2]));

        // Sezione semifinale sinistra
        const leftSemifinalSection = document.createElement("div");
        leftSemifinalSection.className = "bracket-section semifinal-section";
        leftSemifinalSection.appendChild(this.#createMatchElement(sf_left, [sf_left?.player_1, sf_left?.player_2], "semifinal"));

        // Sezione semifinale destra
        const rightSemifinalSection = document.createElement("div");
        rightSemifinalSection.className = "bracket-section semifinal-section";
        rightSemifinalSection.appendChild(this.#createMatchElement(sf_right, [sf_right?.player_1, sf_right?.player_2], "semifinal"));

        // Sezione finale
        const finalSection = document.createElement("div");
        finalSection.className = "bracket-section final-section";
        finalSection.appendChild(this.#createMatchElement(final, [final?.player_1, final?.player_2], "final"));

        // Aggiungi le sezioni al DOM
        pyramid.appendChild(leftSection);
        pyramid.appendChild(leftSemifinalSection);
        pyramid.appendChild(finalSection);
        pyramid.appendChild(rightSemifinalSection);
        pyramid.appendChild(rightSection);

        // Aggiungi connettori e linee decorative
        this.#addConnectors(pyramid);
    }

    #createMatchElement(match, players, type = 'quarterfinal') {
        const matchGroup = document.createElement("div");
        matchGroup.className = "match-group";

        const matchContainer = document.createElement('div');
        matchContainer.className = `tournament-match-block ${type}`;

        const player1Block = document.createElement("div");
        player1Block.className = "player-block";
        player1Block.textContent = players[0] && players[0] !== 'null' ? players[0] : "Waiting...";

        const vsText = document.createElement("div");
        vsText.className = "vs-text";
        vsText.textContent = "VS";

        const player2Block = document.createElement("div");
        player2Block.className = "player-block";
        player2Block.textContent = players[1] && players[1] !== 'null' ? players[1] : "Waiting...";

        if (type === 'final') {
            player1Block.classList.add('final-player');
            player2Block.classList.add('final-player');
            vsText.classList.add('final-vs-text');
        }

        if (match && match.winner && match.winner !== 'null') {
            if (match.winner === players[0]) {
                player1Block.classList.add("winner");
                player2Block.classList.add("loser");
            } else if (match.winner === players[1]) {
                player1Block.classList.add("loser");
                player2Block.classList.add("winner");
            }
        }

        if (match && match.status === 'in_game') {
            player1Block.classList.add('in-game');
            player2Block.classList.add('in-game');
        }

        matchContainer.appendChild(player1Block);
        matchContainer.appendChild(vsText);
        matchContainer.appendChild(player2Block);
        matchGroup.appendChild(matchContainer);

        return matchGroup;
    }

    #addConnectors(pyramid) {
        // Questa funzione può essere espansa per aggiungere linee e connettori SVG o CSS
        // per collegare visivamente i match nel bracket.
    }

    #bindQuitButton(tournamentId) {
        const quitBtn = document.getElementById("quitTournamentBtn");
        if (!quitBtn) return;

        quitBtn.addEventListener("click", async () => {
            if (!confirm($.i18n('quitTournamentConfirm'))) return;

            try {
                await window.tools.matchManager.quitTournament(tournamentId);        // vedi nota ①
                clearInterval(this._tournamentInterval);
                localStorage.removeItem("currentTournamentId");
                window.location.hash = "#tournamentMenu";
            } catch (err) {
                alert($.i18n('failedToQuitTournament'));
            }
        });
    }

    #showError(msg) {
        const container = document.getElementById("bracket-container");
        if (container) {
            container.innerHTML = `<div class='alert alert-danger'>${msg}</div>`;
        }
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

    #setupLanguageChangeListener(tournamentId, useMock) {
        // Ascolta i cambi di lingua e ri-renderizza il bracket
        document.addEventListener('languageChanged', () => {
            this.#fetchAndRenderPyramid(tournamentId, useMock);
        });
    }
}
