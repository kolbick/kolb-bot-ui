import {
	createBrowserArtifactFile,
	getBrowserUrlFromHistory,
	type BrowserArtifactFile
} from '$lib/utils/browserArtifacts';

export const BROWSER_AGENT_TOOL_ID = 'server:mcp:playwright-browser-automation';

export const BROWSER_AGENT_SYSTEM_PROMPT =
	'Agent mode is enabled. You have access to a visible Playwright browser. Use the browser tools for web navigation, inspection, form filling, and multi-step browser work. Explain what you are doing as you work, ask before sensitive actions, and keep the live browser state useful for the user to watch or take over.';

export type AgentControlMode = 'agent' | 'user' | 'paused';

export const browserAgentEnabled = (selectedToolIds: string[]) =>
	selectedToolIds.includes(BROWSER_AGENT_TOOL_ID);

export const buildActiveSystemPrompt = (baseSystemPrompt: string, selectedToolIds: string[]) =>
	[baseSystemPrompt, browserAgentEnabled(selectedToolIds) ? BROWSER_AGENT_SYSTEM_PROMPT : '']
		.filter(Boolean)
		.join('\n\n');

export const resolveWorkspaceBrowserUrl = (
	history: { messages?: Record<string, { files?: unknown[] }> } | null | undefined,
	fallbackUrl: string
) => getBrowserUrlFromHistory(history) ?? fallbackUrl;

export type BrowserArtifactMessageInput = {
	id: string;
	parentId: string | null;
	modelId: string;
	modelName: string;
	artifactUrl?: string;
};

export const createBrowserArtifactMessage = ({
	id,
	parentId,
	modelId,
	modelName,
	artifactUrl
}: BrowserArtifactMessageInput) => {
	const file: BrowserArtifactFile = createBrowserArtifactFile(artifactUrl);

	return {
		id,
		parentId,
		childrenIds: [] as string[],
		role: 'assistant' as const,
		content: '',
		files: [file],
		done: true,
		model: modelId,
		modelName: modelName || modelId || 'Browser',
		modelIdx: 0,
		timestamp: Math.floor(Date.now() / 1000)
	};
};
