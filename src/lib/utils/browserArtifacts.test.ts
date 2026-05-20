import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	createBrowserArtifactFile,
	DEFAULT_BROWSER_ARTIFACT_PATH,
	getBrowserArtifacts,
	getDefaultBrowserArtifactUrl,
	getBrowserUrlFromHistory,
	isBrowserArtifact
} from './browserArtifacts.ts';

describe('browser artifact files', () => {
	it('detects explicit browser file entries', () => {
		assert.equal(isBrowserArtifact({ type: 'browser', url: '/browser/vnc.html' }), true);
	});

	it('detects artifact file entries marked as browser artifacts', () => {
		assert.equal(isBrowserArtifact({ type: 'artifact', artifact_type: 'browser' }), true);
	});

	it('filters non-browser files out of mixed message files', () => {
		const artifacts = getBrowserArtifacts([
			{ type: 'image', url: '/image.png' },
			{ type: 'browser', url: '/browser/vnc.html' }
		]);

		assert.deepEqual(artifacts, [{ type: 'browser', url: '/browser/vnc.html' }]);
	});

	it('uses the public noVNC path by default without credentials', () => {
		assert.equal(getDefaultBrowserArtifactUrl(), DEFAULT_BROWSER_ARTIFACT_PATH);
		assert.doesNotMatch(DEFAULT_BROWSER_ARTIFACT_PATH, /password=/);
	});

	it('creates the browser artifact file used by the chat button', () => {
		assert.deepEqual(createBrowserArtifactFile(), {
			type: 'browser',
			name: 'Live browser',
			title: 'Live browser',
			url: DEFAULT_BROWSER_ARTIFACT_PATH
		});
	});

	it('prefers a session-specific browser URL from chat history', () => {
		const sessionUrl = '/browser/vnc.html?autoconnect=1&session=abc';
		const fromHistory = getBrowserUrlFromHistory({
			messages: {
				m1: {
					files: [{ type: 'browser', url: sessionUrl }]
				}
			}
		});

		assert.equal(fromHistory, sessionUrl);
	});
});
