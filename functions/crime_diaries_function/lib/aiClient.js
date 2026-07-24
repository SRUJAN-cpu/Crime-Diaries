'use strict';

const config = require('./config');
const zohoOAuth = require('./zohoOAuth');

function extractAnswer(data) {
	// TODO: confirm the actual response field once you've hit these live.
	return (
		data.answer ??
		data.response ??
		data.result ??
		data.text ??
		data.output ??
		data.message ??
		data.content ??
		data.choices?.[0]?.message?.content ??
		data.choices?.[0]?.text
	);
}

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} environment variable is not set`);
	}
	return value;
}

const LANGUAGE_NAMES = { en: 'English', kn: 'Kannada' };

// Appended to whatever system prompt/query we send, so every backend (vlm,
// glm, rag) gets the same instruction regardless of its own request shape.
function languageInstruction(language) {
	const name = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;
	return `IMPORTANT: You must respond exclusively in ${name}. Do not include any text in any other language. If the user's message is in another language, you must still respond in ${name}.`;
}

async function authHeaders(org) {
	const accessToken = await zohoOAuth.getAccessToken();
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
		'CATALYST-ORG': org
	};
}

/**
 * Calls Zoho Catalyst's vlm/chat endpoint — single-shot { prompt, images, ... },
 * not a running messages list. Confirmed via live testing to require at least
 * one real image; only called when one is attached.
 * @param {{ messages: Array<{role: string, content: string}>, images: Array<string>, language?: string }} params
 */
async function callVlm({ messages, images, language }) {
	const apiUrl = requireEnv(config.llm.vlm.urlEnvVar);
	const org = requireEnv(config.catalystOrgEnvVar);
	const headers = await authHeaders(org);

	const prompt = messages[messages.length - 1]?.content ?? '';

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			prompt,
			model: config.llm.vlm.model,
			images,
			system_prompt: `${config.llm.systemPrompt} ${languageInstruction(language)}`,
			...config.llm.vlm.defaultParams
		})
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => '');
		throw new Error(`VLM API request failed with status ${response.status}: ${errorBody}`);
	}

	const data = await response.json();
	const answer = extractAnswer(data);
	if (typeof answer !== 'string') {
		throw new Error('VLM API response did not contain a recognizable answer field');
	}

	return { answer, raw: data };
}

/**
 * Calls Zoho Catalyst's glm/chat endpoint — OpenAI-Chat-Completions-style
 * { model, messages: [{role, content}, ...], ... }, confirmed via the
 * console's own integration sample. Text-only; used for everything that
 * doesn't have an image attached. Unlike vlm/chat, this one natively takes
 * the full running conversation, not just the latest turn.
 * @param {{ messages: Array<{role: string, content: string}>, language?: string }} params
 */
async function callGlm({ messages, language }) {
	const apiUrl = requireEnv(config.llm.glm.urlEnvVar);
	const org = requireEnv(config.catalystOrgEnvVar);
	const headers = await authHeaders(org);

	const chatMessages = [
		{ role: 'system', content: `${config.llm.systemPrompt} ${languageInstruction(language)}` },
		...messages.map((m) => ({ role: m.role, content: m.content }))
	];

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			model: config.llm.glm.model,
			messages: chatMessages,
			// This is a thinking-capable model — without explicitly disabling
			// it, the chain-of-thought reasoning ends up dumped straight into
			// `content` instead of the separate `reasoning` field, which is
			// why answers were coming back as raw internal monologue.
			chat_template_kwargs: { enable_thinking: false },
			...config.llm.glm.defaultParams
		})
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => '');
		throw new Error(`GLM API request failed with status ${response.status}: ${errorBody}`);
	}

	const data = await response.json();
	const answer = extractAnswer(data);
	if (typeof answer !== 'string') {
		throw new Error('GLM API response did not contain a recognizable answer field');
	}

	return { answer, raw: data };
}

/**
 * Routes to vlm/chat when images are attached, glm/chat otherwise.
 * @param {{ messages: Array<{role: string, content: string}>, images?: Array<string>, language?: string }} params
 */
async function getLlmResponse({ messages, images, language }) {
	const hasImages = Array.isArray(images) && images.length > 0;
	return hasImages ? callVlm({ messages, images, language }) : callGlm({ messages, language });
}

/**
 * Calls Zoho Catalyst's RAG answer endpoint for crime-data questions. Like
 * vlm/chat, this takes a single-shot query rather than a message list, plus
 * a fixed set of indexed document ids to search (RAG_DOCUMENT_IDS, comma-separated).
 * @param {{ messages: Array<{role: string, content: string}>, language?: string }} params
 */
async function getRagResponse({ messages, language }) {
	const apiUrl = requireEnv(config.rag.urlEnvVar);
	const org = requireEnv(config.catalystOrgEnvVar);
	const accessToken = await zohoOAuth.getAccessToken();

	const documents = (process.env[config.rag.documentIdsEnvVar] || '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	// RAG's contract has no system_prompt slot, so the language instruction
	// rides along as a trailing note on the query itself. It only affects the
	// generation step, not retrieval, in a typical RAG pipeline.
	const baseQuery = messages[messages.length - 1]?.content ?? '';
	const query = `${baseQuery}\n\n(${languageInstruction(language)})`;

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Zoho-oauthtoken ${accessToken}`,
			'CATALYST-ORG': org
		},
		body: JSON.stringify({ query, documents })
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => '');
		throw new Error(`RAG API request failed with status ${response.status}: ${errorBody}`);
	}

	const data = await response.json();
	const answer = extractAnswer(data);
	if (typeof answer !== 'string') {
		throw new Error('RAG API response did not contain a recognizable answer field');
	}

	return { answer, raw: data };
}

module.exports = { getLlmResponse, getRagResponse };
