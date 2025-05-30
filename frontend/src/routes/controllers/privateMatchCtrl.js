export class PrivateMatchController {
    titleSuffix = "";

    init() {
        console.log("Private Match Controller");
        this.#bindEvents();
        this.#initializeTooltips();
    }

    #bindEvents() {
        const playButton = document.getElementById("playButton");
        const passwordInput = document.getElementById("passwordInput");
        const loadingScreen = document.getElementById("loadingScreen");
        const formContainer = document.getElementById("privateMatchFormContainer");
        const cancelSearchButton = document.getElementById("cancelSearchButton");
        const generatePasswordButton = document.getElementById("generatePassword");

        if (playButton && passwordInput && loadingScreen && formContainer && cancelSearchButton && generatePasswordButton) {
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
                        window.location.hash = "#game";
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

            cancelSearchButton.addEventListener("click", () => {
                console.log("Cancel search button clicked");
                const matchManager = window.tools.matchManager;
                if (matchManager) {
                    matchManager.abortCurrentMatchRequest();
                }
                loadingScreen.classList.add("d-none");
                loadingScreen.classList.remove("d-flex");
                formContainer.classList.remove("d-none");
            });

            generatePasswordButton.addEventListener("click", () => {
                this.#generatePIN(passwordInput);
                generatePasswordButton.blur(); 
            });
        } else {
            if (!loadingScreen) console.error("Loading screen element (loadingScreen) not found!");
            if (!playButton) console.error("Play button (playButton) not found!");
            if (!cancelSearchButton) console.error("Cancel search button (cancelSearchButton) not found!");
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
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}
