export class PrivateMatchController {
    titleSuffix = "";
    // Non è più necessario #currentMatchRequestController per questa logica specifica
    // #currentMatchRequestController = null; 

    init() {
        console.log("Private Match Controller");
        this.#bindEvents();

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    #bindEvents() {
        const playButton = document.getElementById("playButton");
        const passwordInput = document.getElementById("passwordInput");
        const loadingScreen = document.getElementById("loadingScreen");
        const formContainer = document.getElementById("privateMatchFormContainer");
        const cancelSearchButton = document.getElementById("cancelSearchButton");

        if (playButton && passwordInput && loadingScreen && formContainer && cancelSearchButton) {
            playButton.addEventListener("click", async () => {
                const password = passwordInput.value.trim();
                if (!password) {
                    alert("Please enter a password!");
                    return;
                }

                formContainer.classList.add("d-none");
                loadingScreen.classList.remove("d-none");
                loadingScreen.classList.add("d-flex");
                // Non si crea più un AbortController qui

                try {
                    const matchManager = window.tools.matchManager;
                    // La chiamata a matchPassword ora usa la Promise interna del MatchManager
                    const response = await matchManager.matchPassword(password);

                    // Se la Promise si risolve, la richiesta non è stata annullata o l'annullamento
                    // non ha causato un rigetto che è stato catturato come AbortError.
                    // Il controllo `this.#currentMatchRequestController.signal.aborted` non è più applicabile.

                    if (response && response.game_id) {
                        console.log("Match found:", response);
                        localStorage.setItem("game_id", response.game_id);
                        window.location.hash = "#game";
                    } else {
                        // Questo blocco potrebbe non essere raggiunto se errori/mancata corrispondenza rigettano la Promise
                        loadingScreen.classList.add("d-none");
                        loadingScreen.classList.remove("d-flex");
                        formContainer.classList.remove("d-none");
                        alert("Invalid password or match not found (unexpected response).");
                    }
                } catch (error) {
                    if (error && error.name === 'AbortError') {
                        console.log('PrivateMatchCtrl: Match search aborted by user.');
                        // L'UI è già stata resettata dal listener del pulsante cancel, quindi non fare nulla qui.
                    } else {
                        console.error("PrivateMatchCtrl: Error during match:", error);
                        loadingScreen.classList.add("d-none");
                        loadingScreen.classList.remove("d-flex");
                        formContainer.classList.remove("d-none");
                        alert(error.message || "An error occurred or match not found.");
                    }
                }
                // Non c'è più un #currentMatchRequestController da resettare nel finally
            });

            cancelSearchButton.addEventListener("click", () => {
                console.log("Cancel search button clicked");
                const matchManager = window.tools.matchManager;
                if (matchManager) {
                    matchManager.abortCurrentMatchRequest(); // Chiama il nuovo metodo di annullamento
                }
                // Ripristina l'interfaccia utente
                loadingScreen.classList.add("d-none");
                loadingScreen.classList.remove("d-flex");
                formContainer.classList.remove("d-none");
            });

        } else {
            // Log per elementi mancanti
            if (!loadingScreen) console.error("Loading screen element (loadingScreen) not found!");
            if (!playButton) console.error("Play button (playButton) not found!");
            // ... etc.
            if (!cancelSearchButton) console.error("Cancel search button (cancelSearchButton) not found!");
        }
    }
}