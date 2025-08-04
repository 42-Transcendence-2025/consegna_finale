export class PrivateMatchController {
    titleSuffix = "";

    init() {
        console.log("Private Match Controller");
        this.#bindEvents();
        this.#initializeTooltips();
        this.#setupLanguageChangeListener();
    }

    #bindEvents() {
        const playButton = document.getElementById("playButton");
        const passwordInput = document.getElementById("passwordInput");
        const loadingScreen = document.getElementById("loadingScreen");
        const formContainer = document.getElementById("privateMatchFormContainer");
        const generatePasswordButton = document.getElementById("generatePassword");

        if (playButton && passwordInput && loadingScreen && formContainer && generatePasswordButton) {
            playButton.addEventListener("click", async () => {
                const password = passwordInput.value.trim();
                if (!password) {
                    alert("Please enter a password!");
                    return;
                }

                formContainer.classList.add("d-none");
                loadingScreen.classList.remove("d-none");
                loadingScreen.classList.add("d-flex");

                try {
                    const matchManager = window.tools.matchManager;
                    const response = await matchManager.matchPassword(password);

                    if (response && response.game_id) {
                        console.log("Match found:", response);
                        localStorage.setItem("game_id", response.game_id);
                        window.location.hash = "#game?type=private";
                    } else {
                        loadingScreen.classList.add("d-none");
                        loadingScreen.classList.remove("d-flex");
                        formContainer.classList.remove("d-none");
                        alert("Invalid password or match not found (unexpected response).");
                    }
                } catch (error) {
                    if (error && error.name === 'AbortError') {
                        console.log('PrivateMatchCtrl: Match search aborted by user.');
                    } else {
                        console.error("PrivateMatchCtrl: Error during match:", error);
                        loadingScreen.classList.add("d-none");
                        loadingScreen.classList.remove("d-flex");
                        formContainer.classList.remove("d-none");
                        alert(error.message || "An error occurred or match not found.");
                    }
                }
            });

            generatePasswordButton.addEventListener("click", () => {
                this.#generatePIN(passwordInput);
                generatePasswordButton.blur(); 
            });
        } else {
            if (!loadingScreen) console.error("Loading screen element (loadingScreen) not found!");
            if (!playButton) console.error("Play button (playButton) not found!");
            if (!generatePasswordButton) console.error("Generate password button (generatePasswordButton) not found!");
        }
    }

    #generatePIN(inputElement) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        inputElement.value = "";
        inputElement.value = pin;
    }

    #initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        this.tooltipInstances = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    #setupLanguageChangeListener() {
        // Ascolta i cambi di lingua e aggiorna i tooltip
        document.addEventListener('languageChanged', () => {
            this.#updateTooltips();
        });
    }

    #updateTooltips() {
        // Distruggi i tooltip esistenti
        if (this.tooltipInstances) {
            this.tooltipInstances.forEach(tooltip => tooltip.dispose());
        }
        
        // Aggiorna manualmente gli attributi title con le traduzioni
        const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"][data-i18n*="[title]"]');
        tooltipElements.forEach(element => {
            const i18nAttr = element.getAttribute('data-i18n');
            if (i18nAttr && i18nAttr.includes('[title]')) {
                // Estrae la chiave di traduzione dall'attributo data-i18n
                const titleKey = i18nAttr.replace('[title]', '');
                const translatedTitle = $.i18n(titleKey);
                element.setAttribute('title', translatedTitle);
            }
        });
        
        // Reinizializza i tooltip con le nuove traduzioni
        this.#initializeTooltips();
    }
}
