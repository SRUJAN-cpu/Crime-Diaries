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

	if (sessionId) {
		query.other_condition = {
			attribute: 'session_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(sessionId)
		};
	}

	// If limit is specified and positive, we use it and do a single query.
	// Otherwise, we paginate to get all results.
	if (typeof limit === 'number' && limit > 0) {
		query.limit = limit;
		const response = await table.queryTable(query);
		return (response.get || [])
			.map((entry) => entry.item && entry.item.to())
			.filter(Boolean);
	}

	// No limit or limit <= 0: get all pages
	let allItems = [];
	let exclusiveStartKey = null;

	do {
		if (exclusiveStartKey) {
			query.exclusive_start_key = exclusiveStartKey;
		}
		const response = await table.queryTable(query);
		const items = (response.get || [])
			.map((entry) => entry.item && entry.item.to())
			.filter(Boolean);
		allItems.push(...items);
		exclusiveStartKey = response.last_evaluated_key;
	} while (exclusiveStartKey);

	return allItems;
}

/**
 * Groups a user's message history into a list of past sessions, most recent first.
 * Note: This function retrieves the most recent 500 messages (across all sessions) to
 * build the session list. For sessions with more than 500 messages, the message count
 * will be an approximation. Prioritizes chat_name from session_metadata as displayName.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 */
async function listSessions(catalystApp, catalystUserId) {
	// Get the most recent 500 messages (descending order by updated_at)
	const messages = await getHistoryForUser(catalystApp, catalystUserId, { limit: 500, forwardScan: false });

	const sessions = new Map();
	for (const msg of messages) {
		const sessionId = msg.session_id;
		const existing = sessions.get(sessionId);
		if (!existing) {
			// First time seeing this session in the batch (most recent message)
			const createdTime = new Date(msg.updated_at).getTime();
			sessions.set(sessionId, {
				session_id: sessionId,
				message_count: 1,
				last_message_time: createdTime,
				last_message: msg.content
			});
		} else {
			// We've seen this session before in the batch (this message is older than the last one we saw)
			existing.message_count += 1;
		}
	}

	// Fetch session_metadata for each session to get chat_name
	const sessionsArray = [];
	for (const sess of sessions.values()) {
		const metadata = await getSessionMetadata(catalystApp, sess.session_id);
		sessionsArray.push({
			...sess,
			displayName: metadata?.chat_name || sess.last_message || 'New Chat'
		});
	}

	return sessionsArray.sort((a, b) => b.last_message_time - a.last_message_time);
}

/**
 * Renames a chat session by updating the session_metadata table.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} sessionId
 * @param {string} newName
 */
async function renameSession(catalystApp, catalystUserId, sessionId, newName) {
	// Update session_metadata with the new chat_name
	await updateSessionMetadata(catalystApp, sessionId, { chat_name: newName });
}

/**
 * Deletes all messages belonging to a given session for a user.
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} sessionId
 */
async function deleteSession(catalystApp, catalystUserId, sessionId) {
	const table = await catalystApp.nosql().table(config.tables.conversation.name);
	const messages = await getHistoryForUser(catalystApp, catalystUserId, { sessionId });
	// Delete in batches to reduce number of requests
	const deletePromises = [];
	const batchSize = 25; // Adjust batch size as needed

	// Filter out any messages that don't have required fields
	const validMessages = messages.filter(msg =>
		msg &&
		typeof msg === 'object' &&
		msg.hasOwnProperty('catalyst_user_id') &&
		msg.catalyst_user_id !== null &&
		msg.catalyst_user_id !== undefined &&
		msg.hasOwnProperty('updated_at') &&
		msg.updated_at !== null &&
		msg.updated_at !== undefined
	);

	if (validMessages.length === 0) {
		// No valid messages to delete, but this is not an error
		return;
	}

	for (let i = 0; i < validMessages.length; i += batchSize) {
		const batch = validMessages.slice(i, i + batchSize);
		// deleteItems(...values) is variadic — each argument is one
		// { keys: <single NoSQLItem> } delete spec, NOT one object holding an
		// array of keys. Passing an array where a single key item was
		// expected is exactly what caused "input value is not readable".
		const deleteSpecs = batch.map(msg => {
			try {
				const keyObj = {
					[config.tables.conversation.partitionKey]: catalystUserId,
					updated_at: msg.updated_at
				};
				const cleanKeyObj = Object.fromEntries(Object.entries(keyObj).filter(([, v]) => v !== undefined));
				return { keys: NoSQLItem.from(cleanKeyObj) };
			} catch (keyError) {
				// If we can't construct a key for this message, skip it rather than failing the whole operation
				console.warn(`Skipping message due to invalid key:`, keyError);
				return null;
			}
		}).filter((spec) => spec !== null);

		if (deleteSpecs.length > 0) {
			deletePromises.push(table.deleteItems(...deleteSpecs));
		}
	}

	await Promise.all(deletePromises);
}

/**
 * Creates or updates session metadata (chat name, description, etc.)
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} sessionId
 * @param {string} catalystUserId
 * @param {{ chat_name?: string, description?: string, tags?: string[], case_type?: string, priority?: string }} metadata
 */
async function saveSessionMetadata(catalystApp, sessionId, catalystUserId, metadata) {
	try {
		const table = await catalystApp.nosql().table('session_metadata');
		const now = new Date().toISOString();

		const item = NoSQLItem.from(
			withoutUndefined({
				session_id: sessionId,
				catalyst_user_id: catalystUserId,
				chat_name: metadata.chat_name,
				description: metadata.description,
				tags: metadata.tags ? JSON.stringify(metadata.tags) : undefined,
				case_type: metadata.case_type,
				priority: metadata.priority,
				is_archived: 'no',
				created_time: now,
				updated_time: now,
				last_accessed: now
			})
		);

		await table.insertItems({ item });
	} catch (err) {
		if (err.message.includes('not found') || err.message.includes('does not exist')) {
			console.debug('[DEBUG] session_metadata table does not exist. Create it in Catalyst Console using /debug/init-db guide');
		} else {
			console.warn('Error saving session metadata:', err.message);
		}
		// Don't throw - session works without metadata
	}
}

/**
 * Retrieves session metadata
 * Returns null if table doesn't exist or metadata not found
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} sessionId
 */
async function getSessionMetadata(catalystApp, sessionId) {
	try {
		const table = await catalystApp.nosql().table('session_metadata');
		const key = NoSQLItem.from({ session_id: sessionId });

		try {
			const result = await table.fetchItem({ keys: [key] });
			const item = result.get && result.get[0] && result.get[0].item;
			if (item) {
				const data = item.to();
				if (data.tags && typeof data.tags === 'string') {
					data.tags = JSON.parse(data.tags);
				}
				return data;
			}
			return null;
		} catch (err) {
			console.debug(`[DEBUG] Metadata not found for session ${sessionId}: ${err.message}`);
			return null;
		}
	} catch (tableErr) {
		// Table doesn't exist yet - this is expected if tables haven't been created
		if (tableErr.message.includes('not found') || tableErr.message.includes('does not exist')) {
			console.debug('[DEBUG] session_metadata table does not exist yet. Create it in Catalyst Console using /debug/init-db guide');
			return null;
		}
		console.warn('Error accessing session_metadata table:', tableErr.message);
		return null;
	}
}

/**
 * Updates session metadata
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} sessionId
 * @param {{ chat_name?: string, description?: string, priority?: string, is_archived?: string }} updates
 */
async function updateSessionMetadata(catalystApp, sessionId, updates) {
	try {
		const table = await catalystApp.nosql().table('session_metadata');
		const key = NoSQLItem.from({ session_id: sessionId });
		const now = new Date().toISOString();

		const updateAttrs = [];

		if (updates.chat_name !== undefined) {
			updateAttrs.push({
				operation_type: NoSQLUpdateOperationType.PUT,
				attribute_path: ['chat_name'],
				update_value: NoSQLMarshall.makeString(updates.chat_name)
			});
		}

		if (updates.description !== undefined) {
			updateAttrs.push({
				operation_type: NoSQLUpdateOperationType.PUT,
				attribute_path: ['description'],
				update_value: NoSQLMarshall.makeString(updates.description)
			});
		}

		if (updates.priority !== undefined) {
			updateAttrs.push({
				operation_type: NoSQLUpdateOperationType.PUT,
				attribute_path: ['priority'],
				update_value: NoSQLMarshall.makeString(updates.priority)
			});
		}

		if (updates.is_archived !== undefined) {
			updateAttrs.push({
				operation_type: NoSQLUpdateOperationType.PUT,
				attribute_path: ['is_archived'],
				update_value: NoSQLMarshall.makeString(updates.is_archived)
			});
		}

		updateAttrs.push({
			operation_type: NoSQLUpdateOperationType.PUT,
			attribute_path: ['updated_time'],
			update_value: NoSQLMarshall.makeString(now)
		});

		updateAttrs.push({
			operation_type: NoSQLUpdateOperationType.PUT,
			attribute_path: ['last_accessed'],
			update_value: NoSQLMarshall.makeString(now)
		});

		await table.updateItems({
			keys: key,
			update_attributes: updateAttrs
		});
	} catch (err) {
		if (err.message.includes('not found') || err.message.includes('does not exist')) {
			console.debug('[DEBUG] session_metadata table does not exist. Create it in Catalyst Console using /debug/init-db guide');
		} else {
			console.warn('Error updating session metadata:', err.message);
		}
		// Don't throw - session works without metadata
	}
}

module.exports = {
	ensureUserRecord,
	saveMessage,
	getHistoryForUser,
	listSessions,
	renameSession,
	deleteSession,
	saveSessionMetadata,
	getSessionMetadata,
	updateSessionMetadata
};
