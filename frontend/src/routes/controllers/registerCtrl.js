import {CONFIG} from "../../../config.js";

/** @type {Controller} */
export class RegisterController {
	titleSuffix = "Register";


	#mandatoryFields = [
		`email`,
		`username`,
		`password`,
		`password_confirm`,
	];
	#optionalFields = [
		`otp_code`,
	];

	/**
	 * @type {object | null}
	 */
	lastRegisterRequest = null;

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

	#currentInputsEqualToLastRequest(){
		if (!this.lastRegisterRequest) {
			return false;
		}
		
		for (const field of this.#mandatoryFields) {
			if (this.lastRegisterRequest[field] != $(`#${field}`).val()) {
				return false;
			}
		}
		return true;
	}

	#bindEvents() {
		$(`#confirm-otp-form`).on("submit", (e) => {
			e.preventDefault();
			this.#otpSubmit();
		});

		for (const field of this.#mandatoryFields) {
			$(`#${field}`).on("input", () => {
				$(`#${field}-help`).addClass(`d-none`);
				if (!this.lastRegisterRequest || this.lastRegisterRequest[field] !== $(`#${field}`).val()) {
					$(`#otp-code-wrapper`).toggleClass(`visually-hidden`, true);
				} else if (this.#currentInputsEqualToLastRequest()) {
					$(`#otp-code-wrapper`).toggleClass(`visually-hidden`, false);
				}
			});
		}

		$(`#register-form`).on("submit", (e) => {
			e.preventDefault();
			this.#registerSubmit();
		});
	};

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

	#validateForm(formData) {
		const errors = {};
		
		// Validazione email
		if (!formData.email || !formData.email.trim()) {
			errors.email = ["Email è obbligatoria"];
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = ["Formato email non valido"];
		}
		
		// Validazione username
		if (!formData.username || !formData.username.trim()) {
			errors.username = ["Username è obbligatorio"];
		} else if (formData.username.length < 3) {
			errors.username = ["Username deve essere di almeno 3 caratteri"];
		}
		
		// Validazione password
		if (!formData.password || !formData.password.trim()) {
			errors.password = ["Password è obbligatoria"];
		} else if (formData.password.length < 6) {
			errors.password = ["Password deve essere di almeno 6 caratteri"];
		}
		
		// Validazione conferma password
		if (!formData.password_confirm || !formData.password_confirm.trim()) {
			errors.password_confirm = ["Conferma password è obbligatoria"];
		} else if (formData.password !== formData.password_confirm) {
			errors.password_confirm = ["Le password non coincidono"];
		}
		
		return Object.keys(errors).length > 0 ? errors : null;
	}

	async #registerSubmit(){
		// Validazione form
		const formData = {
			email: $(`#email`).val(),
			username: $(`#username`).val(),
			password: $(`#password`).val(),
			password_confirm: $(`#password_confirm`).val(),
			otp_code: $(`#otp_code`).val(),
		};
		
		// Validazione lato client
		const validationErrors = this.#validateForm(formData);
		if (validationErrors) {
			this.#showErrors(validationErrors);
			return;
		}
		
		this.lastRegisterRequest = formData;
		
		// Chiamata al backend
		const registrationSuccess = await window.tools.authManager.register(formData);
		
		// Se la registrazione è fallita completamente (errore di connessione)
		if (!registrationSuccess) {
			const authErrors = window.tools.authManager.authErrors;
			
			// Se non ci sono errori specifici, è probabilmente un errore di connessione
			if (!authErrors || Object.keys(authErrors).length === 0) {
				this.#showErrors({
					email: ["Errore di connessione: impossibile contattare il server"],
					username: ["Verifica che il server sia avviato"]
				});
				return;
			}
			
			// Mostra gli errori specifici del server
			if (authErrors.detail) {
				this.#showErrors({
					email: [authErrors.detail]
				});
			} else {
				console.warn("Register failed:", authErrors);
				this.#showErrors(authErrors);
			}
			return;
		}

		// Controlla se è richiesto OTP
		const otpRequired = window.tools.authManager.otpRequired;
		if (otpRequired) {
			// TODO: show otp code input
			$(`#confirm-otp-modal`).removeClass(`visually-hidden`);
			return;
		}

		// Se tutto è andato bene, reindirizza alla home
		if (window.tools.authManager.isLoggedIn()) {
			window.location.href = `#${CONFIG.routes.home.view}`;
		}
	}
}
