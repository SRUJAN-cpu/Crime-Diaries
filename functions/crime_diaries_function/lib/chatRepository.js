'use strict';

const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
const config = require('./config');

const { NoSQLOperator, NoSQLUpdateOperationType } = NoSQLEnum;

/**
 * Creates the user's profile row on their first message, or bumps last_active_time
 * on every subsequent message.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {import('zcatalyst-sdk-node/lib/utils/pojo/common').ICatalystUser} catalystUser
 */
async function ensureUserRecord(catalystApp, catalystUser) {
	const table = await catalystApp.nosql().table(config.tables.user.name);
	const key = NoSQLItem.from({ [config.tables.user.partitionKey]: catalystUser.user_id });
	const now = Date.now();

	const existing = await table.fetchItem({ keys: [key] });
	const found = existing.get && existing.get[0] && existing.get[0].item;

	if (found) {
		await table.updateItems({
			keys: key,
			update_attributes: [
				{
					operation_type: NoSQLUpdateOperationType.PUT,
					attribute_path: ['last_active_time'],
					update_value: NoSQLMarshall.makeNumber(now)
				}
			]
		});
		return;
	}

	await table.insertItems({
		item: NoSQLItem.from({
			catalyst_user_id: catalystUser.user_id,
			email: catalystUser.email_id,
			first_name: catalystUser.first_name,
			last_name: catalystUser.last_name,
			created_time: now,
			last_active_time: now
		})
	});
}

/**
 * Persists a single chat message (the user's question, or the LLM/RAG answer)
 * role-wise, matching the { role, content } shape used to build API message arrays.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {{ catalystUserId: string, sessionId: string, role: 'user'|'assistant', content: string, source?: 'llm'|'rag', createdTime?: number }} params
 * @returns {Promise<number>} the created_time used for the row
 */
async function saveMessage(catalystApp, { catalystUserId, sessionId, role, content, source, createdTime }) {
	const table = await catalystApp.nosql().table(config.tables.conversation.name);
	const createdAt = createdTime ?? Date.now();

	await table.insertItems({
		item: NoSQLItem.from({
			catalyst_user_id: catalystUserId,
			created_time: createdAt,
			session_id: sessionId,
			role,
			content,
			...(source ? { source } : {})
		})
	});

	return createdAt;
}

/**
 * Fetches a user's chat history, ordered oldest to newest. Pass `sessionId` to
 * scope it to a single conversation, or omit it to get everything (e.g. to
 * build a "past sessions" list when the user revisits).
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {{ sessionId?: string, limit?: number }} [options]
 */
async function getHistoryForUser(catalystApp, catalystUserId, { sessionId, limit } = {}) {
	const table = await catalystApp.nosql().table(config.tables.conversation.name);

	const query = {
		key_condition: {
			attribute: config.tables.conversation.partitionKey,
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(catalystUserId)
		},
		forward_scan: true
	};

	if (limit) {
		query.limit = limit;
	}

	if (sessionId) {
		query.other_condition = {
			attribute: 'session_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(sessionId)
		};
	}

	const response = await table.queryTable(query);
	return (response.get || [])
		.map((entry) => entry.item && entry.item.to())
		.filter(Boolean);
}

/**
 * Groups a user's message history into a list of past sessions, most recent first.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 */
async function listSessions(catalystApp, catalystUserId) {
	const messages = await getHistoryForUser(catalystApp, catalystUserId, { limit: 500 });

	const sessions = new Map();
	for (const msg of messages) {
		const sessionId = msg.session_id;
		const existing = sessions.get(sessionId) || {
			session_id: sessionId,
			message_count: 0,
			last_message_time: 0,
			last_message: ''
		};
		existing.message_count += 1;
		const createdTime = Number(msg.created_time);
		if (createdTime >= existing.last_message_time) {
			existing.last_message_time = createdTime;
			existing.last_message = msg.content;
		}
		sessions.set(sessionId, existing);
	}

	return Array.from(sessions.values()).sort((a, b) => b.last_message_time - a.last_message_time);
}

module.exports = {
	ensureUserRecord,
	saveMessage,
	getHistoryForUser,
	listSessions
};
