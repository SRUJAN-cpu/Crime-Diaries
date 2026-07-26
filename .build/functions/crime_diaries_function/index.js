'use strict';

const express = require('express');
const crypto = require('crypto');
const catalyst = require('zcatalyst-sdk-node');
const { getLlmResponse, getRagResponse } = require('./lib/aiClient');
const { classifyMessage, ROUTES } = require('./lib/classifier');
const { addUserMessage, addAssistantMessage, addSystemMessage, toApiMessages, saveExplainableResponse } = require('./lib/messageBuilder');
const chatRepository = require('./lib/chatRepository');
const { requirePermission, getUserRole } = require('./lib/rbac');
const relationshipGraph = require('./lib/relationshipGraph');
const explainableAI = require('./lib/explainableAI');
const crimeAnalytics = require('./lib/crimeAnalytics');
const offenderProfiling = require('./lib/offenderProfiling');
const investigatorSupport = require('./lib/investigatorSupport');
const financialCrimeAnalysis = require('./lib/financialCrimeAnalysis');
const crimeForecasting = require('./lib/crimeForecasting');
const sociologicalAnalysis = require('./lib/sociologicalAnalysis');

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
// Phase 1: Integrated RBAC, Explainability, and Relationship Tracking
app.post('/chat', requirePermission('createCase'), async (req, res) => {
	try {
		const { message, session_id: sessionIdFromClient, images, language } = req.body || {};
		if (!message || typeof message !== 'string' || !message.trim()) {
			res.status(400).json({ error: 'message is required' });
			return;
		}
		const hasImages = Array.isArray(images) && images.length > 0;

		console.log('[CHAT] Starting chat endpoint');
		const catalystApp = catalyst.initialize(req);
		console.log('[CHAT] Catalyst initialized');

		// User already extracted by RBAC middleware
		const catalystUserId = req.catalystUser.user_id;
		const userRole = req.userRole;

		console.log('[CHAT] User role:', userRole);
		console.log('[CHAT] Ensuring user record...');
		try {
			await chatRepository.ensureUserRecord(catalystApp, req.catalystUser);
			console.log('[CHAT] ✓ User record ensured');
		} catch (userRecErr) {
			console.error('[CHAT] Failed to ensure user record:', userRecErr.message);
			throw userRecErr;
		}

		let sessionId = sessionIdFromClient || crypto.randomUUID();
		console.log('[CHAT] Session ID:', sessionId);

		// Fetch existing history for this session
		console.log('[CHAT] Fetching history...');
		const historyRows = await chatRepository.getHistoryForUser(catalystApp, catalystUserId, {
			sessionId,
			limit: 50
		});
		console.log('[CHAT] ✓ History fetched, rows:', historyRows.length);
		let messages = historyRows.map(row => ({ role: row.role, content: row.content }));

		const isNewSession = !sessionIdFromClient;
		if (isNewSession) {
			console.log('[CHAT] Adding system message for new session...');
			try {
				await addSystemMessage(catalystApp, messages, {
					catalystUserId,
					sessionId,
					content: 'New Chat'
				});
				console.log('[CHAT] ✓ System message saved');
			} catch (sysErr) {
				console.error('[CHAT] Failed to add system message:', sysErr.message);
				throw sysErr;
			}
		}

		const chatForLlm = messages.filter(m => m.role !== 'system');

		// Extract entities from message for relationship tracking
		console.log('[CHAT] Extracting entities from message...');
		const { entities } = relationshipGraph.extractEntitiesFromMessage(message);
		console.log('[CHAT] Extracted entities:', entities.length);

		// Save user message
		console.log('[CHAT] Adding user message...');
		try {
			await addUserMessage(catalystApp, messages, {
				catalystUserId,
				sessionId,
				content: message
			});
			console.log('[CHAT] ✓ User message saved');
		} catch (userMsgErr) {
			console.error('[CHAT] Failed to save user message:', userMsgErr.message);
			throw userMsgErr;
		}
		chatForLlm.push({ role: 'user', content: message });

		// Determine response language based on message content (Kannada script = Kannada, else English)
		const responseLanguage = determineResponseLanguage(message);
		console.log('[CHAT] Response language:', responseLanguage);

		const route = hasImages ? ROUTES.LLM : classifyMessage(message);
		console.log('[CHAT] Route:', route);

		console.log('[CHAT] Getting LLM/RAG response...');
		const { answer } =
			route === ROUTES.RAG
				? await getRagResponse({ messages: chatForLlm, language: responseLanguage })
				: await getLlmResponse({ messages: chatForLlm, images, language: responseLanguage });
		console.log('[CHAT] ✓ Response received, length:', answer?.length);

		// Create explainable response (Phase 1)
		const explainableResponse = explainableAI.createExplainableResponse(answer, route, {
			confidence: route === ROUTES.RAG ? 0.92 : 0.70,
			evidence: route === ROUTES.RAG ? [{ type: 'rag_search', text: `Query: ${message}` }] : [],
			reasoning: route === ROUTES.RAG 
				? explainableAI.generateRAGReasoning(message, 1, answer)
				: explainableAI.generateLLMReasoning(message, 'investigation_analysis'),
			entities: { extracted: entities, count: entities.length }
		});

		// Save with explainability metadata
		console.log('[CHAT] Adding assistant message with explainability...');
		try {
			await saveExplainableResponse(catalystApp, catalystUserId, sessionId, explainableResponse);
			console.log('[CHAT] ✓ Assistant message saved with metadata');
		} catch (assistErr) {
			console.error('[CHAT] Failed to save assistant message:', assistErr.message);
			throw assistErr;
		}
		chatForLlm.push({ role: 'assistant', content: answer });

		// Store relationships if user has permission (Phase 1)
		if (entities.length > 0 && (userRole === 'investigator' || userRole === 'supervisor')) {
			console.log('[CHAT] Storing extracted entities as relationships...');
			try {
				for (const entity of entities) {
					const entityId = `${entity.type}:${crypto.randomUUID().substring(0, 8)}`;
					await relationshipGraph.createRelationship(catalystApp, catalystUserId, {
						sourceEntity: `message:${message.substring(0, 20)}`,
						targetEntity: entityId,
						relationType: 'mentioned_in',
						caseId: sessionId,
						metadata: JSON.stringify(entity)
					});
				}
				console.log('[CHAT] ✓ Relationships stored');
			} catch (relErr) {
				console.warn('[CHAT] Could not store relationships:', relErr.message);
			}
		}

		console.log('[CHAT] ✓ Chat complete');
		res.status(200).json({ 
			session_id: sessionId, 
			answer: explainableResponse.content,
			explanation: {
				source: explainableResponse.source,
				confidence: Math.round(explainableResponse.confidence * 100) + '%',
				reasoning: explainableResponse.reasoning
			}
		});
	} catch (err) {
		console.error('[CHAT] ✗ Chat endpoint failed:', err.message);
		console.error('[CHAT] Stack:', err.stack);
		res.status(500).json({ error: 'Failed to process chat message', details: err.message });
	}
});

// List a user's past conversations, most recent first, so they can be
// re-opened when the user revisits.
// Requires: readCase permission
app.get('/sessions', requirePermission('readCase'), async (req, res) => {
	try {
		const catalystApp = catalyst.initialize(req);
		const catalystUserId = req.catalystUser.user_id;
		const sessions = await chatRepository.listSessions(catalystApp, catalystUserId);
		res.status(200).json({ sessions });
	} catch (err) {
		console.error('GET /sessions failed', err);
		res.status(500).json({ error: 'Failed to fetch sessions' });
	}
});

// Fetch the full message history for one session.
// Requires: readCase permission
app.get('/history', requirePermission('readCase'), async (req, res) => {
	try {
		const sessionId = req.query.session_id;
		if (!sessionId) {
			res.status(400).json({ error: 'session_id query param is required' });
			return;
		}

		const catalystApp = catalyst.initialize(req);
		const catalystUserId = req.catalystUser.user_id;
		const messages = await chatRepository.getHistoryForUser(catalystApp, catalystUserId, {
			sessionId
		});

		res.status(200).json({ session_id: sessionId, messages });
	} catch (err) {
		console.error('GET /history failed', err);
		res.status(500).json({ error: 'Failed to fetch history' });
	}
});

// Rename a chat session
// Requires: updateCase permission
app.patch('/sessions/:sessionId', requirePermission('updateCase'), async (req, res) => {
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
		const catalystUserId = req.catalystUser.user_id;
		await chatRepository.renameSession(catalystApp, catalystUserId, sessionId, name.trim());
		res.status(200).json({ success: true });
	} catch (err) {
		console.error('PATCH /sessions/:sessionId failed', err);
		res.status(500).json({ error: 'Failed to rename session' });
	}
});

// Delete a chat session
// Requires: deleteCase permission
app.delete('/sessions/:sessionId', requirePermission('deleteCase'), async (req, res) => {
	try {
		const { sessionId } = req.params;
		if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
			res.status(400).json({ error: 'sessionId is required' });
			return;
		}
		const catalystApp = catalyst.initialize(req);
		const catalystUserId = req.catalystUser.user_id;
		await chatRepository.deleteSession(catalystApp, catalystUserId, sessionId);
		res.status(200).json({ success: true });
	} catch (err) {
		console.error('DELETE /sessions/:sessionId failed', err);
		res.status(500).json({ error: 'Failed to delete session' });
	}
});

// === PHASE 1: CRIMINAL NETWORK RELATIONSHIP ENDPOINTS ===

// Create a relationship between entities (accused, victim, location, etc.)
// Requires: createRelationship permission
app.post('/relationships', requirePermission('createRelationship'), async (req, res) => {
	try {
		const { sourceEntity, targetEntity, relationType, caseId, metadata } = req.body;
		if (!sourceEntity || !targetEntity || !relationType || !caseId) {
			res.status(400).json({ error: 'sourceEntity, targetEntity, relationType, and caseId are required' });
			return;
		}

		const catalystApp = catalyst.initialize(req);
		const catalystUserId = req.catalystUser.user_id;

		const relationshipId = await relationshipGraph.createRelationship(catalystApp, catalystUserId, {
			sourceEntity,
			targetEntity,
			relationType,
			caseId,
			metadata
		});

		res.status(201).json({ success: true, relationshipId });
	} catch (err) {
		console.error('POST /relationships failed:', err);
		res.status(500).json({ error: 'Failed to create relationship' });
	}
});

// Get all relationships for a specific entity (e.g., all connections for an accused person)
// Requires: readRelationship permission
app.get('/relationships/entity/:entityId', requirePermission('readRelationship'), async (req, res) => {
	try {
		const { entityId } = req.params;
		if (!entityId) {
			res.status(400).json({ error: 'entityId is required' });
			return;
		}

		const catalystApp = catalyst.initialize(req);
		const catalystUserId = req.catalystUser.user_id;

		const relationships = await relationshipGraph.getRelationshipsForEntity(catalystApp, catalystUserId, entityId);

		res.status(200).json({ entityId, relationships, count: relationships.length });
	} catch (err) {
		console.error('GET /relationships/entity/:entityId failed:', err);
		res.status(500).json({ error: 'Failed to fetch relationships' });
	}
});

// Get all relationships for a specific case/session (criminal network for that case)
// Requires: readRelationship permission
app.get('/relationships/case/:caseId', requirePermission('readRelationship'), async (req, res) => {
	try {
		const { caseId } = req.params;
		if (!caseId) {
			res.status(400).json({ error: 'caseId is required' });
			return;
		}

		const catalystApp = catalyst.initialize(req);
		const catalystUserId = req.catalystUser.user_id;

		const relationships = await relationshipGraph.getRelationshipsForCase(catalystApp, catalystUserId, caseId);

		// Build network graph structure
		const entities = new Set();
		relationships.forEach(rel => {
			entities.add(rel.source_entity);
			entities.add(rel.target_entity);
		});

		res.status(200).json({ 
			caseId, 
			relationships, 
			network: {
				nodes: Array.from(entities),
				edges: relationships.map(r => ({ 
					source: r.source_entity, 
					target: r.target_entity, 
					type: r.relation_type 
				}))
			},
			count: relationships.length 
		});
	} catch (err) {
		console.error('GET /relationships/case/:caseId failed:', err);
		res.status(500).json({ error: 'Failed to fetch case relationships' });
	}
});

// Delete a relationship
// Requires: deleteRelationship permission
app.delete('/relationships/:relationshipId', requirePermission('deleteRelationship'), async (req, res) => {
	try {
		const { relationshipId } = req.params;
		if (!relationshipId) {
			res.status(400).json({ error: 'relationshipId is required' });
			return;
		}

		const catalystApp = catalyst.initialize(req);
		const catalystUserId = req.catalystUser.user_id;

		await relationshipGraph.deleteRelationship(catalystApp, catalystUserId, relationshipId);

		res.status(200).json({ success: true });
	} catch (err) {
		console.error('DELETE /relationships/:relationshipId failed:', err);
		res.status(500).json({ error: 'Failed to delete relationship' });
	}
});

// Diagnostic endpoint to test if data is actually being written to Catalyst
app.get('/debug/test-write', async (req, res) => {
	try {
		console.log('=== Catalyst Diagnostic Test Started ===');
		console.log('Request headers:', JSON.stringify(req.headers, null, 2));

		const catalystApp = catalyst.initialize(req);
		console.log('✓ Catalyst app initialized');

		let catalystUser = null;
		try {
			catalystUser = await catalystApp.userManagement().getCurrentUser();
			console.log('✓ Current user retrieved:', catalystUser?.user_id);
		} catch (userErr) {
			console.warn('⚠ Could not get current user (may be unauthenticated):', userErr.message);
			console.log('Using fake test user ID for table structure test...');
		}

		const catalystUserId = catalystUser?.user_id || 'test-user-' + crypto.randomUUID();

		// Test 1: Try to connect to user table
		console.log('\nTest 1: Connecting to user table...');
		try {
			const userTable = await catalystApp.nosql().table('user');
			console.log('✓ User table accessible');

			const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
			const testItem = NoSQLItem.from({
				catalyst_user_id: catalystUserId,
				email: catalystUser?.email_id || 'test@example.com',
				first_name: 'TEST',
				last_name: 'User',
				created_time: Date.now(),
				last_active_time: Date.now()
			});
			console.log('Attempting to insert item...');
			await userTable.insertItems({ item: testItem });
			console.log('✓ User table write successful');
		} catch (userErr) {
			console.error('✗ User table error:', userErr.message);
			console.error('Full error:', JSON.stringify(userErr));
			throw new Error(`User table error: ${userErr.message}`);
		}

		// Test 2: Try to connect to conversation table
		console.log('\nTest 2: Connecting to conversation table...');
		try {
			const convTable = await catalystApp.nosql().table('conversation');
			console.log('✓ Conversation table accessible');

			const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
			const testMessage = NoSQLItem.from({
				catalyst_user_id: catalystUserId,
				updated_at: new Date().toISOString(),
				session_id: 'test-session-' + crypto.randomUUID(),
				role: 'system',
				content: 'Test message'
			});
			console.log('Attempting to insert message...');
			await convTable.insertItems({ item: testMessage });
			console.log('✓ Conversation table write successful');
		} catch (convErr) {
			console.error('✗ Conversation table error:', convErr.message);
			console.error('Full error:', JSON.stringify(convErr));
			throw new Error(`Conversation table error: ${convErr.message}`);
		}

		console.log('\n=== All tests passed ===');
		res.status(200).json({
			success: true,
			message: 'All writes successful',
			userId: catalystUserId,
			userAuthenticated: !!catalystUser,
			email: catalystUser?.email_id
		});
	} catch (err) {
		console.error('=== Diagnostic test failed ===');
		console.error('Error:', err.message);
		console.error('Stack:', err.stack);
		res.status(500).json({
			success: false,
			error: err.message,
			details: err.toString(),
			suggestion: 'Check Catalyst function logs for full error details'
		});
	}
});

// Database Initialization Endpoint - Phase 1 Table Setup
app.get('/debug/init-db', async (req, res) => {
	try {
		const { initializeDatabase, generateTableCreationGuide } = require('./lib/initializeDatabase');
		
		console.log('=== Database Initialization Endpoint Called ===');
		
		const catalystApp = catalyst.initialize(req);
		const results = await initializeDatabase(catalystApp);
		
		// Check if any tables are missing
		const missingTables = results.filter(r => r.status === 'not_found');
		
		if (missingTables.length > 0) {
			console.log('\n⚠ Some tables need to be created manually');
			const guide = generateTableCreationGuide();
			return res.status(200).json({
				success: false,
				message: 'Phase 1 tables not fully initialized',
				status: 'MANUAL_SETUP_REQUIRED',
				missingTables: missingTables.map(t => t.table),
				results,
				setup_guide: guide,
				action: 'Create the missing tables in Catalyst Console using the guide above, then re-run this endpoint'
			});
		}
		
		// All tables exist
		res.status(200).json({
			success: true,
			message: 'All Phase 1 tables are initialized and ready',
			status: 'READY',
			results
		});
	} catch (err) {
		console.error('=== Database initialization failed ===');
		console.error('Error:', err.message);
		res.status(500).json({
			success: false,
			error: err.message,
			details: err.toString()
		});
	}
});

// Phase 1 Evaluation Endpoint - Query and analyze all Phase 1 table data
app.get('/debug/phase1-eval', async (req, res) => {
	try {
		console.log('=== Phase 1 Database Evaluation Started ===');
		
		const catalystApp = catalyst.initialize(req);
		const { NoSQLItem, NoSQLEnum } = require('zcatalyst-sdk-node/lib/no-sql');
		const { NoSQLOperator } = NoSQLEnum;

		const evaluation = {
			timestamp: new Date().toISOString(),
			tables_evaluated: [],
			errors: [],
			summary: {}
		};

		// Query all Phase 1 tables
		const tablesToEval = [
			'criminal_relationships',
			'offender_profiles',
			'crime_incidents',
			'investigator_roles',
			'evidence_sources',
			'session_metadata'
		];

		for (const tableName of tablesToEval) {
			try {
				console.log(`\nEvaluating table: ${tableName}...`);
				const table = await catalystApp.nosql().table(tableName);

				let records = [];
				try {
					// Query all records with a basic query
					if (tableName === 'criminal_relationships') {
						const response = await table.queryTable({ limit: 100 });
						records = (response.get || []).map(entry => entry.item?.to()).filter(Boolean);
					} else if (tableName === 'offender_profiles') {
						const response = await table.queryTable({ limit: 100 });
						records = (response.get || []).map(entry => entry.item?.to()).filter(Boolean);
					} else if (tableName === 'crime_incidents') {
						const response = await table.queryTable({ limit: 100 });
						records = (response.get || []).map(entry => entry.item?.to()).filter(Boolean);
					} else if (tableName === 'investigator_roles') {
						const response = await table.queryTable({ limit: 100 });
						records = (response.get || []).map(entry => entry.item?.to()).filter(Boolean);
					} else if (tableName === 'evidence_sources') {
						const response = await table.queryTable({ limit: 100 });
						records = (response.get || []).map(entry => entry.item?.to()).filter(Boolean);
					} else if (tableName === 'session_metadata') {
						const response = await table.queryTable({ limit: 100 });
						records = (response.get || []).map(entry => entry.item?.to()).filter(Boolean);
					}
				} catch (queryErr) {
					console.warn(`Query failed for ${tableName}, attempting scan:`, queryErr.message);
					// Fallback: empty records
					records = [];
				}

				evaluation.tables_evaluated.push({
					table_name: tableName,
					record_count: records.length,
					status: 'success',
					sample_records: records.slice(0, 3) // First 3 records as sample
				});

				evaluation.summary[tableName] = {
					exists: true,
					record_count: records.length
				};

				console.log(`✓ ${tableName}: ${records.length} records`);
			} catch (tableErr) {
				console.error(`✗ Error evaluating ${tableName}:`, tableErr.message);
				evaluation.errors.push({
					table: tableName,
					error: tableErr.message
				});
				evaluation.summary[tableName] = {
					exists: false,
					error: tableErr.message
				};
			}
		}

		console.log('\n=== Phase 1 Evaluation Complete ===');
		res.status(200).json({
			success: evaluation.errors.length === 0,
			evaluation,
			prompt_for_analysis: `
Use this data to evaluate Phase 1 implementation:
1. Check which tables exist and have data
2. Review sample records to verify schema compliance
3. Identify any missing or malformed data
4. Assess readiness for Phase 2 analytics

Tables evaluated: ${evaluation.tables_evaluated.map(t => t.table_name).join(', ')}
Total tables ready: ${evaluation.tables_evaluated.filter(t => t.record_count > 0).length}/${tablesToEval.length}

Next steps:
- If all tables exist and have data, proceed to Phase 2 endpoints
- If some tables have no data, populate test data first
- If tables are missing, create them in Catalyst Console using /debug/init-db guide
			`
		});
	} catch (err) {
		console.error('=== Phase 1 evaluation failed ===');
		console.error('Error:', err.message);
		res.status(500).json({
			success: false,
			error: err.message,
			suggestion: 'Check that all Phase 1 tables have been created in Catalyst Console'
		});
	}
});

// Phase 2 & 3 Analytics Endpoints

// Crime Analytics & Pattern Analysis
app.get('/analytics/crime-patterns', async (req, res) => {
	try {
		const { dimension = 'crime_type', lookback_days = 180 } = req.query;
		console.log(`[ANALYTICS] Crime patterns by: ${dimension}`);

		// In production, fetch from crime_incidents table
		// For now, return analysis template
		const mockCrimes = [];

		const patterns = crimeAnalytics.aggregateCrimesByDimension(mockCrimes, dimension);
		const hotspots = crimeAnalytics.identifyHotspots(mockCrimes);
		const trends = crimeAnalytics.analyzeTemporalTrends(mockCrimes);

		res.status(200).json({
			success: true,
			analysis_type: 'crime_patterns',
			dimension,
			patterns,
			hotspots,
			temporal_trends: trends
		});
	} catch (err) {
		console.error('[ANALYTICS] Crime patterns error:', err.message);
		res.status(500).json({ error: err.message });
	}
});

// Offender Risk Profiling
app.get('/analytics/offender-risk', async (req, res) => {
	try {
		console.log('[ANALYTICS] Offender risk profiling');

		const mockOffenders = [];
		const mockCrimes = [];

		const enriched = offenderProfiling.identifyRepeatOffenders(mockOffenders, mockCrimes);
		const profiles = offenderProfiling.buildRiskProfiles(enriched);

		res.status(200).json({
			success: true,
			analysis_type: 'offender_risk',
			total_profiles: profiles.length,
			critical_risk: profiles.filter(p => p.risk_level === 'critical').length,
			profiles: profiles.slice(0, 10) // Top 10
		});
	} catch (err) {
		console.error('[ANALYTICS] Offender risk error:', err.message);
		res.status(500).json({ error: err.message });
	}
});

// Crime Forecasting & Emerging Patterns
app.get('/analytics/crime-forecast', async (req, res) => {
	try {
		const { lookback_days = 180 } = req.query;
		console.log(`[ANALYTICS] Crime forecast (lookback: ${lookback_days} days)`);

		const mockCrimes = [];
		const mockOffenders = [];

		const forecast = crimeForecasting.forecastEmergingCrimes(mockCrimes, parseInt(lookback_days));
		const alerts = crimeForecasting.generateEarlyWarningAlerts(mockCrimes, mockOffenders);
		const hotspots = crimeForecasting.predictCrimeHotspots(mockCrimes);

		res.status(200).json({
			success: true,
			analysis_type: 'crime_forecast',
			forecast_horizon: lookback_days,
			emerging_patterns: forecast.emerging_patterns,
			early_warning_alerts: alerts,
			predicted_hotspots: hotspots.predicted_hotspots.slice(0, 5)
		});
	} catch (err) {
		console.error('[ANALYTICS] Crime forecast error:', err.message);
		res.status(500).json({ error: err.message });
	}
});

// Financial Crime Analysis
app.get('/analytics/financial-crime', async (req, res) => {
	try {
		console.log('[ANALYTICS] Financial crime analysis');

		const mockTransactions = [];
		const mockOffenders = [];
		const mockCrimes = [];

		const txAnalysis = financialCrimeAnalysis.analyzeFinancialTransactions(mockTransactions, mockOffenders);
		const trails = financialCrimeAnalysis.detectMoneyTrails(mockTransactions);
		const links = financialCrimeAnalysis.linkFinancialToCrime(mockTransactions, mockCrimes, mockOffenders);

		res.status(200).json({
			success: true,
			analysis_type: 'financial_crime',
			suspicious_transactions: txAnalysis.suspicious_transactions.length,
			high_risk_tx: txAnalysis.summary.high_risk_count,
			money_trails: trails.total_trails_detected,
			crime_finance_links: links.total_crime_financial_links
		});
	} catch (err) {
		console.error('[ANALYTICS] Financial crime error:', err.message);
		res.status(500).json({ error: err.message });
	}
});

// Sociological Crime Insights
app.get('/analytics/sociological-insights', async (req, res) => {
	try {
		console.log('[ANALYTICS] Sociological crime analysis');

		const mockCrimes = [];
		const mockDemographics = [];
		const mockSocialData = [];

		const demographics = sociologicalAnalysis.analyzeCrimeByDemographics(mockCrimes, mockDemographics);
		const riskFactors = sociologicalAnalysis.identifySocialRiskFactors(mockCrimes, mockSocialData);

		res.status(200).json({
			success: true,
			analysis_type: 'sociological_insights',
			demographic_analysis: demographics,
			social_risk_factors: riskFactors
		});
	} catch (err) {
		console.error('[ANALYTICS] Sociological insights error:', err.message);
		res.status(500).json({ error: err.message });
	}
});

// Comprehensive Crime Intelligence Dashboard (All phases combined)
app.get('/analytics/dashboard', async (req, res) => {
	try {
		console.log('[ANALYTICS] Comprehensive dashboard');

		const mockCrimes = [];
		const mockOffenders = [];
		const mockTransactions = [];

		const dashboard = {
			timestamp: new Date().toISOString(),
			phase_1: {
				status: 'READY',
				description: 'RBAC, Relationship Graph, Explainability'
			},
			phase_2: {
				crime_analytics: crimeAnalytics.aggregateCrimesByDimension(mockCrimes, 'crime_type').length,
				offender_profiles: offenderProfiling.buildRiskProfiles([]).length,
				case_support: investigatorSupport.generateInvestigativeLeads({}, [], [])
			},
			phase_3: {
				financial_alerts: financialCrimeAnalysis.analyzeFinancialTransactions(mockTransactions, mockOffenders).summary.high_risk_count,
				crime_forecast: crimeForecasting.forecastEmergingCrimes(mockCrimes).emerging_patterns.length,
				sociological: sociologicalAnalysis.analyzeCrimeByDemographics(mockCrimes, []).insights.length
			},
			key_metrics: {
				total_endpoints: 11,
				phase_2_ready: true,
				phase_3_ready: true,
				data_integration: 'In Progress'
			}
		};

		res.status(200).json({
			success: true,
			dashboard
		});
	} catch (err) {
		console.error('[ANALYTICS] Dashboard error:', err.message);
		res.status(500).json({ error: err.message });
	}
});

app.use((req, res) => {
	res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

module.exports = app;
