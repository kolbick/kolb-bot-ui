import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const workspacePath = resolve(process.cwd(), 'src/lib/components/chat/AgentWorkspace.svelte');
const browserShellPath = resolve(process.cwd(), 'src/lib/components/chat/AgentBrowserShell.svelte');
const chatPath = resolve(process.cwd(), 'src/lib/components/chat/Chat.svelte');
const artifactPath = resolve(process.cwd(), 'src/lib/components/chat/Messages/BrowserArtifact.svelte');
const browserArtifactsPath = resolve(process.cwd(), 'src/lib/utils/browserArtifacts.ts');
const chatsRouterPath = resolve(process.cwd(), 'backend/open_webui/routers/chats.py');

test('agent workspace component exposes browser, steps, and terminal tabs', () => {
	assert.equal(existsSync(workspacePath), true, 'AgentWorkspace.svelte should exist');

	const source = readFileSync(workspacePath, 'utf8');
	const browserShellSource = existsSync(browserShellPath) ? readFileSync(browserShellPath, 'utf8') : '';

	assert.match(source, /type WorkspaceTab = 'browser' \| 'steps' \| 'terminal'/);
	assert.match(source, /labelKey: 'Agent workspace tab browser'/);
	assert.match(source, /labelKey: 'Agent workspace tab steps'/);
	assert.match(source, /labelKey: 'Agent workspace tab terminal'/);
	assert.match(browserShellSource, /requestFullscreen/);
	assert.match(browserShellSource, /reloadBrowser/);
});

test('agent workspace mounts the real interactive terminal', () => {
	const source = readFileSync(workspacePath, 'utf8');

	assert.match(source, /import XTerminal from '\.\/XTerminal\.svelte';/);
	assert.match(source, /export let chatId: string \| null = null;/);
	assert.match(source, /let terminalConnected = false;/);
	assert.match(source, /let terminalConnecting = false;/);
	assert.match(source, /<XTerminal/);
	assert.match(source, /bind:connected={terminalConnected}/);
	assert.match(source, /bind:connecting={terminalConnecting}/);
	assert.match(source, /{chatId}/);
});

test('agent workspace uses smoother animated panel treatments', () => {
	const source = readFileSync(workspacePath, 'utf8');

	assert.match(source, /transition-all/);
	assert.match(source, /duration-500/);
	assert.match(source, /backdrop-blur/);
	assert.match(source, /animate-pulse/);
	assert.match(source, /shadow-\[0_18px_60px/);
	assert.match(source, /workspace-panel/);
	assert.match(source, /workspace-glow/);
	assert.match(source, /workspace-frame/);
});

test('agent browser shell gives the noVNC iframe a polished Agent Mode surface', () => {
	assert.equal(existsSync(browserShellPath), true, 'AgentBrowserShell.svelte should exist');

	const source = readFileSync(browserShellPath, 'utf8');

	assert.match(source, /export let browserUrl = '';/);
	assert.match(source, /bind:this={iframeElement}/);
	assert.match(source, /src={browserUrl}/);
	assert.match(source, /Agent Browser/);
	assert.match(source, /traffic-light/);
	assert.match(source, /beach-backdrop/);
	assert.match(source, /agent-computer-window/);
	assert.match(source, /agent-viewport-live/);
	assert.match(source, /browser-focus-ring/);
	assert.match(source, /agent-stage-light/);
	assert.match(source, /shoreline/);
	assert.match(source, /browser-display/);
	assert.match(source, /viewport-vignette/);
	assert.match(source, /status-pill/);
	assert.match(source, /aria-label="Pause agent"/);
	assert.match(source, /aria-label="Take over browser"/);
	assert.match(source, /aria-label="Resume agent"/);
});

test('agent browser shell controls call real workspace callbacks when provided', () => {
	const source = readFileSync(browserShellPath, 'utf8');
	const workspaceSource = readFileSync(workspacePath, 'utf8');
	const chatSource = readFileSync(chatPath, 'utf8');

	assert.match(source, /export let onPause/);
	assert.match(source, /export let onTakeOver/);
	assert.match(source, /export let onResume/);
	assert.match(source, /handleTrafficRed/);
	assert.match(source, /handleTrafficYellow/);
	assert.match(source, /handleTrafficGreen/);
	assert.match(source, /await onPause\(\)/);
	assert.match(source, /await onTakeOver\(\)/);
	assert.match(source, /await onResume\(\)/);
	assert.match(workspaceSource, /onPause={onPause}/);
	assert.match(workspaceSource, /onTakeOver={onTakeOver}/);
	assert.match(workspaceSource, /onResume={onResume}/);
	assert.match(chatSource, /onPause={async \(\) => {/);
	assert.match(chatSource, /agentControlMode = 'paused'/);
	assert.match(chatSource, /onTakeOver={async \(\) => {/);
	assert.match(chatSource, /agentControlMode = 'user'/);
});

test('shared chat endpoint allows public shares without requiring a login first', () => {
	const source = readFileSync(chatsRouterPath, 'utf8');

	assert.match(source, /get_optional_verified_user/);
	assert.doesNotMatch(source, /share_id: str,\s*user=Depends\(get_verified_user\)/);
	assert.match(source, /AccessGrants\.has_access\(\s*user_id=['"]\*['"]/);
	assert.match(source, /if not user:/);
});

test('agent browser shell shows live status, approval, and action feed affordances', () => {
	const source = readFileSync(browserShellPath, 'utf8');

	assert.match(source, /statusOverlayLabel/);
	assert.match(source, /approvalEntry/);
	assert.match(source, /Approve/);
	assert.match(source, /Reject/);
	assert.match(source, /recentActions/);
	assert.match(source, /agent-click-ripple/);
	assert.match(source, /agent-cursor/);
	assert.match(source, /agent-scanline/);
	assert.match(source, /activity-orbit/);
	assert.match(source, /mode-ribbon/);
	assert.match(source, /command-rail/);
	assert.match(source, /agent-command-center/);
	assert.match(source, /agent-handoff-dock/);
	assert.match(source, /agent-thinking-waves/);
	assert.match(source, /BrowserApprovalPrompt/);
	assert.match(source, /controlModeClass/);
	assert.match(source, /screenshot-glow/);
	assert.match(source, /getStatusOverlayLabel/);
	assert.match(source, /from '\$lib\/utils\/agentBrowser'/);
});

test('desktop agent workspace is not hidden behind container-query-only classes', () => {
	const source = readFileSync(workspacePath, 'utf8');

	assert.doesNotMatch(source, /@3xl:flex/);
	assert.match(source, /md:flex/);
});

test('desktop agent workspace opens wide and remembers local resize', () => {
	const source = readFileSync(workspacePath, 'utf8');

	assert.match(source, /const DESKTOP_DEFAULT_SIZE = 58;/);
	assert.match(source, /bind:pane/);
	assert.match(source, /export const openPane = async \(\) => {/);
	assert.match(source, /localStorage\.agentWorkspaceSize/);
	assert.match(source, /pane\.resize\(DESKTOP_DEFAULT_SIZE\)/);
});

test('browser artifact URL has no hardcoded credentials in frontend source', () => {
	const source = readFileSync(browserArtifactsPath, 'utf8');

	assert.match(source, /resize=scale/);
	assert.match(source, /reconnect=1/);
	assert.match(source, /reconnect_delay=1000/);
	assert.doesNotMatch(source, /password=/);
	assert.match(source, /resolveBrowserArtifactUrl/);
});

test('browser artifact URL is loaded from the backend API', () => {
	const apiPath = resolve(process.cwd(), 'src/lib/apis/browser/index.ts');
	const source = readFileSync(apiPath, 'utf8');

	assert.match(source, /\/browser\/artifact-url/);
	assert.match(source, /getBrowserArtifactUrlFromBackend/);
});

test('chat mounts the dockable agent workspace and uses the shared browser URL helper', () => {
	const source = readFileSync(chatPath, 'utf8');
	const workspaceSource = readFileSync(workspacePath, 'utf8');

	assert.match(source, /import AgentWorkspace from '\.\/AgentWorkspace\.svelte';/);
	assert.match(source, /workspaceBrowserUrl/);
	assert.match(source, /agentWorkspaceOpen/);
	assert.match(source, /<AgentWorkspace/);
	assert.match(source, /chatId={\$chatId}/);
	assert.match(workspaceSource, /import AgentBrowserShell from '\.\/AgentBrowserShell\.svelte';/);
	assert.match(workspaceSource, /<AgentBrowserShell/);
});

test('browser agent opens the workspace without auto-inserting the old inline artifact', () => {
	const source = readFileSync(chatPath, 'utf8');

	assert.match(source, /const showBrowserArtifactHandler = async \(\) => {/);
	assert.match(source, /if \(isBrowserAgentEnabled\(\)\)/);
	assert.doesNotMatch(source, /await appendBrowserArtifactMessage\(userMessageId\);/);
});

test('inline browser artifact keeps fullscreen and external-open fallback controls', () => {
	const source = readFileSync(artifactPath, 'utf8');
	const browserShellSource = readFileSync(browserShellPath, 'utf8');

	assert.match(source, /import AgentBrowserShell from '..\/AgentBrowserShell\.svelte';/);
	assert.match(source, /<AgentBrowserShell/);
	assert.match(source, /showAgentControls={false}/);
	assert.match(browserShellSource, /requestFullscreen/);
	assert.match(source, /target="_blank"/);
	assert.match(source, /getBrowserArtifactUrl/);
});
