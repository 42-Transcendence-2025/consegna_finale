import {HomeController} from "./src/routes/controllers/homeCtrl.js";
import {LoginController} from "./src/routes/controllers/loginCtrl.js";
import {LandingPageController} from "./src/routes/controllers/landingPageCtrl.js";
import {OnlineGameController} from "./src/routes/controllers/onlineGameCtrl.js";
import {RegisterController} from "./src/routes/controllers/registerCtrl.js";
import {PongAIController} from "./src/routes/controllers/pongAICtrl.js";
import {ProfileMenuController} from "./src/routes/controllers/profileMenuCtrl.js";
import {PlayMenuController} from "./src/routes/controllers/playMenuCtrl.js";
import {PrivateMatchController} from "./src/routes/controllers/privateMatchCtrl.js";
import {RankedMatchController} from "./src/routes/controllers/rankedMatch.js";
import {GameController} from "./src/routes/controllers/gameCtrl.js";
import {TournamentMenuController} from "./src/routes/controllers/tournamentMenuCtrl.js";
import {TournamentController} from "./src/routes/controllers/tournamentCtrl.js";

import {TestController} from "./src/routes/controllers/test.js";


/**
 * @typedef {Object} Tools
 * @property {AuthManager} authManager
 */

/** 
 * @type {Window & { tools: Tools }}
 * @global
 */
// var window = window;

window.tools = {};

// TYPES

/**
 * @typedef {{
 * 	titleSuffix: string,
 * 	init: function,
 * }} Controller
*/

//------------------------------------------------------------------------------

const BASE_URL = window.location.origin.split(/(http[s]?:\/\/.*):/)[1];
const WS_URL = window.location.origin.split(/(http[s]?:\/\/.*):/)[1].replace("http", "ws");





// GLOBAL SETTINGS
/**
 * @type {{
 * 	debug: boolean,
 * 	baseTitle: string,
 * 	appContainerID: string,
 * 	routes: {[key: string]: {view: string, controller: Controller, authRequired?: boolean, hideLangSwitcher?: boolean}},
 * 	defaultRoute: string,
 * 	locale: {
 * 		switchSelectorID: string,
 * 		configs: {[key: string]: string},
 * 		images: {[key: string]: string},
 * 	},
 * 	localStorageKeys: {[key: string]: string},
 * }}
*/
export const CONFIG = {
	routesViewsPath: "src/routes/views",
	debug: false,
	baseTitle: "Pong Game",
	appContainerID: "app",

	apiRoutes: {
		userApiUrl: `${BASE_URL}:8003`,
		matchApiUrl: `${BASE_URL}:8001`,
		pongApiUrl: `${WS_URL}:8002`,
	},
	

	/**
	 *  Routing map. The key is the hash (without the #) name. The value is an object with the following properties:
	 *  view: view file name (without the .html extension)
	 *  controller: Controller
	 *  @todo: Add routes + controllers here
	*/
	routes: {
		"": {
			view: "landingPage",
			controller: LandingPageController,
		},
		"home": {
			view: "home",
			controller: HomeController,
			authRequired: true,
		},
		playMenu: {
			view: "playMenu",
			controller: PlayMenuController,
			authRequired: true,
		},
		onlineGame: {
			view: "onlineGame",
			controller: OnlineGameController,
			authRequired: true,
		},
		privateMatch: {
			view: "privateMatch",
			controller: PrivateMatchController,
			authRequired: true,
		},
		rankedMatch: {
			view: "rankedMatch",
			controller: RankedMatchController,
			authRequired: true,
		},
		login: {
			view: "login",
			controller: LoginController,
		},
		register: {
			view: "register",
			controller: RegisterController,
		},
		pongAI: {
			view: "pongAI", // Nome del file HTML (senza estensione)
			controller: PongAIController, // Controller associato
			authRequired: true,
			hideLangSwitcher: true,
		},
		profileMenu: {
			view: "",
			controller: ProfileMenuController,
			authRequired: false,
		},
		game: {
			view: "game",
			controller: GameController,
			authRequired: true,
			hideLangSwitcher: true,
		},
		tournamentMenu: {
			view: "tournamentMenu",
			controller: TournamentMenuController,
			authRequired: true,
		},
		tournament: {
			view: "tournament",
			controller: TournamentController,
			authRequired: true,
			hideLangSwitcher: true,
		},
		test: {
			view: "test",
			controller: TestController,
			authRequired: true,
			hideLangSwitcher: true,
		}
	},
	// Default route if the hash is not found.
	defaultRoute: "",

	locale: {
		switchSelectorID: "locale-switch",
		configs: {
			en: "i18n/en.json",
			it: "i18n/it.json",
			uk: "i18n/uk.json",
		},
		images: {
			en: "assets/flags/us.png",
			it: "assets/flags/it.png",
			uk: "assets/flags/ua.png",
		}
	},

	localStorageKeys: {
		locale: "locale",
	},
};
window.config = CONFIG;
//-----------------------------------------------------------------------------
