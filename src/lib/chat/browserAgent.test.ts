import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	BROWSER_AGENT_TOOL_ID,
	browserAgentEnabled,
	buildActiveSystemPrompt,
	resolveWorkspaceBrowserUrl
} from './browserAgent.ts';

describe('browser agent module', () => {
	it('detects when the browser agent tool is selected', () => {
		assert.equal(browserAgentEnabled([BROWSER_AGENT_TOOL_ID]), true);
		assert.equal(browserAgentEnabled(['other-tool']), false);
	});

	it('appends the browser agent system prompt when enabled', () => {
		const prompt = buildActiveSystemPrompt('Base prompt', [BROWSER_AGENT_TOOL_ID]);
		assert.match(prompt, /Agent mode is enabled/);
		assert.match(prompt, /Base prompt/);
	});

	it('resolves workspace URL from history before fallback', () => {
		const fallback = '/browser/vnc.html?autoconnect=1';
		const sessionUrl = '/browser/vnc.html?session=live';
		const resolved = resolveWorkspaceBrowserUrl(
			{ messages: { m1: { files: [{ type: 'browser', url: sessionUrl }] } } },
			fallback
		);

		assert.equal(resolved, sessionUrl);
	});
});
