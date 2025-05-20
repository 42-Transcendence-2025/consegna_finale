/** @type {Controller} */
export class PrivateMatchController {
    titleSuffix = "";

    init() {
        console.log("Private Match Controller");
        this.#bindEvents();

		// Inizializza i tooltip di Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    #bindEvents() {
        // Bottone Play!
        const playButton = document.getElementById("playButton");
        const passwordInput = document.getElementById("passwordInput");

        if (playButton && passwordInput) {
            playButton.addEventListener("click", async () => {
                const password = passwordInput.value.trim(); // Ottieni la password inserita
                if (!password) {
                    alert("Please enter a password!"); // Mostra un messaggio se la password è vuota
                    return;
                }

                try {
                    // Chiama il metodo matchPassword di MatchManager
                    const matchManager = window.tools.matchManager;
                    const response = await matchManager.matchPassword(password);

                    if (response) {
                        console.log("Match found:", response);

						localStorage.setItem("game_id", response.game_id); // Salva l'ID del gioco in localStorage
                        // Reindirizza o esegui altre azioni
                        window.location.hash = "#game"; // Esempio: reindirizza alla pagina del gioco
                    } else {
                        alert("Invalid password or match not found.");
                    }
                } catch (error) {
                    console.error("Error during match:", error);
                    alert("An error occurred while trying to join the match.");
                }
            });
        }
    }
}