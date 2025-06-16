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
		console.log("Register Controller");
		this.#bindEvents();
	};

	#showErrors(errors) {
		for (const field in errors) {
			const $field = $(`#${field}-help`);
			if ($field.length) {
				$field.removeClass(`d-none`);
				$field.html(errors[field].join(`<br>`));
			}
		}
	}

	#currentInputsEqualToLastRequest(){
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
				if (this.lastRegisterRequest[field] !== $(`#${field}`).val()) {
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
		await window.tools.authManager.confirmOtp($(`#otp_code`).val());
		if (!window.tools.authManager.isLoggedIn()) {
			// TODO: show errors. Either a toast or below each field
			if (window.tools.authManager.authErrors.detail) {
				// TODO: show toast
				console.warn("OTP confirmation failed:", window.tools.authManager.authErrors.detail);
			} else {
				console.warn("OTP confirmation failed:", window.tools.authManager.authErrors);
				this.#showErrors(window.tools.authManager.authErrors);
			}
			return;
		}
		window.location.href = `#${CONFIG.routes.home.view}`;
	}

	async #registerSubmit(){
		// TODO: add validation
		const formData = {
			email: $(`#email`).val(),
			username: $(`#username`).val(),
			password: $(`#password`).val(),
			password_confirm: $(`#password_confirm`).val(),
			otp_code: $(`#otp_code`).val(),
		};
		this.lastRegisterRequest = formData;
		await window.tools.authManager.register(formData);

		const otpRequired = window.tools.authManager.otpRequired;
		if (otpRequired) {
			// TODO: show otp code input
			$(`#confirm-otp-modal`).removeClass(`visually-hidden`);
			return;
		}

		if (!window.tools.authManager.isLoggedIn()) {
			// TODO: show errors. Either a toast or below each field
			if (window.tools.authManager.authErrors.detail) {
				// TODO: show toast
				console.warn("Register failed:", window.tools.authManager.authErrors.detail);
			} else {
				console.warn("Register failed:", window.tools.authManager.authErrors);
				this.#showErrors(window.tools.authManager.authErrors);
			}
			return;
		}
		window.location.href = `#${CONFIG.routes.home.view}`;
	}
}
