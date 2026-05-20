import { getBrowserArtifactUrlFromBackend } from '$lib/apis/browser';

/** Public path only — no credentials. Full URL comes from the backend API. */
export const DEFAULT_BROWSER_ARTIFACT_PATH =
	'/browser/vnc.html?autoconnect=1&resize=scale&reconnect=1&reconnect_delay=1000&path=browser/websockify';

export type BrowserArtifactFile = {
	type?: string;
	artifact_type?: string;
	artifactType?: string;
	url?: string;
	name?: string;
	title?: string;
};

export const getDefaultBrowserArtifactUrl = () => DEFAULT_BROWSER_ARTIFACT_PATH;

export const resolveBrowserArtifactUrl = async (
	token: string,
	chatId?: string | null
): Promise<string> => {
	const fromBackend = await getBrowserArtifactUrlFromBackend(token, chatId);
	return fromBackend ?? DEFAULT_BROWSER_ARTIFACT_PATH;
};

export const isBrowserArtifact = (file: unknown): file is BrowserArtifactFile => {
	if (!file || typeof file !== 'object') {
		return false;
	}

	const item = file as BrowserArtifactFile;
	return (
		item.type === 'browser' ||
		(item.type === 'artifact' && (item.artifact_type === 'browser' || item.artifactType === 'browser'))
	);
};

export const getBrowserArtifactUrl = (file?: BrowserArtifactFile) => {
	return file?.url || DEFAULT_BROWSER_ARTIFACT_PATH;
};

export const getBrowserArtifacts = (files: unknown[] = []) => {
	return files.filter(isBrowserArtifact);
};

export const getBrowserUrlFromHistory = (
	history?: { messages?: Record<string, { files?: unknown[] }> } | null
): string | null => {
	if (!history?.messages) {
		return null;
	}

	let latestUrl: string | null = null;
	let latestTimestamp = -1;

	for (const message of Object.values(history.messages)) {
		const artifacts = getBrowserArtifacts(message?.files ?? []);
		for (const artifact of artifacts) {
			const url = getBrowserArtifactUrl(artifact);
			if (!url || url === DEFAULT_BROWSER_ARTIFACT_PATH) {
				continue;
			}
			latestUrl = url;
			latestTimestamp = Date.now();
		}
	}

	return latestUrl;
};

export const createBrowserArtifactFile = (url?: string): BrowserArtifactFile => ({
	type: 'browser',
	name: 'Live browser',
	title: 'Live browser',
	url: url ?? DEFAULT_BROWSER_ARTIFACT_PATH
});
