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
	messages.push({ role: 'user', content });
	await chatRepository.saveMessage(catalystApp, {
		catalystUserId,
		sessionId,
		role: 'user',
		content
	});
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
 * Converts conversation-table rows (which carry extra columns like
 * created_time/session_id) into a plain { role, content } messages array.
 * @param {Array<{ role: string, content: string }>} historyRows
 */
function toApiMessages(historyRows) {
	return historyRows.map((row) => ({ role: row.role, content: row.content }));
}

module.exports = { addUserMessage, addAssistantMessage, toApiMessages };
