import {CONFIG} from "../config.js";
import {jwtDecode} from "/libs/jwt-decode-4.0.0/jwt-decode-4.0.0.js";

export class AuthManager {
	static #ACCESS_TOKEN_KEY = "access_token";
	static #REFRESH_TOKEN_KEY = "refresh_token";
	static #POLLING_INTERVAL = 1000 * 30; // TODO: decrease this if needed
	//-------------------------------------------
	/** @type {string} */
	#userApiUrl;

	/** @type {number | null} */
	#pollingInterval = null;

	//-------------------------------------------
	#id = new Date().getTime();
	/** @type {object | null} */
	#user = null;

	/** @type {string | null} */
	#otpRequiredUsername = null;


	/** @type {{access: string, refresh: string} | null} */
	#jwt = null;

	#otpRequired = false;

	#isLoading = false;

	/** @type {{[key:string]: string} | null} */
	#authErrors = null;

	/** @type {object | null} */
	#lastResponse = null;

	//-------------------------------------------

	/**
	 *
	 * @param {string} userApiUrl
	 */
	constructor(userApiUrl) {
		this.#userApiUrl = userApiUrl;

		if (window.tools.authManager) {
			window.tools.authManager.destroy();
		}
		window.tools.authManager = this;
		console.debug(`AuthManager created. #${this.#id}`);

		this.#loadJwtFromStorage();
		this.#bindEvents();
		this.#setupAjaxDefaults();
	}

	#bindEvents(){
		$(`#logout-button`).on("click", (e) => {
			e.preventDefault();
			this.logout(true);
		});
	}

	#setupAjaxDefaults() {
		// Configure jQuery to automatically add Authorization header
		$.ajaxSetup({
			beforeSend: (xhr, settings) => {
				// Only add auth header for requests to our API
				if (settings.url.includes(':8003') || settings.url.includes(':8001') || 
				    settings.url.includes(':8002') || settings.url.includes(':8004')) {
					const token = this.accessToken;
					if (token) {
						xhr.setRequestHeader('Authorization', `Bearer ${token}`);
					}
				}
			}
		});
	}

	destroy() {
		this.#updateJwt(null, null);
		this.#authErrors = null;
		this.#otpRequired = false;
		this.#isLoading = false;
		console.debug(`AuthManager destroyed. #${this.#id}`);
	}


	isLoggedIn() {
		const status = this.isAccessTokenExpired();
		if (status) {
			this.#clearJwtFromStorage();
		}
		return !status;
	}

	//-----------------------------------------------------------------------------------------------------------------
	// LOCAL STORAGE

	/**
	 * @param {string | null} access
	 * @param {string | null} refresh
	 */
	#updateJwt(access, refresh) {
		this.#jwt = {
			access,
			refresh,
		};
		this.#saveJwtToStorage();
	}

	startPollingAccessToken() {
		clearInterval(this.#pollingInterval);
		console.debug(`AuthManager started polling access token every ${AuthManager.#POLLING_INTERVAL} ms`);
		this.#pollingInterval = setInterval(() => {
			this.refreshAccessToken();
		}, AuthManager.#POLLING_INTERVAL);
	}

	#loadJwtFromStorage() {
		const access = localStorage.getItem(AuthManager.#ACCESS_TOKEN_KEY);
		const refresh = localStorage.getItem(AuthManager.#REFRESH_TOKEN_KEY);
		if (access && refresh) {
			this.#updateJwt(access, refresh);
			console.debug(`authManager[getTokensFromStorage]: JWT found in localStorage. `, this.#jwt);
			if (this.isAccessTokenExpired()) {
				console.warn("JWT expired. Logging out.");
				this.logout(false);
			} else {
				this.startPollingAccessToken();
			}
			return this.#jwt;
		}
		console.warn("Missing JWT in localStorage. Login required.");
		this.logout(false);

		// TODO: redirect to login page from somewhere
		return null;
	}

	#saveJwtToStorage() {
		if (this.#jwt?.access?.trim()) {
			localStorage.setItem(AuthManager.#ACCESS_TOKEN_KEY, this.#jwt.access);
		}
		if (this.#jwt?.refresh?.trim()) {
			localStorage.setItem(AuthManager.#REFRESH_TOKEN_KEY, this.#jwt.refresh);
		}
	}

	#clearJwtFromStorage() {
		localStorage.removeItem(AuthManager.#ACCESS_TOKEN_KEY);
		localStorage.removeItem(AuthManager.#REFRESH_TOKEN_KEY);
	}

	//-----------------------------------------------------------------------------------------------------------------


	/**
	 * @typedef LoginFormDTO {{email: string, username: string, password: string, passwordConfirm?: string}}
	 */

	/**
	 * @param {LoginFormDTO} formData
	 * @returns {Promise<boolean>} true if login was successful, false otherwise
	 */
	async login(formData) {
		this.#isLoading = true;
		this.#authErrors = {};

		return new Promise(res=>{
			$.ajax({
				url: `${this.#userApiUrl}/login/`,
				method: "POST",
				contentType: "application/json",
				data: JSON.stringify(formData),
			})
				.done((response, status, jqXHR) => {
					this.#lastResponse = response;
					if (jqXHR.status == 202){
						// The OTP code was sent to the user's email
						console.log(response.detail);
						
						// Mostra l'OTP nella console del browser per copia/incolla facile
						if (response.otp_code) {
							console.log("Codice OTP: ", response.otp_code);
						}
						
						this.#otpRequiredUsername = formData.username;
						this.#otpRequired = true;
						res(true);
						return;
					}

					this.#updateJwt(response.access, response.refresh);
					this.startPollingAccessToken();

					if (response.access && response.refresh) {
						window.location.href = `#${CONFIG.routes.home.view}`;
					} else {
						this.#otpRequired = true;
						this.#otpRequiredUsername = formData.username;
					}
					res(true);
				})
				.fail((error) => {
					if (error.responseJSON) {
						this.#authErrors = error.responseJSON;
					}
					res(false);
				})
				.always(() => {
					this.#isLoading = false;
				});
		});
	};

	/**
	 * @param {LoginFormDTO} formData
	 * @returns {Promise<boolean>} true if registration was successful, false otherwise
	 */
	async register(formData) {
		this.#isLoading = true;
		this.#authErrors = {};

		return new Promise(res=>{
			$.ajax({
				url: `${this.#userApiUrl}/register/`,
				method: "POST",
				contentType: "application/json",
				data: JSON.stringify(formData),
			})
				.done((response, textStatus, jqXHR) => {
					this.#lastResponse = response;
					console.debug(`Register response:`, response, textStatus, jqXHR);
					if (jqXHR.status == 201){
						// The OTP code was sent to the user's email
						console.log(response.detail);
						
						// Mostra l'OTP nella console del browser per copia/incolla facile
						if (response.otp_code) {
							console.log("Codice OTP: ", response.otp_code);					
						}
						
						this.#otpRequiredUsername = formData.username;
						this.#otpRequired = true;
						res(true);
						return;
					}
					this.#updateJwt(response.access, response.refresh);
					this.startPollingAccessToken();

					if (response.access && response.refresh) {
						window.location.href = `#${CONFIG.routes.home.view}`;
					} else {
						this.#otpRequiredUsername = formData.username;
						this.#otpRequired = true;
					}
					res(true);
				})
				.fail((error) => {
					console.error('Registration failed:', error);
					if (error.responseJSON) {
						this.#authErrors = error.responseJSON;
					} else {
						console.error('Registration failed:', error);
					}
					res(false);
				})
				.always(() => {
					this.#isLoading = false;
				});
		});
	};

	/**
	 * @param {string} otpCode
	 */
	async confirmOtp(otpCode) {
		this.#isLoading = true;
		this.#authErrors = {};

		return $.ajax({
			url: `${this.#userApiUrl}/verify-otp/`,
			method: "POST",
			data: {
				username: this.#otpRequiredUsername,
				otp_code: otpCode,
			},
		})
			.done((response) => {
				this.#lastResponse = response;
				this.#updateJwt(response.access, response.refresh);
				this.startPollingAccessToken();

				this.#user = response.user;
				this.#otpRequired = false;
				this.#otpRequiredUsername = null;
				return true;
			})
			.fail((error) => {
				if (error.response) {
					this.#authErrors = error.response;
				} else {
					console.error('OTP confirmation failed:', error);
				}
				return false;
			})
			.always(() => {
				this.#isLoading = false;
			});
	};

	logout(redirect = true) {
		this.#user = null;
		this.#updateJwt(null, null);
		this.#otpRequired = false;
		this.#otpRequiredUsername = null;
		this.#clearJwtFromStorage();
		clearInterval(this.#pollingInterval);
		if (redirect) {
			window.location.href = `#${CONFIG.routes.login.view}`;
		}
	}

	// JWT-related methods
	isAccessTokenExpired() {
		if (!this.#jwt?.access) return true;
		try {
			const decoded = jwtDecode(this.#jwt.access); // TODO: check if jwtDecode is available
			return decoded.exp * 1000 < Date.now();
		} catch (error) {
			console.error('Failed to decode JWT:', error);
			return true;
		}
	}

	async refreshAccessToken() {
		this.#isLoading = true;
		this.#authErrors = {};

		$.ajax({
			url: `${this.#userApiUrl}/token_refresh/`,
			method: "POST",
			data: {
				refresh: this.#jwt.refresh,
			},
		})
			.done((response) => {
				this.#lastResponse = response;
				this.#setAccessToken(response.access);
			})
			.fail((error) => {
				console.error('Token refresh failed:', error);
				this.#clearJwtFromStorage();
				clearInterval(this.#pollingInterval);
				window.location.href = `#${CONFIG.routes.login.view}`;
				// throw error;
			})
			.always(() => {
				this.#isLoading = false;
			});
	}

	// Get user info
	async getUserInfo() {
		this.#isLoading = true;
		return new Promise((resolve, reject) => {
			$.ajax({
				url: `${this.#userApiUrl}/profile/`,
				method: "GET",
			})
			.done((response) => {
				this.#lastResponse = response;
				this.#user = response;
				console.log('User info loaded:', this.username);
				resolve(response);
			})
			.fail((error) => {
				console.error('User info retrieval failed:', error);
				reject(error);
			})
			.always(() => {
				this.#isLoading = false;
			});
		});
	}

	async initializeUserInfo() {
		if (this.isLoggedIn() && !this.#user) {
			console.log('Initializing user info...');
			await this.getUserInfo();
		}
	}

	// GETTERS ---------------------------------------------------------------------------------------------------------

	/** @type {string | null} */
	get accessToken() {
		return this.#jwt?.access?.trim() ?? null;
	}

	get authErrors() {
		return this.#authErrors;
	}

	get isLoading() {
		return this.#isLoading;
	}

	get otpRequired() {
		return this.#otpRequired;
	}

	/** @type {string | null} */
	get refreshToken() {
		return this.#jwt?.refresh?.trim() ?? null;
	}

	get username() {
		if (this.#user && this.#user.username)
			return this.#user.username;
		if (this.#user && this.#user.email)
			return this.#user.email;
		return null;
	}

	get trophies() {
		if (this.#user && this.#user.trophies)
			return this.#user.trophies;
		return 0; // Default to 0 if not available
	}

	// SETTERS ---------------------------------------------------------------------------------------------------------

	/**
	 * @param {string | null} value
	 */
	#setAccessToken(value) {
		this.#jwt.access = value;
		this.#saveJwtToStorage();
		this.#setupAjaxDefaults(); // Refresh Ajax setup when token changes
	}

	#setRefreshToken(value) {
		this.#jwt.refresh = value;
		this.#saveJwtToStorage();
	}

	//-----------------------------------------------------------------------------------------------------------------

}
