/**
 * Simula un'API per i dettagli di un torneo, con stati che cambiano nel tempo.
 * La nuova struttura dati non ha più la sezione `players` e i giocatori
 * vengono inseriti direttamente nei match dei quarti di finale.
 */
export class MockTournamentApi {
    #tournamentState;
    #playerNames = ["Goku", "Vegeta", "Broly", "Gohan", "Trunks", "Majinbu", "Piccolo", "Cell"];
    #timeouts = [];

    constructor(tournamentId) {
        this.tournamentId = tournamentId;
        this.#initializeState();
        this.#startSimulation();
        console.log("MockTournamentApi Iniziata (Nuova Struttura).");
    }

    #initializeState() {
        this.#tournamentState = {
            id: this.tournamentId,
            name: "Mock DBZ Tournament",
            status: "joining",
            matches: Array(7).fill(null).map(() => ({
                player_1: "null",
                player_2: "null",
                winner: "null",
                status: "created"
            })),
            ready: false,
        };
    }

    #startSimulation() {
        this.destroy();

        const steps = [
            // 0-7: 8 giocatori si uniscono, uno ogni 2 secondi
            ...Array(8).fill(null).map((_, i) => ({ action: () => this.#addPlayer(i), delay: 2000 })),
            
            // 8: Il torneo è pieno e pronto per iniziare
            { action: () => this.#setTournamentReady(), delay: 1000 },

            { action: () => this.#setMatchInProgress(0), delay: 0 },
            { action: () => this.#setMatchInProgress(1), delay: 0 },
            { action: () => this.#setMatchInProgress(2), delay: 0 },
            { action: () => this.#setMatchInProgress(3), delay: 0 },
            // 9-12: I quarti di finale finiscono, uno ogni 5 secondi
            { action: () => this.#finishMatch(0, this.#playerNames[1]), delay: 5000 }, // Vegeta vince
            { action: () => this.#finishMatch(1, this.#playerNames[2]), delay: 5000 }, // Broly vince
            { action: () => this.#finishMatch(2, this.#playerNames[5]), delay: 5000 }, // Majinbu vince
            { action: () => this.#finishMatch(3, this.#playerNames[7]), delay: 5000 }, // Cell vince

            { action: () => this.#setMatchInProgress(4), delay: 0 }, // Semifinale 1 pronta
            { action: () => this.#setMatchInProgress(5), delay: 0 }, // Semifinale 2 pronta

            // 13-14: Le semifinali finiscono, una ogni 5 secondi
            { action: () => this.#finishMatch(4, this.#playerNames[2]), delay: 5000 }, // Broly vince
            { action: () => this.#finishMatch(5, this.#playerNames[7]), delay: 5000 }, // Cell vince

            { action: () => this.#setMatchInProgress(6), delay: 0 }, // Finale pronta

            // 15: La finale finisce
            { action: () => this.#finishMatch(6, this.#playerNames[7]), delay: 5000 }, // Cell vince il torneo
        ];

        let cumulativeDelay = 0;
        steps.forEach(step => {
            cumulativeDelay += step.delay;
            const timeoutId = setTimeout(() => {
                step.action();
            }, cumulativeDelay);
            this.#timeouts.push(timeoutId);
        });
    }

    #addPlayer(slot) {
        const playerName = this.#playerNames[slot];
        console.log(`MOCK: Aggiunto player ${playerName} allo slot ${slot}`);

        const matchIndex = Math.floor(slot / 2);
        const playerIndex = slot % 2;

        if (playerIndex === 0) {
            this.#tournamentState.matches[matchIndex].player_1 = playerName;
        } else {
            this.#tournamentState.matches[matchIndex].player_2 = playerName;
        }

        // Se è l'ultimo giocatore, imposta lo stato a "full"
        if (slot === 7) {
            this.#tournamentState.status = "full";
            console.log("MOCK: Torneo pieno!");
        }
    }

    #setTournamentReady() {
        this.#tournamentState.ready = true;
        for (let i = 0; i < 4; i++) {
            this.#tournamentState.matches[i].status = "in_game";
        }
        console.log("MOCK: Torneo pronto per iniziare i match! Quarti di finale in corso.");
    }

    #setMatchInProgress(matchIndex) {
        const match = this.#tournamentState.matches[matchIndex];
        if (match && match.player_1 !== "null" && match.player_2 !== "null") {
            match.status = "in_game";
            console.log(`MOCK: Match ${matchIndex} è ora in corso.`);
        }
    }

    #finishMatch(matchIndex, winner) {
        console.log(`MOCK: Fine match ${matchIndex}, vincitore: ${winner}`);
        const match = this.#tournamentState.matches[matchIndex];
        if (!match) return;

        match.winner = winner;
        match.status = "finished";

        // Popola il match successivo
        this.#populateNextMatch(matchIndex, winner);
    }

    #populateNextMatch(finishedMatchIndex, winner) {
        // Quarti di finale -> Semifinali
        if (finishedMatchIndex >= 0 && finishedMatchIndex <= 3) {
            const semiFinalIndex = 4 + Math.floor(finishedMatchIndex / 2);
            const semiFinalMatch = this.#tournamentState.matches[semiFinalIndex];
            
            if (finishedMatchIndex % 2 === 0) { // QF 0 o 2 -> player_1 della semi
                semiFinalMatch.player_1 = winner;
            } else { // QF 1 o 3 -> player_2 della semi
                semiFinalMatch.player_2 = winner;
            }
        }
        // Semifinali -> Finale
        else if (finishedMatchIndex >= 4 && finishedMatchIndex <= 5) {
            const finalMatch = this.#tournamentState.matches[6];
            if (finishedMatchIndex === 4) { // SF 0 -> player_1 della finale
                finalMatch.player_1 = winner;
            } else { // SF 1 -> player_2 della finale
                finalMatch.player_2 = winner;
            }

            if (finalMatch.player_1 !== "null" && finalMatch.player_2 !== "null") {
                finalMatch.status = "in_game";
                console.log("MOCK: Finale pronta per iniziare.");
            }
        }
        // Finale -> Fine torneo
        else if (finishedMatchIndex === 6) {
            this.#tournamentState.status = "finished";
            this.#tournamentState.winner = winner;
            console.log(`MOCK: Torneo finito! Vincitore: ${winner}`);
        }
    }

    getTournamentDetails() {
        // Ritorna una copia profonda per evitare modifiche esterne accidentali
        return Promise.resolve(JSON.parse(JSON.stringify(this.#tournamentState)));
    }

    destroy() {
        this.#timeouts.forEach(clearTimeout);
        this.#timeouts = [];
    }
}
