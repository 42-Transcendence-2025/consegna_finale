export class HashUtils {
	static stripHash(view) {
		if (!view) return '';
		view = view.startsWith('#') ? view.substring(1) : view;
		view = view.split('?')[0].split('_')[0];
		return view;
	}
}
