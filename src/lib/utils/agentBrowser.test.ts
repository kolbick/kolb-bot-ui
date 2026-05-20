import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	APPROVAL_REQUIRED_STATUS_TYPE,
	findApprovalEntry,
	isApprovalRequiredStatus
} from './agentBrowser.ts';

describe('agent browser status helpers', () => {
	it('detects structured approval status types', () => {
		assert.equal(
			isApprovalRequiredStatus({ type: APPROVAL_REQUIRED_STATUS_TYPE, action: 'Submit form' }),
			true
		);
	});

	it('falls back to keyword approval detection', () => {
		assert.equal(
			isApprovalRequiredStatus({ action: 'Waiting for user approval on checkout' }),
			true
		);
	});

	it('finds the first approval entry when not dismissed', () => {
		const entry = findApprovalEntry(
			[
				{ action: 'Reading page' },
				{ type: APPROVAL_REQUIRED_STATUS_TYPE, description: 'Confirm purchase' }
			],
			false
		);

		assert.equal(entry?.description, 'Confirm purchase');
	});

	it('returns null when approval was dismissed', () => {
		const entry = findApprovalEntry(
			[{ type: APPROVAL_REQUIRED_STATUS_TYPE, description: 'Confirm purchase' }],
			true
		);

		assert.equal(entry, null);
	});
});
