'use strict';

// Adjust these to match the table/column names in your Catalyst NoSQL console.
module.exports = {
	tables: {
		user: {
			name: 'user',
			partitionKey: 'catalyst_user_id'
		},
		conversation: {
			// NOTE: this table needs a sort key named `created_time` (Number) in the
			// Catalyst console, in addition to the `catalyst_user_id` partition key,
			// so messages come back ordered and multiple messages per user are allowed.
			name: 'conversation',
			partitionKey: 'catalyst_user_id',
			sortKey: 'created_time'
		}
	},
	// Set these in functions/crime_diaries_function/catalyst-config.json -> env_variables,
	// or as Environment Variables on the function in the Catalyst console.

	// Shared Catalyst project identifier required as the CATALYST-ORG header
	// on both the QuickML and RAG API calls below. Named without a "CATALYST_"
	// prefix because Catalyst rejects function env vars with reserved keywords
	// (CATALYST_ORG itself is rejected at deploy time).
	catalystOrgEnvVar: 'ZC_ORG_ID',

	llm: {
		// Catalyst QuickML VLM chat endpoint: single-shot { prompt, model, ... },
		// not a running messages list. See lib/aiClient.js#getLlmResponse.
		urlEnvVar: 'LLM_API_URL',
		apiKeyEnvVar: 'LLM_API_KEY',
		model: 'VL-Qwen3.6-35B-A3B',
		systemPrompt:
			'You are a friendly assistant for the Crime Diaries chat app. Respond briefly and naturally to greetings and small talk.',
		defaultParams: {
			top_k: 50,
			top_p: 0.9,
			temperature: 0.7,
			max_tokens: 500
		}
	},
	rag: {
		// Catalyst RAG answer endpoint: { query, documents } -> answer, scoped to
		// a fixed set of indexed document ids (there's no per-message concept of
		// "which documents" so this list is static). See lib/aiClient.js#getRagResponse.
		urlEnvVar: 'RAG_API_URL',
		apiKeyEnvVar: 'RAG_API_KEY',
		documentIdsEnvVar: 'RAG_DOCUMENT_IDS'
	}
};
