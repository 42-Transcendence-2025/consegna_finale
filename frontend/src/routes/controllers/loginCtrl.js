import {CONFIG} from "../../../config.js";

/** @type {Controller} */
export class LoginController {
	titleSuffix = "Login";

	#mandatoryFields = [
		`username`,
		`password`,
	];
	#optionalFields = [
		`otp_code`,
	];

	init() {
		this.#bindEvents();
	};

	#showErrors(errors) {
		if (!errors) {
			return;
		}
		
		for (const field in errors) {
			const $field = $(`#${field}-help`);
			if ($field.length) {
				$field.removeClass(`d-none`);
				// Gestisci sia array che stringhe per gli errori
				if (Array.isArray(errors[field])) {
					$field.html(errors[field].join(`<br>`));
				} else {
					$field.html(errors[field]);
				}
			}
		}
	}

	#bindEvents() {
		$(`#confirm-otp-form`).on("submit", (e) => {
			e.preventDefault();
			this.#otpSubmit();
		});


		for (const field of this.#mandatoryFields) {
			$(`#${field}`).on("input", () => {
				$(`#${field}-help`).addClass(`d-none`);
			});
		}

		$(`#login-form`).on("submit", (e) => {
			e.preventDefault();
			this.#loginSubmit();
		});
	};


	#validateForm(formData) {
		const errors = {};
		
		// Validazione username
		if (!formData.username || !formData.username.trim()) {
			errors.username = ["Username è obbligatorio"];
		}
		
		// Validazione password
		if (!formData.password || !formData.password.trim()) {
			errors.password = ["Password è obbligatoria"];
		}
		
		return Object.keys(errors).length > 0 ? errors : null;
	}

	async #otpSubmit(){
		try {
			await window.tools.authManager.confirmOtp($(`#otp_code`).val());
			
			// Se arriviamo qui, l'OTP è stato accettato
			if (window.tools.authManager.isLoggedIn()) {
				window.location.href = `#${CONFIG.routes.home.view}`;
			}
		} catch (error) {
			// Gestione errore OTP
			console.error("OTP confirmation failed:", error);
			
			const authErrors = window.tools.authManager.authErrors;
			
			// Se readyState è 0, è un errore di connessione
			if (error.readyState === 0) {
				this.#showErrors({
					otp_code: ["Errore di connessione: impossibile verificare il codice OTP"]
				});
				return;
			}
			
			// Se ci sono errori specifici
			if (authErrors && authErrors.detail) {
				this.#showErrors({
					otp_code: [authErrors.detail]
				});
			} else if (error.responseJSON && error.responseJSON.detail) {
				this.#showErrors({
					otp_code: [error.responseJSON.detail]
				});
			} else {
				this.#showErrors({
					otp_code: ["Codice OTP non valido o scaduto. Riprova."]
				});
			}
		}
	}

	async #loginSubmit(){
		// Validazione form
		const formData = {
			username: $(`#username`).val(),
			password: $(`#password`).val(),
			otp_code: $(`#otp_code`).val(),
		};
		
		// Validazione lato client
		const validationErrors = this.#validateForm(formData);
		if (validationErrors) {
			this.#showErrors(validationErrors);
			return;
		}
		
		// Chiamata al backend
		const loginSuccess = await window.tools.authManager.login(formData);
		
		// Se il login è fallito completamente (errore di connessione)
		if (!loginSuccess) {
			const authErrors = window.tools.authManager.authErrors;
			
			// Se non ci sono errori specifici, è probabilmente un errore di connessione
			if (!authErrors || Object.keys(authErrors).length === 0) {
				this.#showErrors({
					username: ["Errore di connessione: impossibile contattare il server"],
					password: ["Verifica che il server sia avviato"]
				});
				return;
			}
			
			// Gestione errori specifici
			if (authErrors.detail) {
				// Se è un errore di credenziali, mostra sotto i campi username/password
				if (authErrors.detail.includes("credentials") || authErrors.detail.includes("invalid")) {
					this.#showErrors({
						username: ["Credenziali non valide"],
						password: ["Verifica username e password"]
					});
				} else {
					// Altri errori generici
					this.#showErrors({
						username: [authErrors.detail]
					});
				}
			} else {
				console.warn("Login failed:", authErrors);
				this.#showErrors(authErrors);
			}
			return;
		}

		// Controlla se è richiesto OTP
		const otpRequired = window.tools.authManager.otpRequired;
		if (otpRequired) {
			$(`#confirm-otp-modal`).removeClass(`visually-hidden`);
			return;
		}

		// Se tutto è andato bene, reindirizza alla home
		if (window.tools.authManager.isLoggedIn()) {
			window.location.href = `#${CONFIG.routes.home.view}`;
		}
	}
}
