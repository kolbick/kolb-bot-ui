// Realtime voice for Kolb-Bot, driven directly by the ElevenLabs Agents SDK
// (@elevenlabs/client), not the <elevenlabs-convai> embed widget. The widget
// turned out to expose no public JS API at all — its "start"/"end" controls
// are internal Preact-rendered buttons inside its shadow DOM with no method
// on the custom element (confirmed by inspecting its prototype directly: only
// attribute props, no startConversation/endConversation). Driving it meant
// clicking undocumented internal markup by aria-label, which is exactly the
// kind of thing that silently breaks on any widget update. Conversation.
// startSession()/endSession() is ElevenLabs' actual documented API for
// running a call from a custom button with no widget UI of its own.
import { Conversation } from '@elevenlabs/client';
import { writable } from 'svelte/store';

// One ElevenLabs agent per workspace model, so the voice you get matches the bot
// you are actually chatting with: Kolb-Bot answers as the pirate first mate,
// Abby-Bot in her own voice. Each agent points at this same /api/v1 endpoint
// with its own model_id, so persona, memory and tools come from the backend.
// Note the model ids differ in shape ('kolb-bot' vs 'abbybot') — that is how
// they exist in the workspace, not a typo.
const AGENT_IDS: Record<string, string> = {
	'kolb-bot': 'agent_4301kywdbs7vfpwahcjnmge0andq',
	abbybot: 'agent_3801kyz6gw78f4ybff1cxe4jkmmh'
};

const DEFAULT_AGENT_ID = AGENT_IDS['kolb-bot'];

const agentIdForModel = (modelId?: string | null) =>
	(modelId ? AGENT_IDS[modelId] : undefined) ?? DEFAULT_AGENT_ID;

export const voiceAgentActive = writable(false);

let activeConversation: Conversation | null = null;

export const startVoiceAgent = async (modelId?: string | null) => {
	if (activeConversation) {
		return;
	}

	const conversation = await Conversation.startSession({
		agentId: agentIdForModel(modelId),
		onDisconnect: () => {
			activeConversation = null;
			voiceAgentActive.set(false);
		},
		onError: (error) => {
			console.error('ElevenLabs voice agent error:', error);
			activeConversation = null;
			voiceAgentActive.set(false);
		}
	});

	activeConversation = conversation;
	voiceAgentActive.set(true);
};

export const endVoiceAgent = async () => {
	const conversation = activeConversation;
	activeConversation = null;
	voiceAgentActive.set(false);
	await conversation?.endSession();
};
