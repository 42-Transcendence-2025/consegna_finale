import { MockTournamentApi } from "../../utils/mockTournamentApi.js";

export class TournamentController {
    titleSuffix = "Tournament Bracket";
    #mockApi = null;

    async init(tournamentId) {
        const useMock = false; // Imposta a true per usare l'API finta

        if (!tournamentId) {
            tournamentId = localStorage.getItem('currentTournamentId');
        }
        if (!tournamentId) {
            this.#showError($.i18n('noTournamentId'));
            window.location.hash = "#tournamentMenu";
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
            if (this._resizeListener) {
                window.removeEventListener('resize', this._resizeListener);
                this._resizeListener = null;
            }
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
            
            this.#bindQuitButton(tournamentId, data.status);
            this.#renderPyramid(data);
            this.#bindPlayButton(tournamentId, data.ready || false);

            if (
               !useMock && // Non iniziare match reali se usiamo l'API finta
               data.status === "full" &&
               data.ready === true
            ) {
                // Non avviare automaticamente il match, lasciare che l'utente clicchi Play
                // Il codice di avvio automatico è stato rimosso
            }
        } catch (err) {
            this.#showError($.i18n('failedToLoadTournamentData'));
            this.#bindQuitButton(tournamentId, null);
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
        
        // Aggiungi listener per il ridimensionamento della finestra
        this.#setupResizeListener(pyramid);
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
        // Rimuovi eventuali connettori esistenti
        const existingConnectors = pyramid.querySelectorAll('.connector-line');
        existingConnectors.forEach(line => line.remove());

        // Ottieni tutti i match dei quarti di finale (sia sinistra che destra)
        const leftQuarters = pyramid.querySelector('.left-section').querySelectorAll('.match-group');
        const rightQuarters = pyramid.querySelector('.right-section').querySelectorAll('.match-group');

        // Funzione per creare linea da un singolo rettangolo
        const createLineFromMatch = (matchGroup, direction) => {
            // Trova tutti i player-block dentro questo match
            const playerBlocks = matchGroup.querySelectorAll('.player-block');
            
            playerBlocks.forEach(playerBlock => {
                const rect = playerBlock.getBoundingClientRect();
                const pyramidRect = pyramid.getBoundingClientRect();
                
                const line = document.createElement('div');
                line.style.position = 'absolute';
                
                if (direction === 'right') {
                    // Attacca la linea direttamente al bordo destro del rettangolo
                    line.style.left = `${rect.right - pyramidRect.left - 5}px`;
                } else {
                    // Attacca la linea direttamente al bordo sinistro del rettangolo
                    line.style.left = `${rect.left - pyramidRect.left - 50}px`;
                }
                
                line.style.top = `${rect.top + rect.height / 2 - pyramidRect.top - 1.5}px`;
                line.style.width = '55px';
                line.style.height = '2px';
                line.style.backgroundColor = '#ffff00';
                line.style.zIndex = '10';
                
                pyramid.appendChild(line);
                console.log('Linea creata da player block:', playerBlock.textContent);
            });
        };

        // Crea linee dai quarti di sinistra verso destra
        leftQuarters.forEach(quarter => {
            createLineFromMatch(quarter, 'right');
        });

        // Crea linee dai quarti di destra verso sinistra
        rightQuarters.forEach(quarter => {
            createLineFromMatch(quarter, 'left');
        });

        // Aggiungi linee verticali per collegare le linee orizzontali
        this.#addVerticalConnectors(pyramid, leftQuarters, rightQuarters);
        
        // Aggiungi linee orizzontali dalle semifinali
        this.#addSemifinalLines(pyramid);
        
        // Aggiungi linee verticali che collegano semifinali ai quarti
        this.#addSemifinalToQuarterConnectors(pyramid);
        
        // Aggiungi linee verticali che collegano le semifinali alla finale
        this.#addSemifinalToFinalConnectors(pyramid);
    }

    #addVerticalConnectors(pyramid, leftQuarters, rightQuarters) {
        const pyramidRect = pyramid.getBoundingClientRect();

        // Crea una linea verticale per ogni quarto di finale (4 linee totali)
        
        // Linee verticali per i quarti di sinistra
        leftQuarters.forEach((quarter, index) => {
            const playerBlocks = quarter.querySelectorAll('.player-block');
            
            if (playerBlocks.length >= 2) {
                const topPlayerRect = playerBlocks[0].getBoundingClientRect();
                const bottomPlayerRect = playerBlocks[1].getBoundingClientRect();
                
                // Calcola la posizione della linea verticale
                const lineLeft = topPlayerRect.right - pyramidRect.left + 48; // Alla fine delle linee orizzontali
                const lineTop = topPlayerRect.top + topPlayerRect.height / 2 - pyramidRect.top;
                const lineHeight = bottomPlayerRect.top + bottomPlayerRect.height / 2 - topPlayerRect.top - topPlayerRect.height / 2;
                
                const verticalLine = document.createElement('div');
                verticalLine.style.position = 'absolute';
                verticalLine.style.left = `${lineLeft}px`;
                verticalLine.style.top = `${lineTop}px`;
                verticalLine.style.width = '2px';
                verticalLine.style.height = `${lineHeight}px`;
                verticalLine.style.backgroundColor = '#ffff00';
                verticalLine.style.zIndex = '10';
                
                pyramid.appendChild(verticalLine);

                // Aggiungi linea orizzontale dal centro della linea verticale verso destra
                const horizontalLine = document.createElement('div');
                horizontalLine.style.position = 'absolute';
                horizontalLine.style.left = `${lineLeft}px`; // Parte dalla linea verticale
                horizontalLine.style.top = `${lineTop + lineHeight / 2 - 1}px`; // Centro della linea verticale
                horizontalLine.style.width = '70px'; // Lunghezza verso destra
                horizontalLine.style.height = '2px';
                horizontalLine.style.backgroundColor = '#ffff00';
                horizontalLine.style.zIndex = '10';
                
                pyramid.appendChild(horizontalLine);
            }
        });

        // Linee verticali per i quarti di destra
        rightQuarters.forEach((quarter, index) => {
            const playerBlocks = quarter.querySelectorAll('.player-block');
            
            if (playerBlocks.length >= 2) {
                const topPlayerRect = playerBlocks[0].getBoundingClientRect();
                const bottomPlayerRect = playerBlocks[1].getBoundingClientRect();
                
                // Calcola la posizione della linea verticale
                const lineLeft = topPlayerRect.left - pyramidRect.left - 50; // All'inizio delle linee orizzontali
                const lineTop = topPlayerRect.top + topPlayerRect.height / 2 - pyramidRect.top;
                const lineHeight = bottomPlayerRect.top + bottomPlayerRect.height / 2 - topPlayerRect.top - topPlayerRect.height / 2;
                
                const verticalLine = document.createElement('div');
                verticalLine.style.position = 'absolute';
                verticalLine.style.left = `${lineLeft}px`;
                verticalLine.style.top = `${lineTop}px`;
                verticalLine.style.width = '2px';
                verticalLine.style.height = `${lineHeight}px`;
                verticalLine.style.backgroundColor = '#ffff00';
                verticalLine.style.zIndex = '10';
                
                pyramid.appendChild(verticalLine);

                // Aggiungi linea orizzontale dal centro della linea verticale verso sinistra
                const horizontalLine = document.createElement('div');
                horizontalLine.style.position = 'absolute';
                horizontalLine.style.left = `${lineLeft - 68}px`; // Parte 68px a sinistra della linea verticale
                horizontalLine.style.top = `${lineTop + lineHeight / 2 - 1}px`; // Centro della linea verticale
                horizontalLine.style.width = '68px'; // Lunghezza verso sinistra
                horizontalLine.style.height = '2px';
                horizontalLine.style.backgroundColor = '#ffff00';
                horizontalLine.style.zIndex = '10';
                
                pyramid.appendChild(horizontalLine);
            }
        });
    }

    #addSemifinalLines(pyramid) {
        const pyramidRect = pyramid.getBoundingClientRect();
        
        // Ottieni le sezioni delle semifinali
        const leftSemifinalSection = pyramid.querySelector('.left-section ~ .semifinal-section');
        const rightSemifinalSection = pyramid.querySelector('.semifinal-section ~ .final-section ~ .semifinal-section');
        
        // Linee per la semifinale sinistra
        if (leftSemifinalSection) {
            const playerBlocks = leftSemifinalSection.querySelectorAll('.player-block');
            
            playerBlocks.forEach(playerBlock => {
                const rect = playerBlock.getBoundingClientRect();
                
                // Linea verso sinistra (verso i quarti)
                const leftLine = document.createElement('div');
                leftLine.style.position = 'absolute';
                leftLine.style.left = `${rect.left - pyramidRect.left - 50}px`;
                leftLine.style.top = `${rect.top + rect.height / 2 - pyramidRect.top - 1.5}px`;
                leftLine.style.width = '55px';
                leftLine.style.height = '2px';
                leftLine.style.backgroundColor = '#ffff00';
                leftLine.style.zIndex = '10';
                
                pyramid.appendChild(leftLine);
                
                // Linea verso destra (verso la finale)
                const rightLine = document.createElement('div');
                rightLine.style.position = 'absolute';
                rightLine.style.left = `${rect.right - pyramidRect.left - 5}px`;
                rightLine.style.top = `${rect.top + rect.height / 2 - pyramidRect.top - 1.5}px`;
                rightLine.style.width = '65px';
                rightLine.style.height = '2px';
                rightLine.style.backgroundColor = '#ffff00';
                rightLine.style.zIndex = '10';
                
                pyramid.appendChild(rightLine);
            });
        }
        
        // Linee per la semifinale destra
        if (rightSemifinalSection) {
            const playerBlocks = rightSemifinalSection.querySelectorAll('.player-block');
            
            playerBlocks.forEach(playerBlock => {
                const rect = playerBlock.getBoundingClientRect();
                
                // Linea verso destra (verso i quarti)
                const rightLine = document.createElement('div');
                rightLine.style.position = 'absolute';
                rightLine.style.left = `${rect.right - pyramidRect.left - 5}px`;
                rightLine.style.top = `${rect.top + rect.height / 2 - pyramidRect.top - 1.5}px`;
                rightLine.style.width = '55px';
                rightLine.style.height = '2px';
                rightLine.style.backgroundColor = '#ffff00';
                rightLine.style.zIndex = '10';
                
                pyramid.appendChild(rightLine);
                
                // Linea verso sinistra (verso la finale)
                const leftLine = document.createElement('div');
                leftLine.style.position = 'absolute';
                leftLine.style.left = `${rect.left - pyramidRect.left - 55}px`;
                leftLine.style.top = `${rect.top + rect.height / 2 - pyramidRect.top - 1.5}px`;
                leftLine.style.width = '60px';
                leftLine.style.height = '2px';
                leftLine.style.backgroundColor = '#ffff00';
                leftLine.style.zIndex = '10';
                
                pyramid.appendChild(leftLine);
            });
        }
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

    #setupResizeListener(pyramid) {
        // Rimuovi eventuali listener precedenti per evitare duplicati
        if (this._resizeListener) {
            window.removeEventListener('resize', this._resizeListener);
        }
        
        // Crea il nuovo listener
        this._resizeListener = () => {
            // Aspetta un po' per permettere al DOM di aggiornarsi
            setTimeout(() => {
                this.#addConnectors(pyramid);
            }, 100);
        };
        
        // Aggiungi il listener
        window.addEventListener('resize', this._resizeListener);
    }

    #addSemifinalToQuarterConnectors(pyramid) {
        const pyramidRect = pyramid.getBoundingClientRect();
        
        // Ottieni le sezioni delle semifinali
        const leftSemifinalSection = pyramid.querySelector('.left-section ~ .semifinal-section');
        const rightSemifinalSection = pyramid.querySelector('.semifinal-section ~ .final-section ~ .semifinal-section');
        
        // Connettori verticali per il lato sinistro (2 linee)
        if (leftSemifinalSection) {
            const playerBlocks = leftSemifinalSection.querySelectorAll('.player-block');
            
            playerBlocks.forEach((playerBlock, playerIndex) => {
                const rect = playerBlock.getBoundingClientRect();
                
                // Posizione Y del player block della semifinale
                const semifinalY = rect.top + rect.height / 2 - pyramidRect.top;
                
                // Posizione X dove finisce la linea orizzontale della semifinale
                const lineStartX = rect.left - pyramidRect.left - 50;
                
                // Calcola la posizione Y dove dovrebbe arrivare (linee dai quarti)
                // Il primo player (index 0) va verso l'alto, il secondo (index 1) verso il basso
                let targetY;
                if (playerIndex === 0) {
                    // Top player - va verso l'alto (primo quarto)
                    targetY = semifinalY - 145;
                } else {
                    // Bottom player - va verso il basso (secondo quarto)
                    targetY = semifinalY + 145;
                }
                
                const verticalLine = document.createElement('div');
                verticalLine.style.position = 'absolute';
                verticalLine.style.left = `${lineStartX}px`;
                verticalLine.style.top = `${Math.min(semifinalY, targetY)}px`;
                verticalLine.style.width = '2px';
                verticalLine.style.height = `${Math.abs(targetY - semifinalY)}px`;
                verticalLine.style.backgroundColor = '#ffff00';
                verticalLine.style.zIndex = '10';
                
                pyramid.appendChild(verticalLine);
            });
        }
        
        // Connettori verticali per il lato destro (2 linee)
        if (rightSemifinalSection) {
            const playerBlocks = rightSemifinalSection.querySelectorAll('.player-block');
            
            playerBlocks.forEach((playerBlock, playerIndex) => {
                const rect = playerBlock.getBoundingClientRect();
                
                // Posizione Y del player block della semifinale
                const semifinalY = rect.top + rect.height / 2 - pyramidRect.top;
                
                // Posizione X dove finisce la linea orizzontale della semifinale
                const lineStartX = rect.right - pyramidRect.left + 50;
                
                // Calcola la posizione Y dove dovrebbe arrivare (linee dai quarti)
                let targetY;
                if (playerIndex === 0) {
                    // Top player - va verso l'alto (primo quarto)
                    targetY = semifinalY - 145;
                } else {
                    // Bottom player - va verso il basso (secondo quarto)
                    targetY = semifinalY + 145;
                }
                
                const verticalLine = document.createElement('div');
                verticalLine.style.position = 'absolute';
                verticalLine.style.left = `${lineStartX - 2}px`;
                verticalLine.style.top = `${Math.min(semifinalY, targetY)}px`;
                verticalLine.style.width = '2px';
                verticalLine.style.height = `${Math.abs(targetY - semifinalY)}px`;
                verticalLine.style.backgroundColor = '#ffff00';
                verticalLine.style.zIndex = '10';
                
                pyramid.appendChild(verticalLine);
            });
        }
    }

    #addSemifinalToFinalConnectors(pyramid) {
        const pyramidRect = pyramid.getBoundingClientRect();
        
        // Ottieni le sezioni delle semifinali e della finale
        const leftSemifinalSection = pyramid.querySelector('.left-section ~ .semifinal-section');
        const rightSemifinalSection = pyramid.querySelector('.semifinal-section ~ .final-section ~ .semifinal-section');
        const finalSection = pyramid.querySelector('.final-section');
        
        // Connettori verticali per il lato sinistro (collega le 2 linee verso la finale)
        if (leftSemifinalSection) {
            const playerBlocks = leftSemifinalSection.querySelectorAll('.player-block');
            
            if (playerBlocks.length >= 2) {
                const topPlayerRect = playerBlocks[0].getBoundingClientRect();
                const bottomPlayerRect = playerBlocks[1].getBoundingClientRect();
                
                // Posizione Y dei player block
                const topY = topPlayerRect.top + topPlayerRect.height / 2 - pyramidRect.top;
                const bottomY = bottomPlayerRect.top + bottomPlayerRect.height / 2 - pyramidRect.top;
                
                // Posizione X alla fine delle linee orizzontali verso la finale
                const lineX = topPlayerRect.right - pyramidRect.left + 58; // 50px di linea - 5px
                
                const verticalLine = document.createElement('div');
                verticalLine.style.position = 'absolute';
                verticalLine.style.left = `${lineX}px`;
                verticalLine.style.top = `${topY}px`;
                verticalLine.style.width = '2px';
                verticalLine.style.height = `${bottomY - topY}px`;
                verticalLine.style.backgroundColor = '#ffff00';
                verticalLine.style.zIndex = '10';
                
                pyramid.appendChild(verticalLine);
                
                // Linea orizzontale dal centro della linea verticale verso la finale (verso destra)
                const centerY = topY + (bottomY - topY) / 2;
                const horizontalLineToFinal = document.createElement('div');
                horizontalLineToFinal.style.position = 'absolute';
                horizontalLineToFinal.style.left = `${lineX}px`;
                horizontalLineToFinal.style.top = `${centerY - 1}px`;
                horizontalLineToFinal.style.width = '70px'; // Lunghezza verso la finale
                horizontalLineToFinal.style.height = '2px';
                horizontalLineToFinal.style.backgroundColor = '#ffff00';
                horizontalLineToFinal.style.zIndex = '10';
                
                pyramid.appendChild(horizontalLineToFinal);
            }
        }
        
        // Connettori verticali per il lato destro (collega le 2 linee verso la finale)
        if (rightSemifinalSection) {
            const playerBlocks = rightSemifinalSection.querySelectorAll('.player-block');
            
            if (playerBlocks.length >= 2) {
                const topPlayerRect = playerBlocks[0].getBoundingClientRect();
                const bottomPlayerRect = playerBlocks[1].getBoundingClientRect();
                
                // Posizione Y dei player block
                const topY = topPlayerRect.top + topPlayerRect.height / 2 - pyramidRect.top;
                const bottomY = bottomPlayerRect.top + bottomPlayerRect.height / 2 - pyramidRect.top;
                
                // Posizione X alla fine delle linee orizzontali verso la finale (verso sinistra)
                const lineX = topPlayerRect.left - pyramidRect.left - 55; // -45px di linea - 2px
                
                const verticalLine = document.createElement('div');
                verticalLine.style.position = 'absolute';
                verticalLine.style.left = `${lineX}px`;
                verticalLine.style.top = `${topY}px`;
                verticalLine.style.width = '2px';
                verticalLine.style.height = `${bottomY - topY}px`;
                verticalLine.style.backgroundColor = '#ffff00';
                verticalLine.style.zIndex = '10';
                
                pyramid.appendChild(verticalLine);
                
                // Linea orizzontale dal centro della linea verticale verso la finale (verso sinistra)
                const centerY = topY + (bottomY - topY) / 2;
                const horizontalLineToFinal = document.createElement('div');
                horizontalLineToFinal.style.position = 'absolute';
                horizontalLineToFinal.style.left = `${lineX - 72}px`; // 60px a sinistra della linea verticale
                horizontalLineToFinal.style.top = `${centerY - 1}px`;
                horizontalLineToFinal.style.width = '72px'; // Lunghezza verso la finale
                horizontalLineToFinal.style.height = '2px';
                horizontalLineToFinal.style.backgroundColor = '#ffff00';
                horizontalLineToFinal.style.zIndex = '10';
                
                pyramid.appendChild(horizontalLineToFinal);
            }
        }
    }
}
