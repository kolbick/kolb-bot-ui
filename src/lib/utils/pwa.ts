const ABBY_PWA_EMAIL = 'ateed120@gmail.com';
const ABBY_PWA_APP_NAME = 'ABBY-BOT';
const ABBY_PWA_ICON = '/static/user-icons/abby-bot/apple-touch-icon.png';
const DEFAULT_PWA_ICON = '/static/apple-touch-icon.png';

export function isIOS(): boolean {
	if (typeof navigator === 'undefined') {
		return false;
	}

	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

export function isStandalonePwa(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		navigatorWithStandalone.standalone === true ||
		document.referrer.startsWith('android-app://')
	);
}

/** Apply root classes used by iOS / standalone PWA styles in custom.css. */
export function initStandalonePwaClasses(): { ios: boolean; standalone: boolean } {
	const ios = isIOS();
	const standalone = isStandalonePwa();
	const root = document.documentElement;

	root.classList.toggle('ios', ios);
	root.classList.toggle('standalone', standalone);
	root.classList.toggle('ios-standalone', ios && standalone);

	return { ios, standalone };
}

/** Keep the iOS home-screen status bar readable for the active theme. */
export function updateIosStatusBarStyle(isDark: boolean): void {
	if (typeof document === 'undefined') {
		return;
	}

	let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
	if (!statusBarMeta) {
		statusBarMeta = document.createElement('meta');
		statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
		document.head.appendChild(statusBarMeta);
	}

	statusBarMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
}

function setLinkHref(rel: string, href: string, sizes?: string): void {
	let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
	if (!link) {
		link = document.createElement('link');
		link.rel = rel;
		if (sizes) {
			link.sizes = sizes;
		}
		document.head.appendChild(link);
	}
	link.href = href;
}

/** Swap home-screen icons and titles for the Abby-specific PWA identity. */
export function applyUserPwaBranding(email?: string | null, fallbackAppName = 'Kolb-Bot'): void {
	const isAbby = email?.toLowerCase() === ABBY_PWA_EMAIL;
	const root = document.documentElement;

	root.classList.toggle('user-pwa-branded', isAbby);
	setLinkHref('apple-touch-icon', isAbby ? ABBY_PWA_ICON : DEFAULT_PWA_ICON, '180x180');

	const titleMeta = document.querySelector<HTMLMetaElement>(
		'meta[name="apple-mobile-web-app-title"]'
	);
	if (titleMeta) {
		titleMeta.content = isAbby ? ABBY_PWA_APP_NAME : fallbackAppName;
	}
}
