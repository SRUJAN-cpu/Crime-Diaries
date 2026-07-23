'use strict';

const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
const config = require('./config');

const { NoSQLOperator, NoSQLUpdateOperationType } = NoSQLEnum;

// NoSQLItem.from() throws on any top-level undefined field, regardless of the
// removeUndefinedValues option (that option only covers values nested inside
// a map/array/set, per zcatalyst-sdk-node's marshall.js). Strip them ourselves.
function withoutUndefined(obj) {
	return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

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
		item: NoSQLItem.from(
			withoutUndefined({
				catalyst_user_id: catalystUser.user_id,
				email: catalystUser.email_id,
				first_name: catalystUser.first_name,
				last_name: catalystUser.last_name,
				created_time: now,
				last_active_time: now
			})
		)
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
		item: NoSQLItem.from(
			withoutUndefined({
				catalyst_user_id: catalystUserId,
				// updated_at is a String column in the console (not Number) —
				// ISO-8601 also happens to sort correctly as a plain string.
				updated_at: new Date(createdAt).toISOString(),
				session_id: sessionId,
				role,
				content,
				source
			})
		)
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
			last_message: '',
			name: '' // will be set from system message if present
		};
		// If this is a system message that stores chat name, capture it
		if (msg.role === 'system') {
			// Assume system message content is the chat name
			existing.name = msg.content;
		} else {
			existing.message_count += 1;
			const createdTime = new Date(msg.updated_at).getTime();
			if (createdTime >= existing.last_message_time) {
				existing.last_message_time = createdTime;
				existing.last_message = msg.content;
			}
		}
		sessions.set(sessionId, existing);
	}

	// Convert to array, prioritize name, fallback to last_message, then 'New Chat'
	const sessionsArray = Array.from(sessions.values()).map(sess => ({
		...sess,
		displayName: sess.name || sess.last_message || 'New Chat'
	}));
	return sessionsArray.sort((a, b) => b.last_message_time - a.last_message_time);
}

/**
 * Renames a chat session by inserting a system message with the new name.
 * The most recent system message (by timestamp) is used as the display name.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} sessionId
 * @param {string} newName
 */
async function renameSession(catalystApp, catalystUserId, sessionId, newName) {
	const table = await catalystApp.nosql().table(config.tables.conversation.name);
	const now = Date.now();
	const item = {
		catalyst_user_id: catalystUserId,
		updated_at: new Date(now).toISOString(),
		session_id: sessionId,
		role: 'system',
		content: newName
	};
	await table.insertItems({
		item: NoSQLItem.from(withoutUndefined(item))
	});
}

/**
 * Deletes all messages belonging to a given session for a user.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} sessionId
 */
async function deleteSession(catalystApp, catalystUserId, sessionId) {
	const table = await catalystApp.nosql().table(config.tables.conversation.name);
	const messages = await getHistoryForUser(catalystApp, catalystUserId, { sessionId, limit: 1000 });
	const deletePromises = messages.map(msg => {
		const key = {
			[config.tables.conversation.partitionKey]: catalystUserId,
			updated_at: msg.updated_at
		};
		return table.deleteItem({ key });
	});
	await Promise.all(deletePromises);
}

module.exports = {
	ensureUserRecord,
	saveMessage,
	getHistoryForUser,
	listSessions,
	renameSession,
	deleteSession
};
