'use strict';

const ROUTES = { LLM: 'llm', RAG: 'rag' };

// Words/phrases that indicate the user is asking about crime data and needs
// the RAG pipeline. Anything that doesn't match (greetings, small talk,
// unrelated questions) goes to the plain LLM instead. Extend this list as
// you see real user queries come in.
const CRIME_KEYWORDS = [
	'crime', 'crimes', 'criminal', 'fir', 'complaint', 'police', 'theft',
	'stolen', 'robbery', 'burglary', 'murder', 'homicide', 'assault',
	'kidnap', 'fraud', 'scam', 'cybercrime', 'harassment', 'violence',
	'arrest', 'accused', 'suspect', 'victim', 'convict', 'sentence',
	'case', 'investigation', 'incident', 'report', 'statistics', 'stats',
	'ipc', 'section', 'law', 'legal', 'court', 'district', 'jurisdiction'
];

/**
 * Decides whether a chat message needs the RAG pipeline (crime data lookups)
 * or can be answered directly by the plain LLM (greetings, small talk, or
 * anything else that isn't a recognized crime-related query).
 * @param {string} message
 * @returns {'llm' | 'rag'}
 */
function classifyMessage(message) {
	const normalized = message.trim().toLowerCase();
	const isCrimeRelated = CRIME_KEYWORDS.some((keyword) => normalized.includes(keyword));
	return isCrimeRelated ? ROUTES.RAG : ROUTES.LLM;
}

module.exports = { classifyMessage, ROUTES };
