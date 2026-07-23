'use strict';

// Adjust these to match the table/column names in your Catalyst NoSQL console.
module.exports = {
	tables: {
		user: {
			name: 'user',
			partitionKey: 'catalyst_user_id'
		},
		conversation: {
			// Sort key is `updated_at` (Number) per the actual console schema,
			// in addition to the `catalyst_user_id` partition key.
			name: 'conversation',
			partitionKey: 'catalyst_user_id',
			sortKey: 'updated_at'
		}
	},
	// Set these in functions/crime_diaries_function/catalyst-config.json -> env_variables,
	// or as Environment Variables on the function in the Catalyst console.

	// Shared Catalyst project identifier required as the CATALYST-ORG header
	// on both the QuickML and RAG API calls below. Named without a "CATALYST_"
	// prefix because Catalyst rejects function env vars with reserved keywords
	// (CATALYST_ORG itself is rejected at deploy time).
	catalystOrgEnvVar: 'ZC_ORG_ID',

	// Both the LLM and RAG endpoints need a Zoho OAuth access token (scope
	// QuickML.deployment.READ), which expires in ~1hr. Rather than pasting a
	// short-lived token into an env var, we keep the long-lived client
	// credentials + refresh token and mint access tokens on demand — see
	// lib/zohoOAuth.js.
	zoho: {
		tokenUrl: 'https://accounts.zoho.in/oauth/v2/token',
		clientIdEnvVar: 'ZOHO_CLIENT_ID',
		clientSecretEnvVar: 'ZOHO_CLIENT_SECRET',
		refreshTokenEnvVar: 'ZOHO_REFRESH_TOKEN',
		// Refresh this many seconds early so a token doesn't die mid-request.
		expiryBufferSeconds: 60
	},

	// Two separate QuickML chat endpoints with genuinely different request
	// shapes (confirmed via the console's own integration samples) — not just
	// different models:
	//   - vlm/chat: single-shot { prompt, model, images, system_prompt, ... }.
	//     Requires at least one real image; used only when one is attached.
	//   - glm/chat: OpenAI-Chat-Completions-style { model, messages, ... }.
	//     Text-only, used for everything else. See lib/aiClient.js.
	llm: {
		systemPrompt:
			'You are a helpful assistant for the Crime Diaries chat app that provides accurate information about crime data. When answering questions:\n1. Give direct, factual responses based on available data\n2. If you do not have specific information, clearly state that you don\'t have the exact data rather than explaining your limitations\n3. Do not show your reasoning process or internal thought process\n4. Keep responses concise and to the point\n5. For greetings and small talk, respond briefly and naturally',
		vlm: {
			urlEnvVar: 'VLM_API_URL',
			model: 'VL-Qwen3.6-35B-A3B',
			defaultParams: {
				top_k: 50,
				top_p: 0.9,
				temperature: 0.3,  // Lower temperature for more focused, factual responses
				max_tokens: 500
			}
		},
		glm: {
			urlEnvVar: 'GLM_API_URL',
			model: 'crm-di-glm47b_30b_it',
			defaultParams: {
				temperature: 0.3,  // Lower temperature for more focused, factual responses
				max_tokens: 500,
				stream: false
			}
		}
	},
	rag: {
		// Catalyst RAG answer endpoint: { query, documents } -> answer, scoped to
		// a fixed set of indexed document ids (there's no per-message concept of
		// "which documents" so this list is static). See lib/aiClient.js#getRagResponse.
		urlEnvVar: 'RAG_API_URL',
		documentIdsEnvVar: 'RAG_DOCUMENT_IDS'
	}
};
