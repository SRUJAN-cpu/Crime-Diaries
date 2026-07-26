'use strict';

const chatRepository = require('./chatRepository');

// JS equivalents of add_user_message / add_assistant_message: they push the
// turn onto the in-memory `messages` array (Anthropic Messages API shape)
// AND persist it to the conversation table role-wise, so both the live
// request payload and the saved history stay in sync.

/**
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ catalystUserId: string, sessionId: string, content: string }} params
 */
async function addUserMessage(catalystApp, messages, { catalystUserId, sessionId, content }) {
	console.log(`[SAVE MSG] Saving user message to session: ${sessionId}`);
	messages.push({ role: 'user', content });
	await chatRepository.saveMessage(catalystApp, {
		catalystUserId,
		sessionId,
		role: 'user',
		content
	});
	console.log(`[SAVE MSG] ✓ User message saved`);
	return messages;
}

/**
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ catalystUserId: string, sessionId: string, content: string, source?: 'llm'|'rag' }} params
 */
async function addAssistantMessage(catalystApp, messages, { catalystUserId, sessionId, content, source }) {
	messages.push({ role: 'assistant', content });
	await chatRepository.saveMessage(catalystApp, {
		catalystUserId,
		sessionId,
		role: 'assistant',
		content,
		source
	});
	return messages;
}

/**
 * Save an explainable response with full metadata
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} sessionId
 * @param {Object} explainableResponse - from explainableAI module
 * @returns {Promise<void>}
 */
async function saveExplainableResponse(catalystApp, catalystUserId, sessionId, explainableResponse) {
	console.log(`[SAVE EXPLAINABLE] Saving assistant response to session: ${sessionId}`);
	const table = await catalystApp.nosql().table('conversation');
	const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
	const createdAt = Date.now();

	const item = NoSQLItem.from({
		catalyst_user_id: catalystUserId,
		updated_at: new Date(createdAt).toISOString(),
		session_id: sessionId,
		role: 'assistant',
		content: explainableResponse.content,
		source: explainableResponse.source,
		confidence: explainableResponse.confidence,
		evidence: JSON.stringify(explainableResponse.evidence || []),
		reasoning: JSON.stringify(explainableResponse.reasoning || []),
		entities: JSON.stringify(explainableResponse.entities || {})
	});

	await table.insertItems({ item });
	console.log(`[SAVE EXPLAINABLE] ✓ Assistant response saved`);
}

/**
 * Converts conversation-table rows (which carry extra columns like
 * created_time/session_id) into a plain { role, content } messages array.
 * @param {Array<{ role: string, content: string }>} historyRows
 */
function toApiMessages(historyRows) {
	return historyRows.map((row) => ({ role: row.role, content: row.content }));
}

/**
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ catalystUserId: string, sessionId: string, content: string }} params
 */
async function addSystemMessage(catalystApp, messages, { catalystUserId, sessionId, content }) {
	messages.push({ role: 'system', content });
	await chatRepository.saveMessage(catalystApp, {
		catalystUserId,
		sessionId,
		role: 'system',
		content
	});
	return messages;
}

module.exports = { addUserMessage, addAssistantMessage, addSystemMessage, toApiMessages, saveExplainableResponse };
