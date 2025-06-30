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

        // Ottieni i risultati dei match per aggiornare il bracket
        const matchResults = this.#getMatchResults(tournament.matches || []);

        const pyramid = document.querySelector(".tournament-bracket-container");
        if (!pyramid) return;
        
        // Pulisce il contenuto esistente
        pyramid.innerHTML = "";
        
        // Sezione sinistra (primi 4 giocatori)
        const leftSection = document.createElement("div");
        leftSection.className = "bracket-section left-section";
        const verticalLineLeft = document.createElement("div");
        verticalLineLeft.className = "vertical-connector";
        leftSection.appendChild(verticalLineLeft);
        
        // Linea orizzontale dalla linea verticale sinistra alla semifinale
        const horizontalToSemiLeft = document.createElement("div");
        horizontalToSemiLeft.className = "horizontal-to-semi-left";
        leftSection.appendChild(horizontalToSemiLeft);
        
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
            
            // Aggiungi classi per vincitori/perdenti se il match è finito
            const quarterIndex = Math.floor(i / 2); // 0 per i=0,1 e 1 per i=2,3
            const quarterMatch = matchResults.quarterfinals[quarterIndex];
            if (quarterMatch && quarterMatch.winner) {
                const player1 = players[i];
                const player2 = players[i + 1];
                if (quarterMatch.winner === player1) {
                    player1Name.classList.add("winner");
                    player2Name.classList.add("loser");
                } else if (quarterMatch.winner === player2) {
                    player1Name.classList.add("loser");
                    player2Name.classList.add("winner");
                }
            }
            
            matchBlock.appendChild(player1Name);
            matchBlock.appendChild(vsText);
            matchBlock.appendChild(player2Name);
            matchGroup.appendChild(matchBlock);
            leftSection.appendChild(matchGroup);
        }
        
        // Sezione destra (ultimi 4 giocatori)
        const rightSection = document.createElement("div");
        rightSection.className = "bracket-section right-section";
        const verticalLineRight = document.createElement("div");
        verticalLineRight.className = "vertical-connector";
        rightSection.appendChild(verticalLineRight);

        // Linea orizzontale dalla linea verticale destra alla semifinale
        const horizontalToSemiRight = document.createElement("div");
        horizontalToSemiRight.className = "horizontal-to-semi-right";
        rightSection.appendChild(horizontalToSemiRight);

        
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
            
            // Aggiungi classi per vincitori/perdenti se il match è finito
            const quarterIndex = Math.floor(i / 2); // 2 per i=4,5 e 3 per i=6,7
            const quarterMatch = matchResults.quarterfinals[quarterIndex];
            if (quarterMatch && quarterMatch.winner) {
                const player1 = players[i];
                const player2 = players[i + 1];
                if (quarterMatch.winner === player1) {
                    player1Name.classList.add("winner");
                    player2Name.classList.add("loser");
                } else if (quarterMatch.winner === player2) {
                    player1Name.classList.add("loser");
                    player2Name.classList.add("winner");
                }
            }
            
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
        
        // Linea orizzontale che esce dalla semifinale sinistra
        const horizontalLineLeft = document.createElement("div");
        horizontalLineLeft.className = "horizontal-connector-left";
        semifinal1Group.appendChild(horizontalLineLeft);
        
        const semi1Player1 = document.createElement("div");
        semi1Player1.className = "player-name";
        semi1Player1.textContent = matchResults.semifinals[0]?.player_1 || "TBD";
        
        const semi1Vs = document.createElement("div");
        semi1Vs.className = "vs-text";
        semi1Vs.textContent = "VS";
        
        const semi1Player2 = document.createElement("div");
        semi1Player2.className = "player-name";
        semi1Player2.textContent = matchResults.semifinals[0]?.player_2 || "TBD";
        
        // Aggiungi classi per vincitori/perdenti
        const semi1Match = matchResults.semifinals[0];
        if (semi1Match && semi1Match.winner) {
            if (semi1Match.winner === semi1Match.player_1) {
                semi1Player1.classList.add("winner");
                semi1Player2.classList.add("loser");
            } else if (semi1Match.winner === semi1Match.player_2) {
                semi1Player1.classList.add("loser");
                semi1Player2.classList.add("winner");
            }
        }
        
        semifinal1Block.appendChild(semi1Player1);
        semifinal1Block.appendChild(semi1Vs);
        semifinal1Block.appendChild(semi1Player2);
        semifinal1Group.appendChild(semifinal1Block);
        leftSemifinalSection.appendChild(semifinal1Group);
        
        // Sezione finale (centro assoluto)
        const finalSection = document.createElement("div");
        finalSection.className = "bracket-section final-section";
        
        // Linea verticale che unisce le linee orizzontali di semifinali e finale
        const centralVerticalLineLeft = document.createElement("div");
        centralVerticalLineLeft.className = "central-vertical-connector-left";
        finalSection.appendChild(centralVerticalLineLeft);

        const centralVerticalLineRight = document.createElement("div");
        centralVerticalLineRight.className = "central-vertical-connector-right";
        finalSection.appendChild(centralVerticalLineRight);
        
        const finalGroup = document.createElement("div");
        finalGroup.className = "match-group final-match-group";
        
        // Primo rettangolo della finale
        const finalPlayer1Block = document.createElement("div");
        finalPlayer1Block.className = "tournament-player-block final-player";
        finalPlayer1Block.textContent = matchResults.final?.player_1 || "TBD";
        
        // Linea orizzontale che esce a sinistra dal primo rettangolo della finale
        const finalLineLeft = document.createElement("div");
        finalLineLeft.className = "final-connector-left";
        finalGroup.appendChild(finalLineLeft);
        
        // Scritta VS centrale
        const finalVsText = document.createElement("div");
        finalVsText.className = "final-vs-text";
        finalVsText.textContent = "VS";
        
        // Secondo rettangolo della finale
        const finalPlayer2Block = document.createElement("div");
        finalPlayer2Block.className = "tournament-player-block final-player";
        finalPlayer2Block.textContent = matchResults.final?.player_2 || "TBD";
        
        // Linea orizzontale che esce a destra dal secondo rettangolo della finale
        const finalLineRight = document.createElement("div");
        finalLineRight.className = "final-connector-right";
        finalGroup.appendChild(finalLineRight);
        
        // Aggiungi classi per vincitori/perdenti nella finale
        const finalMatch = matchResults.final;
        if (finalMatch && finalMatch.winner) {
            if (finalMatch.winner === finalMatch.player_1) {
                finalPlayer1Block.classList.add("winner");
                finalPlayer2Block.classList.add("loser");
            } else if (finalMatch.winner === finalMatch.player_2) {
                finalPlayer1Block.classList.add("loser");
                finalPlayer2Block.classList.add("winner");
            }
        }
        
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
        
        // Linea orizzontale che esce dalla semifinale destra
        const horizontalLineRight = document.createElement("div");
        horizontalLineRight.className = "horizontal-connector-right";
        semifinal2Group.appendChild(horizontalLineRight);
        
        const semi2Player1 = document.createElement("div");
        semi2Player1.className = "player-name";
        semi2Player1.textContent = matchResults.semifinals[1]?.player_1 || "TBD";
        
        const semi2Vs = document.createElement("div");
        semi2Vs.className = "vs-text";
        semi2Vs.textContent = "VS";
        
        const semi2Player2 = document.createElement("div");
        semi2Player2.className = "player-name";
        semi2Player2.textContent = matchResults.semifinals[1]?.player_2 || "TBD";
        
        // Aggiungi classi per vincitori/perdenti
        const semi2Match = matchResults.semifinals[1];
        if (semi2Match && semi2Match.winner) {
            if (semi2Match.winner === semi2Match.player_1) {
                semi2Player1.classList.add("winner");
                semi2Player2.classList.add("loser");
            } else if (semi2Match.winner === semi2Match.player_2) {
                semi2Player1.classList.add("loser");
                semi2Player2.classList.add("winner");
            }
        }
        
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

    #getMatchResults(matches) {
        // Inizializza la struttura dei risultati
        const results = {
            quarterfinals: [], // matches 0-3 (primi 4 match)
            semifinals: [],    // matches 4-5 (semifinali)
            final: null        // match 6 (finale)
        };
        
        // Ordina i match per match_number (se disponibile) o per ordine di creazione
        const sortedMatches = matches.sort((a, b) => {
            // Se abbiamo match_number, usa quello
            if (a.match_number !== undefined && b.match_number !== undefined) {
                return a.match_number - b.match_number;
            }
            // Altrimenti, usa l'ordine nell'array (dovrebbe essere già corretto)
            return matches.indexOf(a) - matches.indexOf(b);
        });
        
        // Assegna i match alle rispettive categorie
        sortedMatches.forEach((match, index) => {
            if (index < 4) {
                // Primi 4 match sono i quarti di finale
                results.quarterfinals[index] = match;
            } else if (index < 6) {
                // Match 4 e 5 sono le semifinali
                results.semifinals[index - 4] = match;
            } else if (index === 6) {
                // Match 6 è la finale
                results.final = match;
            }
        });
        
        return results;
    }
}
