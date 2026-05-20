export type AgentStatusEntry = {
	done?: boolean;
	action?: string;
	description?: string;
	urls?: string[];
	query?: string;
	hidden?: boolean;
	type?: string;
	status_type?: string;
};

export type AgentControlMode = 'agent' | 'user' | 'paused';

export const APPROVAL_REQUIRED_STATUS_TYPE = 'approval_required';

export const isApprovalRequiredStatus = (entry: AgentStatusEntry | null | undefined): boolean => {
	if (!entry) {
		return false;
	}

	const statusType = (entry.type ?? entry.status_type ?? '').toLowerCase();
	if (statusType === APPROVAL_REQUIRED_STATUS_TYPE) {
		return true;
	}

	const text = `${entry.action ?? ''} ${entry.description ?? ''}`.toLowerCase();
	return (
		text.includes('approval') ||
		text.includes('permission') ||
		text.includes('confirm') ||
		text.includes('submit')
	);
};

export const findApprovalEntry = (
	entries: AgentStatusEntry[],
	dismissed: boolean
): AgentStatusEntry | null => {
	if (dismissed) {
		return null;
	}

	return entries.find((entry) => isApprovalRequiredStatus(entry)) ?? null;
};

export const getBrowserAddress = (url: string) => {
	if (!url) return 'Live browser session';

	try {
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
		const parsed = new URL(url, baseUrl);
		if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return 'Live browser session';
		return `${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
	} catch {
		return url;
	}
};

export const getControlModeClass = (
	isBrowserFailed: boolean,
	pendingApproval: AgentStatusEntry | null,
	mode: AgentControlMode
) => {
	if (isBrowserFailed) return 'mode-disconnected';
	if (pendingApproval) return 'mode-approval';
	return `mode-${mode}`;
};

export const getModeRibbonLabel = (
	isBrowserFailed: boolean,
	pendingApproval: AgentStatusEntry | null,
	mode: AgentControlMode
) => {
	if (isBrowserFailed) return 'Disconnected';
	if (pendingApproval) return 'Approval needed';
	if (mode === 'user') return 'You control';
	if (mode === 'paused') return 'Paused';
	return 'Agent control';
};

export const getModeRibbonDescription = (
	isBrowserFailed: boolean,
	pendingApproval: AgentStatusEntry | null,
	mode: AgentControlMode,
	working: boolean
) => {
	if (isBrowserFailed) return 'Browser needs reconnect';
	if (pendingApproval) return 'Waiting for your decision';
	if (mode === 'user') return 'Keyboard and pointer are yours';
	if (mode === 'paused') return 'Automation is stopped';
	return working ? 'Working in the browser' : 'Ready for the next step';
};

export const getStatusOverlayLabel = (
	isBrowserFailed: boolean,
	isBrowserLoaded: boolean,
	visibleStatusCount: number,
	pendingApproval: AgentStatusEntry | null,
	mode: AgentControlMode,
	actionText: string
) => {
	if (isBrowserFailed) return 'Disconnected';
	if (!isBrowserLoaded && visibleStatusCount === 0) return 'Connecting';
	if (pendingApproval) return 'Waiting for approval';
	if (mode === 'user') return 'User controlling';
	if (mode === 'paused') return 'Paused';
	if (actionText.includes('click')) return 'Clicking';
	if (actionText.includes('typ') || actionText.includes('fill')) return 'Typing';
	if (actionText.includes('read') || actionText.includes('scan')) return 'Reading page';
	if (actionText.includes('wait')) return 'Waiting for page';
	if (actionText.includes('screenshot') || actionText.includes('capture')) return 'Taking screenshot';
	return 'Agent working';
};

export const getStatusDescription = (
	isBrowserFailed: boolean,
	isBrowserLoaded: boolean,
	visibleStatusCount: number,
	pendingApproval: AgentStatusEntry | null,
	mode: AgentControlMode,
	entry: AgentStatusEntry | null
) => {
	if (isBrowserFailed) return 'The live browser stopped responding. Reconnect to restore the view.';
	if (!isBrowserLoaded && visibleStatusCount === 0) return 'Opening the live browser session.';
	if (pendingApproval) return pendingApproval.description || pendingApproval.action || 'The agent needs your decision.';
	if (mode === 'user') return 'Take the action yourself, then resume the agent when ready.';
	if (mode === 'paused') return 'The agent is stopped until you resume it.';
	return entry?.description || entry?.action || 'Reading the page and choosing the next browser action.';
};

export const labelForAction = (entry: AgentStatusEntry) => {
	const text = `${entry?.action ?? ''} ${entry?.description ?? ''}`.toLowerCase();
	if (text.includes('click')) return 'Clicking button';
	if (text.includes('typ') || text.includes('fill')) return 'Typing';
	if (text.includes('screenshot') || text.includes('capture')) return 'Capturing screen';
	if (text.includes('link') || text.includes('open')) return 'Opening link';
	if (text.includes('wait')) return 'Waiting for page';
	if (isApprovalRequiredStatus(entry)) return 'Needs approval';
	if (text.includes('error') || text.includes('failed')) return 'Error';
	if (text.includes('read') || text.includes('scan')) return 'Reading content';
	return entry?.action || 'Looking at page';
};
