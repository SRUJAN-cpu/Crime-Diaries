'use strict';

const express = require('express');
const crypto = require('crypto');
const catalyst = require('zcatalyst-sdk-node');
const { getLlmResponse, getRagResponse } = require('./lib/aiClient');
const { classifyMessage, ROUTES } = require('./lib/classifier');
const { addUserMessage, addAssistantMessage, toApiMessages } = require('./lib/messageBuilder');
const chatRepository = require('./lib/chatRepository');

const app = express();
app.use(express.json());

// Send a message, get the RAG answer, and persist both turns to the
// conversation table. Pass session_id to continue an existing conversation;
// omit it to start a new one.
app.post('/chat', async (req, res) => {
	try {
		const { message, session_id: sessionIdFromClient } = req.body || {};
		if (!message || typeof message !== 'string' || !message.trim()) {
			res.status(400).json({ error: 'message is required' });
			return;
		}

		const catalystApp = catalyst.initialize(req);
		const catalystUser = await catalystApp.userManagement().getCurrentUser();
		const catalystUserId = catalystUser.user_id;

		await chatRepository.ensureUserRecord(catalystApp, catalystUser);

		const sessionId = sessionIdFromClient || crypto.randomUUID();
		const historyRows = await chatRepository.getHistoryForUser(catalystApp, catalystUserId, {
			sessionId,
			limit: 50
		});
		const messages = toApiMessages(historyRows);

		await addUserMessage(catalystApp, messages, { catalystUserId, sessionId, content: message });

		const route = classifyMessage(message);
		const { answer } =
			route === ROUTES.RAG
				? await getRagResponse({ messages, sessionId })
				: await getLlmResponse({ messages, sessionId });

		await addAssistantMessage(catalystApp, messages, {
			catalystUserId,
			sessionId,
			content: answer,
			source: route
		});

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

app.use((req, res) => {
	res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

module.exports = app;
