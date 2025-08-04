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
import {ProfileController} from "./src/routes/controllers/profileCtrl.js";
import {SearchController} from "./src/routes/controllers/searchCtrl.js";
import {HistoryController} from "./src/routes/controllers/historyCtrl.js";
import {WallOfFameController} from "./src/routes/controllers/wallOfFameCtrl.js";
import {LocalGameCtrl} from "./src/routes/controllers/localGameCtrl.js";


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
    userApiUrl: "/api/user",        // PRIMA era `${BASE_URL}:8003`
    matchApiUrl: "/api/match",      // PRIMA era `${BASE_URL}:8001`
    pongApiUrl: "/api/pong",        // PRIMA era `${WS_URL}:8002`
    profileApiUrl: "/api/profile",  // PRIMA era `${BASE_URL}:8004`
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
		localGame: {
			view: "localGame",
			controller: LocalGameCtrl,
			authRequired: true,
			hideLangSwitcher: true,
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
		profile: {
			view: "profile",
			controller: ProfileController,
			authRequired: true,
		},
		history: {
			view: "history",
			controller: HistoryController,
			authRequired: true,
		},
		walloffame: {
             view: "walloffame",
             controller: WallOfFameController,
             authRequired: true,
         },
		search: {
			view: "search",
			controller: SearchController,
			authRequired: true,
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
