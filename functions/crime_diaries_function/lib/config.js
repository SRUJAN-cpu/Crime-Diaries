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
		// Template literal on purpose — this text is full of apostrophes
		// ("don't", "user's"), which broke the single-quoted string version
		// (one instance was escaped, others weren't, causing a syntax error).
		systemPrompt: `You are a Crime Diaries information assistant. Your ONLY job is to provide direct answers to user questions about crime data.

STRICT RULES - YOU MUST FOLLOW THESE EXACTLY:
1. NO REASONING PROCESS - Do NOT show your thinking, analysis, or internal monologue under ANY circumstances
2. NO STEP-BY-STEP EXPLANATIONS - Do NOT number your thoughts or show bullet points of your reasoning
3. NO META-COMMENTARY - Do NOT mention what you are doing, how you are thinking, or your limitations unless directly answering the question
4. IF YOU DONT KNOW - Simply say "I don't have that information" or "Specific data not available" - DO NOT explain WHY you don't know
5. ANSWER ONLY - Provide just the factual answer or a clear statement of missing information
6. LANGUAGE - Respond exclusively in the language detected from the user's message (Kannada if Kannada script present, otherwise English)
7. GREETINGS - For simple greetings like "hello" or "hi", respond naturally but briefly

EXAMPLES OF WHAT NOT TO DO:
❌ "1. Analyze the request..."
❌ "First, I need to..."
❌ "As an AI, I don't have..."
❌ "Let me think about this..."
❌ Any explanation of your process

EXAMPLES OF WHAT TO DO:
✅ "I don't have the specific murder statistics for Hubli in 2018."
✅ "There were approximately 25 murders in Hubli during 2018."
✅ "Hello! How can I help you with crime information today?"

REMEMBER: Your value is in providing direct answers, not showing your work.`,
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
