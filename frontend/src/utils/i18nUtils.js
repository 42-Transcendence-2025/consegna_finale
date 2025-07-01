import {CONFIG} from "../../config.js";

export class I18nUtils {
	static setLocale(locale = "en") {
		if (!Object.keys(CONFIG.locale.configs).includes(locale)) {
			console.error("Unknown locale: " + locale);
			locale = "en";
		}
		$.i18n().locale = locale;
		localStorage.setItem(CONFIG.localStorageKeys.locale, locale);
		$(document.body).i18n();
		const img = $(`#${CONFIG.locale.switchSelectorID} .selected-flag-img`);
		if (img.attr("src") != CONFIG.locale.images[locale]) {
			img.attr("src", CONFIG.locale.images[locale]);
		}
		img.removeClass("d-none");
		
		// Emetti un evento personalizzato per notificare il cambio di lingua
		document.dispatchEvent(new CustomEvent('languageChanged', { detail: { locale } }));
	}
}
