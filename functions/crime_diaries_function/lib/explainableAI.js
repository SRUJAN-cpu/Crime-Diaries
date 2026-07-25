'use strict';

/**
 * Explainable AI Response Format for Crime Diaries
 * Adds transparency, evidence trails, and confidence scoring to responses
 */

/**
 * Enhanced response object with explainability
 * @typedef {Object} ExplainableResponse
 * @property {string} content - the actual answer
 * @property {string} source - 'rag' or 'llm'
 * @property {number} confidence - 0.0 to 1.0
 * @property {Array<{type: string, text: string}>} evidence - sources/references
 * @property {Array<string>} reasoning - explanation of how answer was derived
 * @property {Object} entities - extracted entities from question and answer
 */

/**
 * Build an explainable response wrapper
 * @param {string} content - the response text
 * @param {string} source - 'rag' or 'llm'
 * @param {Object} options
 * @param {number} [options.confidence] - confidence score (0-1)
 * @param {Array} [options.evidence] - list of evidence items
 * @param {Array} [options.reasoning] - reasoning steps
 * @param {Object} [options.entities] - extracted entities
 * @returns {ExplainableResponse}
 */
function createExplainableResponse(content, source, {
	confidence = null,
	evidence = [],
	reasoning = [],
	entities = {}
} = {}) {
	// Compute confidence based on source if not provided
	const computedConfidence = confidence !== null 
		? confidence 
		: (source === 'rag' ? 0.95 : 0.75); // RAG typically has higher confidence

	return {
		content,
		source,
		confidence: Math.min(1, Math.max(0, computedConfidence)), // clamp 0-1
		evidence,
		reasoning,
		entities
	};
}

/**
 * Add RAG source evidence from document references
 * @param {Array} documents - RAG retrieved documents
 * @returns {Array<{type: string, text: string, source?: string}>}
 */
function extractRAGEvidence(documents = []) {
	return documents.map((doc, idx) => ({
		type: 'rag_document',
		text: `Document ${idx + 1}: ${doc.title || 'Unknown'} - ${doc.excerpt?.substring(0, 200) || 'N/A'}`,
		source: doc.id || `doc_${idx}`,
		relevance: doc.score || 0.5
	}));
}

/**
 * Generate reasoning explanation for RAG response
 * @param {string} query
 * @param {number} documentCount
 * @param {string} answer
 * @returns {Array<string>}
 */
function generateRAGReasoning(query, documentCount, answer) {
	return [
		`Searched crime records database for: "${query}"`,
		`Retrieved ${documentCount} relevant document(s)`,
		`Synthesized information to answer question`,
		`Answer is based on existing case data (high confidence)`
	];
}

/**
 * Generate reasoning explanation for LLM response
 * @param {string} query
 * @param {string} responseType - e.g., 'analysis', 'summary', 'explanation'
 * @returns {Array<string>}
 */
function generateLLMReasoning(query, responseType = 'analysis') {
	return [
		`Analyzed query: "${query}"`,
		`Performed ${responseType} using language model`,
		`Answer is generated based on pattern recognition (medium confidence)`
	];
}

/**
 * Format explainable response for API response
 * @param {ExplainableResponse} response
 * @returns {Object} formatted for JSON API
 */
function formatForAPI(response) {
	return {
		answer: response.content,
		explanation: {
			source: response.source,
			confidence: Math.round(response.confidence * 100) + '%',
			evidence: response.evidence.length > 0 ? response.evidence : null,
			reasoning: response.reasoning.length > 0 ? response.reasoning : null
		},
		entities: Object.keys(response.entities).length > 0 ? response.entities : null
	};
}

/**
 * Parse LLM/RAG response and enhance with explainability
 * @param {Object} llmResponse - response from LLM or RAG API
 * @param {string} source - 'rag' or 'llm'
 * @param {string} originalQuery
 * @param {Array} [ragDocuments] - RAG documents if source is 'rag'
 * @returns {ExplainableResponse}
 */
function enhanceResponse(llmResponse, source, originalQuery, ragDocuments = []) {
	const content = llmResponse.answer || llmResponse.content || '';
	
	let evidence = [];
	let reasoning = [];
	let confidence = source === 'rag' ? 0.92 : 0.70;

	if (source === 'rag') {
		evidence = extractRAGEvidence(ragDocuments);
		reasoning = generateRAGReasoning(originalQuery, ragDocuments.length, content);
		confidence = 0.92;
	} else {
		reasoning = generateLLMReasoning(originalQuery, 'analysis');
		confidence = 0.70;
	}

	return createExplainableResponse(content, source, {
		confidence,
		evidence,
		reasoning,
		entities: llmResponse.entities || {}
	});
}

module.exports = {
	createExplainableResponse,
	extractRAGEvidence,
	generateRAGReasoning,
	generateLLMReasoning,
	formatForAPI,
	enhanceResponse
};
