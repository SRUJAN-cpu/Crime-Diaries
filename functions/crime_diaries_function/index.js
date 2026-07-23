'use strict';

const express = require('express');
const crypto = require('crypto');
const catalyst = require('zcatalyst-sdk-node');
const { getLlmResponse, getRagResponse } = require('./lib/aiClient');
const { classifyMessage, ROUTES } = require('./lib/classifier');
const { addUserMessage, addAssistantMessage, addSystemMessage, toApiMessages } = require('./lib/messageBuilder');
const chatRepository = require('./lib/chatRepository');

// Detect if message contains Kannada characters - UPDATED
function detectKannada(message) {
	const kannadaRegex = /[ಀ-೿]/; // Unicode range for Kannada script
	return kannadaRegex.test(message);
}

// Determine response language based on message content
function determineResponseLanguage(message) {
	return detectKannada(message) ? 'kn' : 'en';
}

const app = express();
app.use(express.json());

// Send a message, get the RAG answer, and persist both turns to the
// conversation table. Pass session_id to continue an existing conversation;
// omit it to start a new one.
app.post('/chat', async (req, res) => {
	try {
		const { message, session_id: sessionIdFromClient, images, language } = req.body || {};
		if (!message || typeof message !== 'string' || !message.trim()) {
			res.status(400).json({ error: 'message is required' });
			return;
		}
		const hasImages = Array.isArray(images) && images.length > 0;

		const catalystApp = catalyst.initialize(req);
		const catalystUser = await catalystApp.userManagement().getCurrentUser();
		const catalystUserId = catalystUser.user_id;

		await chatRepository.ensureUserRecord(catalystApp, catalystUser);

		let sessionId = sessionIdFromClient || crypto.randomUUID();

		// Fetch existing history for this session (may be empty for new session)
		const historyRows = await chatRepository.getHistoryForUser(catalystApp, catalystUserId, {
			sessionId,
			limit: 50
		});
		let messages = historyRows.map(row => ({ role: row.role, content: row.content }));

		// If this is a brand‑new session, add a system message that holds the chat name.
		const isNewSession = !sessionIdFromClient;
		if (isNewSession) {
			await addSystemMessage(catalystApp, messages, {
				catalystUserId,
				sessionId,
				content: 'New Chat'   // default name; user can rename later
			});
		}

		// Build the array that will be sent to the LLM (exclude system messages)
		const chatForLlm = messages.filter(m => m.role !== 'system');

		// Append the user's message to both stores
		await addUserMessage(catalystApp, messages, {
			catalystUserId,
			sessionId,
			content: message
		});
		chatForLlm.push({ role: 'user', content: message });

		// Determine response language based on message content (Kannada script = Kannada, else English)
		const responseLanguage = determineResponseLanguage(message);

		// Determine route: image -> VLM, else keyword classifier
		const route = hasImages ? ROUTES.LLM : classifyMessage(message);
		const { answer } =
			route === ROUTES.RAG
				? await getRagResponse({ messages: chatForLlm, language: responseLanguage })
				: await getLlmResponse({ messages: chatForLlm, images, language: responseLanguage });

		// Save the assistant's reply
		await addAssistantMessage(catalystApp, messages, {
			catalystUserId,
			sessionId,
			content: answer,
			source: route
		});
		chatForLlm.push({ role: 'assistant', content: answer });

		res.status(200).json({ session_id: sessionId, answer });
	} catch (err) {
		console.error('POST /chat failed', err);
		res.status(500).json({ error: 'Failed to process chat message' });
	}
});

// List a user's past conversations, most recent first, so they can be
// re-opened when the user revisits.
app.get('/sessions', async (req, res) => {
	try {
		const catalystApp = catalyst.initialize(req);
		const catalystUser = await catalystApp.userManagement().getCurrentUser();
		const sessions = await chatRepository.listSessions(catalystApp, catalystUser.user_id);
		res.status(200).json({ sessions });
	} catch (err) {
		console.error('GET /sessions failed', err);
		res.status(500).json({ error: 'Failed to fetch sessions' });
	}
});

// Fetch the full message history for one session.
app.get('/history', async (req, res) => {
	try {
		const sessionId = req.query.session_id;
		if (!sessionId) {
			res.status(400).json({ error: 'session_id query param is required' });
			return;
		}

		const catalystApp = catalyst.initialize(req);
		const catalystUser = await catalystApp.userManagement().getCurrentUser();
		const messages = await chatRepository.getHistoryForUser(catalystApp, catalystUser.user_id, {
			sessionId
		});

		res.status(200).json({ session_id: sessionId, messages });
	} catch (err) {
		console.error('GET /history failed', err);
		res.status(500).json({ error: 'Failed to fetch history' });
	}
});

// Rename a chat session
app.patch('/sessions/:sessionId', async (req, res) => {
	try {
		const { sessionId } = req.params;
		const { name } = req.body;
		if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
			res.status(400).json({ error: 'sessionId is required' });
			return;
		}
		if (!name || typeof name !== 'string' || !name.trim()) {
			res.status(400).json({ error: 'name is required' });
			return;
		}
		const catalystApp = catalyst.initialize(req);
		const catalystUser = await catalystApp.userManagement().getCurrentUser();
		const catalystUserId = catalystUser.user_id;
		await chatRepository.renameSession(catalystApp, catalystUserId, sessionId, name.trim());
		res.status(200).json({ success: true });
	} catch (err) {
		console.error('PATCH /sessions/:sessionId failed', err);
		res.status(500).json({ error: 'Failed to rename session' });
	}
});

// Delete a chat session
app.delete('/sessions/:sessionId', async (req, res) => {
	try {
		const { sessionId } = req.params;
		if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
			res.status(400).json({ error: 'sessionId is required' });
			return;
		}
		const catalystApp = catalyst.initialize(req);
		const catalystUser = await catalystApp.userManagement().getCurrentUser();
		const catalystUserId = catalystUser.user_id;
		await chatRepository.deleteSession(catalystApp, catalystUserId, sessionId);
		res.status(200).json({ success: true });
	} catch (err) {
		console.error('DELETE /sessions/:sessionId failed', err);
		res.status(500).json({ error: 'Failed to delete session' });
	}
});

app.use((req, res) => {
	res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

module.exports = app;
