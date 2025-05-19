export class MatchManager {

	/** @type {string}*/
	#matchApiUrl;

	#id = new Date().getTime();

	#isLoading = false;

	/** @type {{[key:string]: string} | null} */
	#matchErrors = null;

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
		return $.ajax({
			url: `${this.#matchApiUrl}/match/private-password/`,
			method: "POST",
			data: {
				password: password,
			},
		})
			.done((data) => {
				this.#matchErrors = null;
				this.#isLoading = false;
				return data;
			})
			.fail((error) => {
				if (error.response) {
					this.#matchErrors = error.response;
				} else {
					console.error('Match password failed:', error);
				}
				return false;
			})
			.always(() => {
				this.#isLoading = false;
			});
	}
}
