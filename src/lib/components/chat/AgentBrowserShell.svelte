<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ArrowsPointingOut from '$lib/components/icons/ArrowsPointingOut.svelte';
	import Camera from '$lib/components/icons/Camera.svelte';
	import Computer from '$lib/components/icons/Computer.svelte';
	import CursorArrowRays from '$lib/components/icons/CursorArrowRays.svelte';
	import Link from '$lib/components/icons/Link.svelte';
	import Refresh from '$lib/components/icons/Refresh.svelte';
	import Sparkles from '$lib/components/icons/Sparkles.svelte';
	import BrowserApprovalPrompt from './agent/BrowserApprovalPrompt.svelte';
	import {
		type AgentControlMode,
		type AgentStatusEntry,
		findApprovalEntry,
		getBrowserAddress,
		getControlModeClass,
		getModeRibbonDescription,
		getModeRibbonLabel,
		getStatusDescription,
		getStatusOverlayLabel,
		labelForAction
	} from '$lib/utils/agentBrowser';

	export let browserUrl = '';
	export let statusEntries: AgentStatusEntry[] = [];
	export let showAgentControls = true;
	export let controlMode: AgentControlMode = 'agent';
	export let onPause: () => void | Promise<void> = async () => {};
	export let onTakeOver: () => void | Promise<void> = async () => {};
	export let onResume: () => void | Promise<void> = async () => {};

	let iframeElement: HTMLIFrameElement | null = null;
	let reloadKey = 0;
	let browserLoaded = false;
	let browserFailed = false;
	let approvalDismissed = false;
	let loadFallbackTimer: ReturnType<typeof setTimeout> | null = null;

	$: visibleStatusEntries = statusEntries.filter((entry) => !entry?.hidden);
	$: latestEntry = visibleStatusEntries.at(-1) ?? null;
	$: latestText = `${latestEntry?.action ?? ''} ${latestEntry?.description ?? ''} ${latestEntry?.query ?? ''}`.toLowerCase();
	$: approvalEntry = findApprovalEntry(visibleStatusEntries, approvalDismissed);
	$: recentActions = visibleStatusEntries.slice(-5).reverse();
	$: browserAddress = getBrowserAddress(browserUrl);
	$: controlModeClass = getControlModeClass(browserFailed, approvalEntry, controlMode);
	$: isWorking = controlMode === 'agent' && browserLoaded && !browserFailed && !approvalEntry;
	$: modeRibbonLabel = getModeRibbonLabel(browserFailed, approvalEntry, controlMode);
	$: modeRibbonDescription = getModeRibbonDescription(browserFailed, approvalEntry, controlMode, isWorking);
	$: statusOverlayLabel = getStatusOverlayLabel(
		browserFailed,
		browserLoaded,
		visibleStatusEntries.length,
		approvalEntry,
		controlMode,
		latestText
	);
	$: statusDescription = getStatusDescription(
		browserFailed,
		browserLoaded,
		visibleStatusEntries.length,
		approvalEntry,
		controlMode,
		latestEntry
	);
	$: currentActionLabel = latestEntry ? labelForAction(latestEntry) : 'Watching page';
	$: screenshotActive = latestText.includes('screenshot') || latestText.includes('capture');
	$: clickActive = latestText.includes('click') || latestText.includes('press');
	$: typingActive = latestText.includes('typ') || latestText.includes('fill');

	const scheduleLoadFallback = () => {
		if (loadFallbackTimer) {
			clearTimeout(loadFallbackTimer);
		}

		loadFallbackTimer = setTimeout(() => {
			if (browserUrl && !browserFailed && !browserLoaded) {
				browserLoaded = true;
			}
		}, 8000);
	};

	const handleBrowserLoad = () => {
		browserLoaded = true;
		browserFailed = false;
		if (loadFallbackTimer) {
			clearTimeout(loadFallbackTimer);
			loadFallbackTimer = null;
		}
	};

	const handleBrowserError = () => {
		browserFailed = true;
		browserLoaded = false;
		if (loadFallbackTimer) {
			clearTimeout(loadFallbackTimer);
			loadFallbackTimer = null;
		}
	};

	const reloadBrowser = () => {
		browserLoaded = false;
		browserFailed = false;
		reloadKey += 1;
		scheduleLoadFallback();
	};

	const openFullscreen = () => {
		iframeElement?.requestFullscreen?.();
	};

	const takeOver = async () => {
		approvalDismissed = true;
		await onTakeOver();
	};

	const pauseAgent = async () => {
		await onPause();
	};

	const resumeAgent = async () => {
		approvalDismissed = false;
		await onResume();
	};

	const approveAgentAction = async () => {
		approvalDismissed = true;
		await onResume();
	};

	const rejectAgentAction = async () => {
		approvalDismissed = true;
		await onPause();
	};

	const handleTrafficRed = async () => {
		await pauseAgent();
	};

	const handleTrafficYellow = async () => {
		await takeOver();
	};

	const handleTrafficGreen = async () => {
		await resumeAgent();
	};

	$: if (browserUrl) {
		browserLoaded = false;
		browserFailed = false;
		scheduleLoadFallback();
	}

	onMount(() => {
		if (browserUrl) {
			scheduleLoadFallback();
		}
	});

	onDestroy(() => {
		if (loadFallbackTimer) {
			clearTimeout(loadFallbackTimer);
		}
	});
</script>

<div
	class="agent-browser-shell agent-computer-window {controlModeClass} relative isolate flex h-full min-h-0 flex-col overflow-hidden rounded-[1.7rem] border border-black/[0.08] bg-[#f6f0e5] text-slate-950 shadow-[0_30px_100px_rgba(23,46,48,0.24)] ring-1 ring-white/80 {screenshotActive
		? 'screenshot-glow'
		: ''}"
>
	<div class="beach-backdrop pointer-events-none absolute inset-0 -z-30"></div>
	<div class="agent-stage-light pointer-events-none absolute inset-0 -z-20"></div>
	<div class="shoreline pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 opacity-80"></div>

	<div class="computer-titlebar flex min-h-[4.25rem] shrink-0 items-center gap-3 border-b border-black/[0.07] bg-white/58 px-4 backdrop-blur-2xl">
		<div class="traffic-light flex shrink-0 items-center gap-2">
			<button
				type="button"
				class="traffic-button traffic-red size-3.5 rounded-full bg-[#ff5f57] shadow-[0_7px_18px_rgba(255,95,87,0.28)] transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400/50 active:scale-95"
				aria-label="Pause agent"
				title="Pause agent"
				on:click={handleTrafficRed}
			></button>
			<button
				type="button"
				class="traffic-button traffic-yellow size-3.5 rounded-full bg-[#ffbd2e] shadow-[0_7px_18px_rgba(255,189,46,0.24)] transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 active:scale-95"
				aria-label="Take over browser"
				title="Take over browser"
				on:click={handleTrafficYellow}
			></button>
			<button
				type="button"
				class="traffic-button traffic-green size-3.5 rounded-full bg-[#28c840] shadow-[0_7px_18px_rgba(40,200,64,0.24)] transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 active:scale-95"
				aria-label="Resume agent"
				title="Resume agent"
				on:click={handleTrafficGreen}
			></button>
		</div>

		<div class="status-pill mx-auto flex min-w-0 max-w-[48rem] flex-1 items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white/78 px-3 py-2 shadow-[0_12px_38px_rgba(24,63,67,0.12)] backdrop-blur-xl">
			<span class="activity-orbit {isWorking ? 'is-live' : ''}" aria-hidden="true"><span></span></span>
			<Computer className="size-4 shrink-0 text-teal-700" />
			<span class="shrink-0 text-xs font-semibold text-slate-950">Agent Browser</span>
			<span class="hidden h-4 w-px bg-slate-300/80 sm:block"></span>
			<span class="min-w-0 truncate text-xs text-slate-500">{browserAddress}</span>
		</div>

		{#if showAgentControls}
			<div class="mode-ribbon {controlModeClass} hidden shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-sm backdrop-blur-xl md:flex">
				<span class="mode-ribbon-dot"></span>
				<div class="min-w-0">
					<div class="whitespace-nowrap font-semibold">{modeRibbonLabel}</div>
					<div class="hidden whitespace-nowrap text-[10px] font-medium opacity-60 xl:block">
						{modeRibbonDescription}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<div class="browser-stage relative min-h-0 flex-1 overflow-hidden p-3">
		<div class="agent-thinking-waves pointer-events-none absolute inset-3 rounded-[1.4rem]" aria-hidden="true"></div>

		<div class="agent-layout relative z-10 grid h-full min-h-0 gap-3">
			<section
				class="browser-display agent-viewport-live {controlModeClass} relative min-h-0 overflow-hidden rounded-[1.35rem] border border-white/90 bg-slate-950 shadow-[0_25px_80px_rgba(16,54,60,0.26)]"
			>
				<div class="browser-focus-ring pointer-events-none absolute inset-0 z-30 rounded-[1.35rem]"></div>

				<div class="viewport-toolbar relative z-20 flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#101820]/92 px-3 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)]">
					<div class="hidden items-center gap-1.5 sm:flex">
						<span class="size-2.5 rounded-full bg-[#ff5f57]"></span>
						<span class="size-2.5 rounded-full bg-[#ffbd2e]"></span>
						<span class="size-2.5 rounded-full bg-[#28c840]"></span>
					</div>

					<div class="browser-url-pill flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.08] px-3 py-1.5 text-xs text-white/72">
						<span class="size-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.65)]"></span>
						<span class="min-w-0 truncate">{browserAddress}</span>
					</div>

					<div class="command-rail flex shrink-0 items-center gap-1 text-white/70">
						<button
							type="button"
							class="command-button rounded-full p-2 transition hover:bg-white/10 hover:text-white active:scale-95"
							aria-label="Reload browser"
							title="Reload"
							on:click={reloadBrowser}
						>
							<Refresh className="size-4" />
						</button>
						<button
							type="button"
							class="command-button rounded-full p-2 transition hover:bg-white/10 hover:text-white active:scale-95"
							aria-label="Fullscreen browser"
							title="Fullscreen"
							on:click={openFullscreen}
						>
							<ArrowsPointingOut className="size-4" />
						</button>
						<a
							class="command-button rounded-full p-2 transition hover:bg-white/10 hover:text-white active:scale-95"
							href={browserUrl}
							target="_blank"
							rel="noreferrer"
							aria-label="Open browser in new tab"
							title="Open in new tab"
						>
							<Link className="size-4" />
						</a>
					</div>
				</div>

				<div class="viewport-surface relative h-[calc(100%-2.75rem)] min-h-0 overflow-hidden bg-[#eaf7f2]">
					{#if !browserLoaded && !browserFailed}
						<div class="loading-state absolute inset-0 z-30 overflow-hidden bg-[#edf7f2]">
							<div class="loading-sheen absolute inset-0"></div>
							<div class="absolute left-6 top-6 h-3 w-44 rounded-full bg-white/90 shadow-sm"></div>
							<div class="absolute left-6 top-12 h-3 w-72 max-w-[70%] rounded-full bg-white/60"></div>
							<div class="absolute left-6 top-24 h-40 w-[min(30rem,70%)] rounded-3xl bg-white/68 shadow-xl"></div>
							<div class="absolute bottom-6 right-6 h-24 w-56 rounded-3xl bg-teal-900/16 backdrop-blur"></div>
						</div>
					{/if}

					{#if browserFailed}
						<div class="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/72 p-6 text-center text-white backdrop-blur-md">
							<div class="max-w-sm rounded-3xl border border-white/12 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl">
								<div class="text-base font-semibold">Disconnected</div>
								<div class="mt-2 text-sm leading-6 text-white/64">
									The browser view stopped responding. Reconnect this session to continue.
								</div>
								<button
									type="button"
									class="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90 active:scale-95"
									on:click={reloadBrowser}
								>
									Reconnect
								</button>
							</div>
						</div>
					{/if}

					{#if approvalEntry}
						<BrowserApprovalPrompt
							{approvalEntry}
							{showAgentControls}
							onApprove={approveAgentAction}
							onReject={rejectAgentAction}
							onTakeOver={takeOver}
						/>
					{/if}

					{#if isWorking}
						<div class="agent-scanline pointer-events-none absolute inset-x-8 top-10 z-30 h-px"></div>
					{/if}

					{#if clickActive}
						<div class="agent-click-ripple pointer-events-none absolute left-[52%] top-[47%] z-40 size-20 rounded-full border border-teal-200/90"></div>
					{/if}

					{#if isWorking}
						<div class="agent-cursor pointer-events-none absolute left-[58%] top-[42%] z-40">
							<div class="agent-cursor-tail"></div>
							<div class="h-5 w-3 rotate-[-18deg] rounded-br-xl rounded-tl-xl border border-white/90 bg-teal-200/92 shadow-[0_0_28px_rgba(94,234,212,0.72)]"></div>
						</div>
					{/if}

					{#key reloadKey}
						<iframe
							bind:this={iframeElement}
							class="h-full min-h-0 w-full border-0 bg-[#eaf7f2] transition duration-500 {controlMode ===
							'user'
								? 'brightness-110 saturate-105'
								: controlMode === 'paused'
									? 'brightness-75 saturate-75'
									: ''}"
							src={browserUrl}
							title="Live browser"
							sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
							allow="clipboard-read; clipboard-write; fullscreen"
							on:load={handleBrowserLoad}
							on:error={handleBrowserError}
						/>
					{/key}

					<div class="viewport-vignette pointer-events-none absolute inset-0 z-20"></div>

					<div class="status-card absolute bottom-4 left-4 z-40 max-w-[min(26rem,calc(100%-2rem))] rounded-2xl border border-white/70 bg-white/82 p-3.5 text-slate-950 shadow-[0_18px_60px_rgba(13,42,47,0.18)] backdrop-blur-2xl">
						<div class="flex items-center gap-3">
							<span class="activity-orbit compact {isWorking ? 'is-live' : ''}" aria-hidden="true"><span></span></span>
							<div class="min-w-0">
								<div class="truncate text-sm font-semibold">{statusOverlayLabel}</div>
								<div class="mt-0.5 truncate text-[11px] font-medium text-slate-500">
									{currentActionLabel}
								</div>
							</div>
						</div>
						<div class="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{statusDescription}</div>
						{#if typingActive}
							<div class="mt-2 flex gap-1">
								<span class="size-1.5 animate-bounce rounded-full bg-teal-500"></span>
								<span class="size-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:120ms]"></span>
								<span class="size-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:240ms]"></span>
							</div>
						{/if}
					</div>
				</div>
			</section>

			<aside
				class="agent-command-center flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/72 p-3 shadow-[0_22px_70px_rgba(21,61,64,0.16)]"
				style="background: #fffdf7 !important;"
			>
				<div class="agent-status-stack rounded-[1.1rem] border border-black/[0.06] bg-white/72 p-3 shadow-sm">
					<div class="flex items-start gap-3">
						<div class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.2)]">
							{#if screenshotActive}
								<Camera className="size-4" />
							{:else if controlMode === 'user'}
								<CursorArrowRays className="size-4" />
							{:else}
								<Sparkles className="size-4" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-sm font-semibold text-slate-950">{modeRibbonLabel}</div>
							<div class="mt-1 text-xs leading-5 text-slate-600">{modeRibbonDescription}</div>
						</div>
					</div>
					<div class="mt-3 rounded-2xl bg-slate-950/[0.04] px-3 py-2 text-xs leading-5 text-slate-600">
						{statusDescription}
					</div>
				</div>

				{#if showAgentControls}
					<div class="agent-handoff-dock mt-3 grid gap-2 rounded-[1.1rem] border border-black/[0.06] bg-white/72 p-2 shadow-sm">
						<button
							type="button"
							class="handoff-button {controlMode === 'user' ? 'is-primary' : ''}"
							on:click={takeOver}
						>
							Take Over
						</button>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								class="handoff-button {controlMode === 'paused' ? 'is-warning' : ''}"
								on:click={pauseAgent}
							>
								Pause
							</button>
							<button
								type="button"
								class="handoff-button {controlMode === 'agent' ? 'is-active' : ''}"
								on:click={resumeAgent}
							>
								Resume
							</button>
						</div>
					</div>
				{/if}

				<div class="agent-activity-panel mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
					<div class="mb-2 flex items-center justify-between gap-3">
						<div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Agent activity</div>
						<div class="rounded-full bg-white/70 px-2 py-1 text-[10px] font-semibold text-slate-500">
							{recentActions.length || 1} live
						</div>
					</div>

					<div class="action-feed min-h-0 flex-1 overflow-y-auto pr-1">
						{#if recentActions.length === 0}
							<div class="feed-item is-current">
								<span class="feed-index">01</span>
								<div class="min-w-0">
									<div class="truncate text-xs font-semibold text-slate-900">Looking at page</div>
									<div class="mt-0.5 truncate text-[11px] text-slate-500">Ready when the browser starts.</div>
								</div>
							</div>
						{:else}
							{#each recentActions as entry, index}
								<div class="feed-item {index === 0 ? 'is-current' : ''}">
									<span class="feed-index">{String(recentActions.length - index).padStart(2, '0')}</span>
									<div class="min-w-0">
										<div class="truncate text-xs font-semibold text-slate-900">{labelForAction(entry)}</div>
										{#if entry.description}
											<div class="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">{entry.description}</div>
										{:else if entry.query}
											<div class="mt-0.5 truncate text-[11px] text-slate-500">{entry.query}</div>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</aside>
		</div>
	</div>
</div>

<style>
	.agent-browser-shell {
		z-index: 20;
		animation: agent-window-enter 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	:global(elevenlabs-convai) {
		display: none !important;
	}

	.beach-backdrop {
		background:
			radial-gradient(circle at 12% 0%, rgba(255, 218, 151, 0.72), transparent 32%),
			radial-gradient(circle at 82% 10%, rgba(76, 187, 189, 0.28), transparent 34%),
			linear-gradient(140deg, #fff8ea 0%, #e7f4ef 42%, #f1ddba 100%);
	}

	.beach-backdrop::after {
		position: absolute;
		inset: auto -12% -8% -12%;
		height: 36%;
		content: '';
		background:
			linear-gradient(178deg, rgba(255, 255, 255, 0.72), rgba(113, 198, 194, 0.2) 45%, rgba(223, 171, 104, 0.34)),
			radial-gradient(ellipse at 30% 0%, rgba(255, 255, 255, 0.78), transparent 42%);
		filter: blur(20px);
		transform: rotate(-1deg);
	}

	.agent-stage-light {
		background:
			linear-gradient(92deg, transparent, rgba(255, 255, 255, 0.48), transparent),
			radial-gradient(circle at 76% 24%, rgba(37, 99, 235, 0.08), transparent 28%),
			radial-gradient(circle at 18% 78%, rgba(20, 184, 166, 0.12), transparent 28%);
		animation: stage-light-drift 8s ease-in-out infinite;
	}

	.shoreline {
		background:
			linear-gradient(90deg, rgba(255, 255, 255, 0.5), rgba(45, 212, 191, 0.16), rgba(236, 201, 151, 0.28)),
			radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.74), transparent 66%);
		filter: blur(22px);
	}

	.agent-layout {
		grid-template-columns: minmax(0, 1fr);
	}

	@media (min-width: 1180px) {
		.agent-layout {
			grid-template-columns: minmax(0, 1fr) minmax(17rem, 20rem);
		}
	}

	.traffic-button {
		position: relative;
	}

	.traffic-button::after {
		position: absolute;
		inset: -7px;
		content: '';
		border-radius: 9999px;
		background: currentColor;
		opacity: 0;
		transform: scale(0.58);
		transition:
			opacity 160ms ease,
			transform 160ms ease;
	}

	.traffic-button:hover::after {
		opacity: 0.16;
		transform: scale(1);
	}

	.status-pill {
		animation: status-pill-rise 520ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.mode-ribbon {
		border-color: rgba(15, 23, 42, 0.08);
		background: rgba(255, 255, 255, 0.72);
		color: #0f172a;
	}

	.mode-ribbon-dot {
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: #14b8a6;
		box-shadow: 0 0 0 5px rgba(20, 184, 166, 0.12), 0 0 18px rgba(20, 184, 166, 0.38);
	}

	.mode-user .mode-ribbon-dot {
		background: #2563eb;
		box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.12), 0 0 18px rgba(37, 99, 235, 0.38);
	}

	.mode-paused .mode-ribbon-dot {
		background: #d97706;
		box-shadow: 0 0 0 5px rgba(217, 119, 6, 0.13), 0 0 18px rgba(217, 119, 6, 0.34);
	}

	.mode-approval .mode-ribbon-dot,
	.mode-disconnected .mode-ribbon-dot {
		background: #dc2626;
		box-shadow: 0 0 0 5px rgba(220, 38, 38, 0.12), 0 0 18px rgba(220, 38, 38, 0.34);
	}

	.agent-thinking-waves {
		background:
			linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.34) 28%, transparent 50%),
			repeating-linear-gradient(92deg, rgba(20, 184, 166, 0.06) 0 1px, transparent 1px 22px);
		mask-image: radial-gradient(circle at 50% 50%, black, transparent 82%);
		opacity: 0.55;
		animation: thinking-wave 5.8s ease-in-out infinite;
	}

	.activity-orbit {
		position: relative;
		display: inline-flex;
		width: 18px;
		height: 18px;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(20, 184, 166, 0.22);
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.68);
	}

	.activity-orbit.compact {
		width: 20px;
		height: 20px;
	}

	.activity-orbit span {
		width: 6px;
		height: 6px;
		border-radius: 9999px;
		background: #14b8a6;
		box-shadow: 0 0 18px rgba(20, 184, 166, 0.55);
	}

	.activity-orbit.is-live::before,
	.activity-orbit.is-live::after {
		position: absolute;
		content: '';
		border-radius: inherit;
		border: 1px solid rgba(20, 184, 166, 0.34);
		animation: orbit-pulse 1.5s ease-out infinite;
	}

	.activity-orbit.is-live::before {
		inset: -4px;
	}

	.activity-orbit.is-live::after {
		inset: -8px;
		animation-delay: 420ms;
	}

	.agent-viewport-live {
		transition:
			border-color 240ms ease,
			box-shadow 240ms ease,
			transform 240ms ease;
	}

	.agent-viewport-live.mode-agent {
		box-shadow:
			0 25px 80px rgba(16, 54, 60, 0.26),
			0 0 0 1px rgba(20, 184, 166, 0.18);
	}

	.agent-viewport-live.mode-user {
		border-color: rgba(37, 99, 235, 0.42);
		box-shadow:
			0 25px 80px rgba(37, 99, 235, 0.16),
			0 0 0 1px rgba(37, 99, 235, 0.22),
			0 0 0 6px rgba(37, 99, 235, 0.08);
	}

	.agent-viewport-live.mode-paused {
		border-color: rgba(217, 119, 6, 0.42);
		box-shadow:
			0 25px 80px rgba(217, 119, 6, 0.14),
			0 0 0 1px rgba(217, 119, 6, 0.2),
			0 0 0 6px rgba(217, 119, 6, 0.08);
	}

	.browser-focus-ring {
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.08),
			inset 0 20px 60px rgba(0, 0, 0, 0.08);
		opacity: 0.9;
		transition: box-shadow 240ms ease;
	}

	.mode-user .browser-focus-ring {
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.08),
			inset 0 0 0 3px rgba(96, 165, 250, 0.35);
	}

	.mode-paused .browser-focus-ring {
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.08),
			inset 0 0 0 3px rgba(251, 191, 36, 0.28);
	}

	.viewport-vignette {
		box-shadow:
			inset 0 0 0 1px rgba(15, 23, 42, 0.08),
			inset 0 26px 48px rgba(0, 0, 0, 0.08),
			inset 0 -34px 70px rgba(0, 0, 0, 0.08);
	}

	.loading-sheen {
		background:
			linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.62) 24%, transparent 48%),
			linear-gradient(140deg, rgba(20, 184, 166, 0.1), rgba(255, 255, 255, 0.32), rgba(251, 191, 36, 0.08));
		background-size: 220% 100%, 100% 100%;
		animation: skeleton-sheen 1.6s ease-in-out infinite;
	}

	.approval-scrim {
		background:
			radial-gradient(circle at center, rgba(255, 255, 255, 0.42), rgba(15, 23, 42, 0.22)),
			rgba(15, 23, 42, 0.26);
		backdrop-filter: blur(14px) saturate(1.15);
	}

	.status-card {
		animation: status-card-in 460ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.agent-command-center {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 251, 244, 0.76)),
			rgba(255, 255, 255, 0.82);
		animation: command-center-in 500ms cubic-bezier(0.2, 0.8, 0.2, 1) 80ms both;
	}

	.feed-item {
		position: relative;
		display: flex;
		gap: 0.65rem;
		border: 1px solid rgba(15, 23, 42, 0.06);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.56);
		padding: 0.65rem;
		transition:
			background 180ms ease,
			transform 180ms ease,
			border-color 180ms ease;
	}

	.feed-item + .feed-item {
		margin-top: 0.5rem;
	}

	.feed-item::before {
		position: absolute;
		top: 1rem;
		bottom: -0.9rem;
		left: 1.06rem;
		width: 1px;
		content: '';
		background: rgba(15, 23, 42, 0.08);
	}

	.feed-item:last-child::before {
		display: none;
	}

	.feed-item:hover {
		border-color: rgba(20, 184, 166, 0.18);
		background: rgba(255, 255, 255, 0.78);
		transform: translateY(-1px);
	}

	.feed-item.is-current {
		border-color: rgba(20, 184, 166, 0.22);
		background: rgba(236, 253, 245, 0.82);
	}

	.feed-index {
		position: relative;
		z-index: 1;
		display: flex;
		width: 1.55rem;
		height: 1.55rem;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: #0f172a;
		color: white;
		font-size: 10px;
		font-weight: 700;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
	}

	.feed-item.is-current .feed-index {
		background: #0f766e;
	}

	.handoff-button {
		min-height: 2.45rem;
		border-radius: 9999px;
		border: 1px solid rgba(15, 23, 42, 0.08);
		background: rgba(255, 255, 255, 0.76);
		padding: 0.6rem 0.85rem;
		color: #0f172a;
		font-size: 0.82rem;
		font-weight: 700;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	.handoff-button:hover {
		background: white;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
		transform: translateY(-1px);
	}

	.handoff-button:active {
		transform: scale(0.98);
	}

	.handoff-button.is-primary {
		border-color: rgba(37, 99, 235, 0.28);
		background: #2563eb;
		color: white;
		box-shadow: 0 12px 28px rgba(37, 99, 235, 0.24);
	}

	.handoff-button.is-warning {
		border-color: rgba(217, 119, 6, 0.28);
		background: #d97706;
		color: white;
		box-shadow: 0 12px 28px rgba(217, 119, 6, 0.22);
	}

	.handoff-button.is-active {
		border-color: rgba(13, 148, 136, 0.28);
		background: #0f766e;
		color: white;
		box-shadow: 0 12px 28px rgba(13, 148, 136, 0.22);
	}

	.agent-scanline {
		background: linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.9), transparent);
		box-shadow: 0 0 22px rgba(45, 212, 191, 0.54);
		animation: scanline-sweep 1.9s ease-in-out infinite;
	}

	.agent-click-ripple {
		animation: click-ripple 900ms ease-out infinite;
		box-shadow: 0 0 40px rgba(45, 212, 191, 0.34);
	}

	.agent-cursor {
		animation: cursor-drift 2.8s ease-in-out infinite;
		filter: drop-shadow(0 14px 22px rgba(15, 23, 42, 0.16));
	}

	.agent-cursor-tail {
		position: absolute;
		left: -6px;
		top: 19px;
		width: 28px;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(94, 234, 212, 0.88));
		transform: rotate(-18deg);
	}

	.screenshot-glow .agent-viewport-live {
		animation: screenshot-flash 1.15s ease-in-out;
	}

	@media (max-width: 1179px) {
		.agent-command-center {
			max-height: 15rem;
		}
	}

	@media (max-width: 640px) {
		.agent-layout {
			grid-template-rows: minmax(0, 1fr) auto;
		}

		.computer-titlebar {
			min-height: 3.75rem;
			padding-inline: 0.75rem;
		}

		.status-pill {
			justify-content: flex-start;
		}

		.browser-stage {
			padding: 0.5rem;
		}

		.agent-command-center {
			max-height: none;
			gap: 0.5rem;
			padding: 0.75rem;
		}

		.agent-activity-panel {
			display: none;
		}

		.agent-status-stack {
			padding: 0.75rem;
		}

		.agent-status-stack > div:last-child {
			display: none;
		}

		.agent-handoff-dock {
			margin-top: 0;
		}

		.status-card {
			right: 0.75rem;
			bottom: 0.75rem;
			left: 0.75rem;
			max-width: none;
		}

		.command-button {
			padding: 0.4rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.agent-browser-shell,
		.agent-stage-light,
		.agent-thinking-waves,
		.activity-orbit.is-live::before,
		.activity-orbit.is-live::after,
		.loading-sheen,
		.agent-scanline,
		.agent-click-ripple,
		.agent-cursor,
		.status-card,
		.agent-command-center,
		.screenshot-glow .agent-viewport-live {
			animation: none;
		}
	}

	@keyframes agent-window-enter {
		from {
			opacity: 0;
			transform: translateY(14px) scale(0.985);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes stage-light-drift {
		0%,
		100% {
			opacity: 0.72;
			transform: translateX(-3%);
		}
		50% {
			opacity: 1;
			transform: translateX(3%);
		}
	}

	@keyframes status-pill-rise {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes thinking-wave {
		0%,
		100% {
			background-position: -80% 0, 0 0;
			opacity: 0.38;
		}
		50% {
			background-position: 120% 0, 20px 0;
			opacity: 0.68;
		}
	}

	@keyframes orbit-pulse {
		from {
			opacity: 0.68;
			transform: scale(0.72);
		}
		to {
			opacity: 0;
			transform: scale(1.6);
		}
	}

	@keyframes skeleton-sheen {
		0% {
			background-position: -160% 0, 0 0;
		}
		100% {
			background-position: 160% 0, 0 0;
		}
	}

	@keyframes status-card-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes command-center-in {
		from {
			opacity: 0;
			transform: translateX(16px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes scanline-sweep {
		0% {
			opacity: 0;
			transform: translateX(-18%);
		}
		20%,
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateX(18%);
		}
	}

	@keyframes click-ripple {
		from {
			opacity: 0.75;
			transform: translate(-50%, -50%) scale(0.55);
		}
		to {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.55);
		}
	}

	@keyframes cursor-drift {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		50% {
			transform: translate3d(18px, 10px, 0);
		}
	}

	@keyframes screenshot-flash {
		0%,
		100% {
			box-shadow:
				0 25px 80px rgba(16, 54, 60, 0.26),
				0 0 0 1px rgba(20, 184, 166, 0.18);
		}
		45% {
			box-shadow:
				0 25px 80px rgba(16, 54, 60, 0.26),
				0 0 0 1px rgba(255, 255, 255, 0.9),
				0 0 0 8px rgba(255, 255, 255, 0.24),
				0 0 58px rgba(45, 212, 191, 0.42);
		}
	}
</style>
