<script lang="ts">
	import Sparkles from '$lib/components/icons/Sparkles.svelte';
	import type { AgentStatusEntry } from '$lib/utils/agentBrowser';

	export let approvalEntry: AgentStatusEntry;
	export let showAgentControls = true;
	export let onApprove: () => void | Promise<void> = async () => {};
	export let onReject: () => void | Promise<void> = async () => {};
	export let onTakeOver: () => void | Promise<void> = async () => {};
</script>

<div class="approval-scrim absolute inset-0 z-50 flex items-center justify-center p-5">
	<div
		class="max-w-md rounded-[1.6rem] border border-white/36 bg-white/84 p-5 text-center text-slate-950 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-2xl"
	>
		<div
			class="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-700"
		>
			<Sparkles className="size-5" />
		</div>
		<div class="text-base font-semibold">The agent needs your approval</div>
		<div class="mt-2 text-sm leading-6 text-slate-600">
			{approvalEntry.description || approvalEntry.action || 'The agent wants to submit this form.'}
		</div>
		<div class="mt-5 flex flex-wrap justify-center gap-2">
			<button
				type="button"
				class="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95"
				on:click={onApprove}
			>
				Approve
			</button>
			<button
				type="button"
				class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
				on:click={onReject}
			>
				Reject
			</button>
			{#if showAgentControls}
				<button
					type="button"
					class="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 active:scale-95"
					on:click={onTakeOver}
				>
					Take Over
				</button>
			{/if}
		</div>
	</div>
</div>
