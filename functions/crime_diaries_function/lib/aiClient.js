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

/**
 * Calls Zoho Catalyst's QuickML chat endpoints for greetings/small-talk that
 * don't need crime data retrieval. Routes to vlm/chat (image-capable, and
 * confirmed to require at least one image) when images are attached, or
 * glm/chat (text-only) otherwise. Unlike a running messages list, these APIs
 * take a single-shot prompt, so we just send the latest user turn.
 * @param {{ messages: Array<{role: string, content: string}>, images?: Array<string> }} params
 */
async function getLlmResponse({ messages, images }) {
	// Normalize images to an array (defaults to empty array if not provided or not an array)
	const imageArray = Array.isArray(images) ? images : [];
	const hasImages = imageArray.length > 0;
	const endpoint = hasImages ? config.llm.vlm : config.llm.glm;

	const apiUrl = requireEnv(endpoint.urlEnvVar);
	const org = requireEnv(config.catalystOrgEnvVar);
	const accessToken = await zohoOAuth.getAccessToken();

	const prompt = messages[messages.length - 1]?.content ?? '';

	const body = JSON.stringify({
		prompt,
		...(endpoint.model ? { model: endpoint.model } : {}),
		images: imageArray, // Always include images array (empty for GLM, actual for VLM)
		system_prompt: config.llm.systemPrompt,
		...config.llm.defaultParams
	});
	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
			'CATALYST-ORG': org
		},
		body
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => '');
		throw new Error(`LLM API request failed with status ${response.status}: ${errorBody}`);
	}

	const data = await response.json();
	const answer = extractAnswer(data);
	if (typeof answer !== 'string') {
		throw new Error('LLM API response did not contain a recognizable answer field');
	}

	return { answer, raw: data };
}

/**
 * Calls Zoho Catalyst's RAG answer endpoint for crime-data questions. Like the
 * LLM endpoint, this takes a single-shot query rather than a message list, plus
 * a fixed set of indexed document ids to search (RAG_DOCUMENT_IDS, comma-separated).
 * @param {{ messages: Array<{role: string, content: string}> }} params
 */
async function getRagResponse({ messages }) {
	const apiUrl = requireEnv(config.rag.urlEnvVar);
	const org = requireEnv(config.catalystOrgEnvVar);
	const accessToken = await zohoOAuth.getAccessToken();

	const documents = (process.env[config.rag.documentIdsEnvVar] || '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const query = messages[messages.length - 1]?.content ?? '';

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
