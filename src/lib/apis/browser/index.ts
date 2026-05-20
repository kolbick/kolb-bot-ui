import { WEBUI_API_BASE_URL } from '$lib/constants';

export type BrowserArtifactUrlResponse = {
	url: string;
};

let cachedBrowserArtifactUrl: string | null = null;
let cachedBrowserArtifactChatId: string | null = null;

export const getBrowserArtifactUrlFromBackend = async (
	token: string,
	chatId?: string | null
): Promise<string | null> => {
	if (
		cachedBrowserArtifactUrl &&
		(cachedBrowserArtifactChatId ?? null) === (chatId ?? null)
	) {
		return cachedBrowserArtifactUrl;
	}

	const params = new URLSearchParams();
	if (chatId) {
		params.set('chat_id', chatId);
	}

	const query = params.toString();
	const url = `${WEBUI_API_BASE_URL}/browser/artifact-url${query ? `?${query}` : ''}`;

	const res = await fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (response) => {
			if (!response.ok) throw await response.json();
			return response.json() as Promise<BrowserArtifactUrlResponse>;
		})
		.catch((err) => {
			console.error('Failed to load browser artifact URL', err);
			return null;
		});

	if (res?.url) {
		cachedBrowserArtifactUrl = res.url;
		cachedBrowserArtifactChatId = chatId ?? null;
		return res.url;
	}

	return null;
};

export const clearBrowserArtifactUrlCache = () => {
	cachedBrowserArtifactUrl = null;
	cachedBrowserArtifactChatId = null;
};
