export class RankedMatchController {
    titleSuffix = "";
    #pollingInterval = null;

    init() {
        console.log("Ranked Match Controller");
        this.#bindEvents();
        this.#setupLanguageChangeListener();
        this.#loadPlayerTrophies();
    }

    #bindEvents() {
        const searchButton = document.getElementById("searchRankedButton");
        const loadingScreen = document.getElementById("rankedLoadingScreen");
        const formContainer = document.getElementById("rankedMatchFormContainer");
        const cancelSearchButton = document.getElementById("cancelRankedSearchButton");

        if (searchButton && loadingScreen && formContainer && cancelSearchButton) {
            searchButton.addEventListener("click", async () => {
                await this.#startRankedSearch();
            });

            cancelSearchButton.addEventListener("click", async () => {
                await this.#cancelRankedSearch();
            });
        } else {
            console.error("RankedMatch: Missing required elements");
        }
    }

    async #startRankedSearch() {
        const loadingScreen = document.getElementById("rankedLoadingScreen");
        const formContainer = document.getElementById("rankedMatchFormContainer");

        try {
            // Mostra schermata di caricamento
            formContainer.classList.add("d-none");
            loadingScreen.classList.remove("d-none");
            loadingScreen.classList.add("d-flex");

            // Avvia la ricerca
            const matchManager = window.tools.matchManager;
            await matchManager.startRankedMatch();

            // Inizia il polling per controllare lo stato
            this.#startPolling();

        } catch (error) {
            if (error.status === 409) {
                this.#startPolling(); // Inizia il polling se l'utente è già in coda
            }
            else {
                console.error("RankedMatch: Error starting search:", error);
                this.#showForm();
                this.#showError("Failed to start ranked match search");
            }
        }
    }

    #startPolling() {
        if (this.#pollingInterval) {
            clearInterval(this.#pollingInterval);
        }

        this.#pollingInterval = setInterval(async () => {
            try {
                const matchManager = window.tools.matchManager;
                const response = await matchManager.checkRankedMatchStatus();

                if (response && response.game_id) {
                    // Match trovato!
                    console.log("Ranked match found:", response);
                    this.#stopPolling();
                    localStorage.setItem("game_id", response.game_id);
                    window.location.hash = "#game";
                }
                // Se status è ancora "waiting", continua il polling
            } catch (error) {
                if (error.status === 404) {
                    // Matchmaking scaduto o cancellato
                    console.log("Ranked matchmaking expired or cancelled");
                    this.#stopPolling();
                    this.#showForm();
                } else if (error.status === 202) {
                    // Ancora in attesa, continua il polling
                    console.log("Still searching for ranked match...");
                } else {
                    console.error("RankedMatch: Polling error:", error);
                    this.#stopPolling();
                    this.#showForm();
                    this.#showError("Error during matchmaking");
                }
            }
        }, 2000); // Polling ogni 2 secondi
    }

    #stopPolling() {
        if (this.#pollingInterval) {
            clearInterval(this.#pollingInterval);
            this.#pollingInterval = null;
        }
    }

    async #cancelRankedSearch() {
        try {
            const matchManager = window.tools.matchManager;
            await matchManager.cancelRankedMatch();
            
            this.#stopPolling();
            this.#showForm();
            console.log("Ranked search cancelled");
        } catch (error) {
            console.error("RankedMatch: Error cancelling search:", error);
            this.#stopPolling();
            this.#showForm();
        }
    }

    #showForm() {
        const loadingScreen = document.getElementById("rankedLoadingScreen");
        const formContainer = document.getElementById("rankedMatchFormContainer");

        loadingScreen.classList.add("d-none");
        loadingScreen.classList.remove("d-flex");
        formContainer.classList.remove("d-none");
    }

    #showError(message) {
        // Mostra un messaggio di errore temporaneo
        const errorDiv = document.createElement("div");
        errorDiv.className = "alert alert-danger position-fixed start-50 translate-middle-x";
        errorDiv.style.top = "20px";
        errorDiv.style.zIndex = "9999";
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    async #loadPlayerTrophies() {
        try {
            // Carica i trofei dell'utente dal localStorage o API
            const authManager = window.tools.authManager;
            if (authManager && authManager.user) {
                const trophiesElement = document.getElementById("playerTrophies");
                if (trophiesElement) {
                    trophiesElement.textContent = authManager.user.trophies || 0;
                }
            }
        } catch (error) {
            console.error("RankedMatch: Error loading player trophies:", error);
        }
    }

    #setupLanguageChangeListener() {
        // Ascolta i cambi di lingua e aggiorna la pagina
        document.addEventListener('languageChanged', () => {
            // Ricarica i trofei con la nuova lingua
            this.#loadPlayerTrophies();
        });
    }

    // Cleanup quando si esce dalla pagina
    destroy() {
        this.#stopPolling();
    }
}