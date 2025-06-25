export class MatchManager {

    /** @type {string}*/
    #matchApiUrl;

    #id = new Date().getTime();
    #isLoading = false;
    /** @type {{[key:string]: string} | null} */
    #matchErrors = null;
    /** @type {JQuery.jqXHR | null} */
    #currentJqXHR = null; // Per memorizzare la richiesta AJAX corrente

    constructor(matchApiUrl) {
        this.#matchApiUrl = matchApiUrl;

        if (window.tools.matchManager) {
            window.tools.matchManager.destroy();
        }
        window.tools.matchManager = this;
        console.debug(`MatchManager created. #${this.#id}`);
    }

    async matchPassword(password) {
        this.#isLoading = true;
        this.#matchErrors = {};

        // Se c'è già una richiesta in corso, annullala (opzionale, dipende dal comportamento desiderato)
        if (this.#currentJqXHR) {
            this.#currentJqXHR.abort();
        }

        return new Promise((resolve, reject) => {
            this.#currentJqXHR = $.ajax({
                url: `${this.#matchApiUrl}/match/private-password/`,
                method: "POST",
                data: {
                    password: password,
                },
            })
            .done((data) => {
                this.#matchErrors = null;
                resolve(data); // Risolve la Promise con i dati
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                if (textStatus === 'abort') {
                    console.log('MatchManager: AJAX request aborted.');
                    // Rigetta la Promise con un errore specifico per l'annullamento
                    reject({ name: 'AbortError', message: 'Request aborted by user via MatchManager' });
                } else {
                    if (jqXHR.responseJSON) {
                        this.#matchErrors = jqXHR.responseJSON;
                    } else if (jqXHR.responseText) {
                        try { this.#matchErrors = JSON.parse(jqXHR.responseText); }
                        catch (e) { this.#matchErrors = { error: "Error parsing server response" }; }
                    } else {
                        this.#matchErrors = { error: errorThrown || "Unknown AJAX error" };
                    }
                    console.error('Match password failed:', textStatus, this.#matchErrors);
                    // Rigetta la Promise con l'errore
                    reject(new Error(this.#matchErrors.error?.toString() || errorThrown || 'Match request failed'));
                }
            })
            .always(() => {
                this.#isLoading = false;
                this.#currentJqXHR = null; // Pulisci la richiesta memorizzata
            });
        });
    }

    // Nuovo metodo per annullare la richiesta corrente dall'esterno
    abortCurrentMatchRequest() {
        if (this.#currentJqXHR) {
            console.log("MatchManager: Aborting current request via abortCurrentMatchRequest()");
            this.#currentJqXHR.abort(); // Questo attiverà .fail() con textStatus 'abort'
            return true;
        }
        return false;
    }

    async fetchTournaments() {
        return $.ajax({
            url: `${this.#matchApiUrl}/match/tournament/`,
            method: "GET",
            dataType: "json"
        });
    }
    
    async createTournament(name) {
        return $.ajax({
            url: `${this.#matchApiUrl}/match/tournament/`,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ name })
        });
    }
    
    async getTournamentDetails(tournamentId) {
        return $.ajax({
            url: `${this.#matchApiUrl}/match/tournament/${tournamentId}/`,
            method: "GET",
            dataType: "json"
        });
    }
    
    async subscribeToTournament(tournamentId) {
        return $.ajax({
            url: `${this.#matchApiUrl}/match/tournament/${tournamentId}/`,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ id: tournamentId })
        });
    }

    async quitTournament(tournamentId) {
        return $.ajax({
            url: `${this.#matchApiUrl}/match/tournament/${tournamentId}/`,
            method: "DELETE"
        });
    }

    async matchTournament(tournamentId) {
        return $.ajax({
            url: `${this.#matchApiUrl}/match/tournament/${tournamentId}/`,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ id: tournamentId })
        });
    }

    destroy() {
        // Potresti voler annullare una richiesta in corso anche qui
        this.abortCurrentMatchRequest();
        console.debug(`MatchManager destroyed. #${this.#id}`);
        if (window.tools.matchManager === this) {
            window.tools.matchManager = null;
        }
    }
}