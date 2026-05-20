<script lang="ts">
	import { getContext } from 'svelte';
	import { Pane, PaneResizer } from 'paneforge';
	import { onMount, tick } from 'svelte';
	import type { AgentControlMode } from '$lib/utils/agentBrowser';
	import Computer from '$lib/components/icons/Computer.svelte';
	import Terminal from '$lib/components/icons/Terminal.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import AgentBrowserShell from './AgentBrowserShell.svelte';
	import XTerminal from './XTerminal.svelte';

	const i18n = getContext('i18n');

	export let open = false;
	export let mobile = false;
	export let browserUrl = '';
	export let controlMode: AgentControlMode = 'agent';
	export let statusEntries: Array<{
		done?: boolean;
		action?: string;
		description?: string;
		urls?: string[];
		query?: string;
		hidden?: boolean;
	}> = [];
	export let terminalId: string | null = null;
	export let chatId: string | null = null;
	export let onClose: () => void = () => {};
	export let onPause: () => void | Promise<void> = async () => {};
	export let onTakeOver: () => void | Promise<void> = async () => {};
	export let onResume: () => void | Promise<void> = async () => {};
	export let pane: Pane | null = null;

	type WorkspaceTab = 'browser' | 'steps' | 'terminal';

	const DESKTOP_DEFAULT_SIZE = 58;
	const DESKTOP_MIN_SIZE = 38;
	const DESKTOP_MAX_SIZE = 72;

	let activeTab: WorkspaceTab = 'browser';
	let terminalConnected = false;
	let terminalConnecting = false;
	let paneReady = false;
	let openResizeQueued = false;

	$: visibleStatusEntries = statusEntries.filter((entry) => !entry?.hidden);
	$: terminalStateLabel = terminalConnected
		? 'Connected'
		: terminalConnecting
			? 'Connecting'
			: terminalId
				? 'Ready'
				: 'No terminal';

	const clampWorkspaceSize = (size: number) =>
		Math.min(DESKTOP_MAX_SIZE, Math.max(DESKTOP_MIN_SIZE, size));

	const getSavedWorkspaceSize = () => {
		if (typeof localStorage === 'undefined') {
			return DESKTOP_DEFAULT_SIZE;
		}

		const savedSize = Number(localStorage.agentWorkspaceSize);
		return Number.isFinite(savedSize) ? clampWorkspaceSize(savedSize) : DESKTOP_DEFAULT_SIZE;
	};

	export const openPane = async () => {
		await tick();

		if (!pane || mobile) {
			return;
		}

		const savedSize = getSavedWorkspaceSize();
		if (savedSize === DESKTOP_DEFAULT_SIZE) {
			pane.resize(DESKTOP_DEFAULT_SIZE);
			return;
		}

		pane.resize(savedSize);
	};

	const handlePaneResize = (size: number) => {
		if (!paneReady || !open || mobile || typeof localStorage === 'undefined') {
			return;
		}

		localStorage.agentWorkspaceSize = `${Math.round(clampWorkspaceSize(size))}`;
	};

	const tabs: Array<{ id: WorkspaceTab; labelKey: string }> = [
		{ id: 'browser', labelKey: 'Agent workspace tab browser' },
		{ id: 'steps', labelKey: 'Agent workspace tab steps' },
		{ id: 'terminal', labelKey: 'Agent workspace tab terminal' }
	];

	onMount(() => {
		paneReady = true;

		return () => {
			paneReady = false;
		};
	});

	$: if (open && !mobile && pane && !openResizeQueued) {
		openResizeQueued = true;
		openPane().finally(() => {
			setTimeout(() => {
				openResizeQueued = false;
			}, 0);
		});
	}

	$: if (!open) {
		openResizeQueued = false;
	}
</script>

{#if open}
	{#if mobile}
		<div
			class="workspace-panel fixed inset-0 z-50 flex flex-col bg-gray-50/95 text-gray-900 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur transition-all duration-500 ease-out dark:bg-gray-950/95 dark:text-gray-100"
		>
			<div class="workspace-glow pointer-events-none absolute inset-x-8 top-0 h-px"></div>
			<div
				class="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/85 px-3 backdrop-blur dark:border-white/10 dark:bg-gray-950/80"
			>
				<div class="flex min-w-0 items-center gap-2.5">
					<div
						class="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-800/50"
					>
						<span
							class="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18)] {activeTab ===
							'browser'
								? 'animate-pulse'
								: ''}"
						></span>
						<Computer className="size-4" />
					</div>
					<div class="min-w-0">
						<div class="truncate text-sm font-semibold">{$i18n.t('Agent workspace')}</div>
						<div class="truncate text-xs text-gray-500 dark:text-gray-400">
							{activeTab === 'terminal'
								? terminalStateLabel
								: $i18n.t('Live browser automation')}
						</div>
					</div>
				</div>

				<button
					type="button"
					class="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-black/5 hover:text-gray-900 active:scale-95 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
					aria-label="Close Agent workspace"
					on:click={onClose}
				>
					<XMark className="size-4" />
				</button>
			</div>

			<div class="border-b border-black/5 bg-white/70 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-gray-950/60">
				<div class="flex rounded-full bg-gray-100/90 p-1 ring-1 ring-black/5 dark:bg-gray-900/90 dark:ring-white/10">
					{#each tabs as tab}
						<button
							type="button"
							class="relative flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 {activeTab ===
							tab.id
								? 'bg-white text-gray-950 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:text-white dark:ring-white/10'
								: 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
							on:click={() => (activeTab = tab.id)}
						>
							{$i18n.t(tab.labelKey)}
						</button>
					{/each}
				</div>
			</div>

			<div class="min-h-0 flex-1 p-2.5">
				{#if activeTab === 'browser'}
					<div class="workspace-frame h-full min-h-0">
						<AgentBrowserShell
							{browserUrl}
							{controlMode}
							{statusEntries}
							onPause={onPause}
							onTakeOver={onTakeOver}
							onResume={onResume}
						/>
					</div>
				{:else if activeTab === 'steps'}
					<div
						class="h-full overflow-y-auto rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-gray-900/70 dark:ring-white/10"
					>
						<div class="mb-4 flex items-center justify-between gap-3">
							<div class="text-sm font-semibold">{$i18n.t('Agent steps')}</div>
							<div class="text-xs text-gray-400">{visibleStatusEntries.length} visible</div>
						</div>

						{#if visibleStatusEntries.length === 0}
							<div class="rounded-2xl border border-dashed border-gray-200/80 p-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
								{$i18n.t('No agent steps yet.')}
							</div>
						{:else}
							<div class="space-y-1.5">
								{#each visibleStatusEntries as entry, index}
									<div class="group flex gap-3 rounded-2xl px-2 py-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5">
										<div class="flex flex-col items-center">
											<div
												class="mt-1 size-2.5 rounded-full transition-all duration-200 {entry.done
													? 'bg-emerald-500'
													: 'bg-cyan-500 shadow-[0_0_0_5px_rgba(6,182,212,0.14)] animate-pulse'}"
											></div>
											{#if index < visibleStatusEntries.length - 1}
												<div class="mt-1 h-full min-h-7 w-px bg-gray-200/80 dark:bg-gray-800"></div>
											{/if}
										</div>

										<div class="min-w-0 flex-1 pb-2">
											<div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
												{entry.action || (entry.done ? 'Completed step' : 'Working')}
											</div>
											{#if entry.description}
												<div class="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
													{entry.description}
												</div>
											{/if}
											{#if entry.query}
												<div class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
													Query: {entry.query}
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div
						class="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-gray-950 shadow-[0_18px_60px_rgba(15,23,42,0.18)] ring-1 ring-black/15"
					>
						<div class="flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-gray-900/95 px-3 text-gray-300">
							<div class="flex min-w-0 items-center gap-2 text-sm font-medium">
								<Terminal className="size-4" />
								<span class="truncate">{terminalId || 'Terminal'}</span>
							</div>
							<div class="flex items-center gap-1.5 text-xs text-gray-400">
								<span
									class="size-2 rounded-full {terminalConnected
										? 'bg-emerald-400'
										: terminalConnecting
											? 'bg-yellow-400 animate-pulse'
											: terminalId
												? 'bg-gray-500'
												: 'bg-red-400'}"
								></span>
								{terminalStateLabel}
							</div>
						</div>

						{#if terminalId}
							<div class="min-h-0 flex-1 p-1.5">
								<XTerminal
									bind:connected={terminalConnected}
									bind:connecting={terminalConnecting}
									{chatId}
								/>
							</div>
						{:else}
							<div class="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
								No terminal selected for this model.
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<PaneResizer
			class="relative z-20 hidden items-center justify-center border-l border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-700 md:flex"
		>
			<div class="absolute -left-1.5 -right-1.5 bottom-0 top-0 cursor-col-resize bg-transparent" />
		</PaneResizer>

		<Pane
			bind:pane
			defaultSize={DESKTOP_DEFAULT_SIZE}
			minSize={DESKTOP_MIN_SIZE}
			onResize={handlePaneResize}
			class="workspace-panel z-10 hidden h-full min-h-0 border-l border-black/5 bg-gray-50/90 text-gray-900 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur transition-all duration-500 ease-out dark:border-white/10 dark:bg-gray-950/90 dark:text-gray-100 md:flex"
		>
			<div class="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
				<div class="workspace-glow pointer-events-none absolute inset-x-8 top-0 h-px"></div>
				<div
					class="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/80 px-3 backdrop-blur dark:border-white/10 dark:bg-gray-950/70"
				>
					<div class="flex min-w-0 items-center gap-2.5">
						<div
							class="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-800/50"
						>
							<span
								class="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18)] {activeTab ===
								'browser'
									? 'animate-pulse'
									: ''}"
							></span>
							<Computer className="size-4" />
						</div>
						<div class="min-w-0">
							<div class="truncate text-sm font-semibold">{$i18n.t('Agent workspace')}</div>
							<div class="flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400">
								<span
									class="size-1.5 rounded-full {activeTab === 'terminal' && terminalConnected
										? 'bg-emerald-500'
										: activeTab === 'terminal' && terminalConnecting
											? 'bg-yellow-400 animate-pulse'
											: 'bg-cyan-500'}"
								></span>
								{activeTab === 'terminal'
									? terminalStateLabel
									: $i18n.t('Visible Playwright browser')}
							</div>
						</div>
					</div>

					<button
						type="button"
						class="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-black/5 hover:text-gray-900 active:scale-95 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
						aria-label="Close Agent workspace"
						on:click={onClose}
					>
						<XMark className="size-4" />
					</button>
				</div>

				<div class="border-b border-black/5 bg-white/55 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-gray-950/45">
					<div class="flex rounded-full bg-gray-100/90 p-1 ring-1 ring-black/5 dark:bg-gray-900/90 dark:ring-white/10">
						{#each tabs as tab}
							<button
								type="button"
								class="relative flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 {activeTab ===
								tab.id
									? 'bg-white text-gray-950 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:text-white dark:ring-white/10'
									: 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
								on:click={() => (activeTab = tab.id)}
							>
								{$i18n.t(tab.labelKey)}
							</button>
						{/each}
					</div>
				</div>

				<div class="min-h-0 flex-1 p-3">
					{#if activeTab === 'browser'}
						<div class="workspace-frame h-full min-h-0">
							<AgentBrowserShell
								{browserUrl}
								{controlMode}
								{statusEntries}
								onPause={onPause}
								onTakeOver={onTakeOver}
								onResume={onResume}
							/>
						</div>
					{:else if activeTab === 'steps'}
						<div
							class="h-full overflow-y-auto rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-gray-900/70 dark:ring-white/10"
						>
							<div class="mb-4 flex items-center justify-between gap-3">
								<div class="text-sm font-semibold">{$i18n.t('Agent steps')}</div>
								<div class="text-xs text-gray-400">{visibleStatusEntries.length} visible</div>
							</div>

							{#if visibleStatusEntries.length === 0}
								<div class="rounded-2xl border border-dashed border-gray-200/80 p-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
									{$i18n.t('No agent steps yet.')}
								</div>
							{:else}
								<div class="space-y-1.5">
									{#each visibleStatusEntries as entry, index}
										<div class="group flex gap-3 rounded-2xl px-2 py-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5">
											<div class="flex flex-col items-center">
												<div
													class="mt-1 size-2.5 rounded-full transition-all duration-200 {entry.done
														? 'bg-emerald-500'
														: 'bg-cyan-500 shadow-[0_0_0_5px_rgba(6,182,212,0.14)] animate-pulse'}"
												></div>
												{#if index < visibleStatusEntries.length - 1}
													<div class="mt-1 h-full min-h-7 w-px bg-gray-200/80 dark:bg-gray-800"></div>
												{/if}
											</div>

											<div class="min-w-0 flex-1 pb-2">
												<div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
													{entry.action || (entry.done ? 'Completed step' : 'Working')}
												</div>
												{#if entry.description}
													<div class="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
														{entry.description}
													</div>
												{/if}
												{#if entry.query}
													<div class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
														Query: {entry.query}
													</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<div
							class="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-gray-950 shadow-[0_18px_60px_rgba(15,23,42,0.18)] ring-1 ring-black/15"
						>
							<div class="flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-gray-900/95 px-3 text-gray-300">
								<div class="flex min-w-0 items-center gap-2 text-sm font-medium">
									<Terminal className="size-4" />
									<span class="truncate">{terminalId || 'Terminal'}</span>
								</div>
								<div class="flex items-center gap-1.5 text-xs text-gray-400">
									<span
										class="size-2 rounded-full {terminalConnected
											? 'bg-emerald-400'
											: terminalConnecting
												? 'bg-yellow-400 animate-pulse'
												: terminalId
													? 'bg-gray-500'
													: 'bg-red-400'}"
									></span>
									{terminalStateLabel}
								</div>
							</div>

							{#if terminalId}
								<div class="min-h-0 flex-1 p-1.5">
									<XTerminal
										bind:connected={terminalConnected}
										bind:connecting={terminalConnecting}
										{chatId}
									/>
								</div>
							{:else}
								<div class="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
									No terminal selected for this model.
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</Pane>
	{/if}
{/if}

<style>
	.workspace-panel {
		animation: workspace-enter 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.workspace-glow {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(34, 211, 238, 0.7),
			rgba(16, 185, 129, 0.55),
			transparent
		);
		animation: workspace-glow 2.8s ease-in-out infinite;
	}

	.workspace-frame {
		transform-origin: center;
		animation: workspace-frame-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	@keyframes workspace-enter {
		from {
			opacity: 0;
			transform: translateX(22px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes workspace-frame-in {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.985);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes workspace-glow {
		0%,
		100% {
			opacity: 0.45;
			transform: translateX(-16%);
		}
		50% {
			opacity: 1;
			transform: translateX(16%);
		}
	}
</style>
