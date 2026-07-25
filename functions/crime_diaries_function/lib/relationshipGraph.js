'use strict';

const { NoSQLItem, NoSQLEnum, NoSQLMarshall } = require('zcatalyst-sdk-node/lib/no-sql');
const config = require('./config');

const { NoSQLOperator } = NoSQLEnum;

/**
 * Creates a relationship between two entities (accused, victim, location, financial account)
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {Object} params
 * @param {string} params.sourceEntity - entity ID (e.g., "accused:123", "victim:456")
 * @param {string} params.targetEntity - entity ID
 * @param {string} params.relationType - "associated_with", "accused_of", "victim_of", "located_at", "finances", "repeat_crime"
 * @param {string} params.caseId - case/session ID
 * @param {string} [params.metadata] - additional context (JSON stringified)
 * @returns {Promise<string>} relationship ID
 */
async function createRelationship(catalystApp, catalystUserId, { sourceEntity, targetEntity, relationType, caseId, metadata }) {
	const table = await catalystApp.nosql().table('relationships');
	const relationshipId = require('crypto').randomUUID();
	const now = new Date().toISOString();

	const item = NoSQLItem.from({
		catalyst_user_id: catalystUserId,
		relationship_id: relationshipId,
		source_entity: sourceEntity,
		target_entity: targetEntity,
		relation_type: relationType,
		case_id: caseId,
		metadata: metadata || null,
		created_at: now,
		updated_at: now
	});

	await table.insertItems({ item });
	return relationshipId;
}

/**
 * Fetches all relationships for a specific entity (e.g., all connections for accused person)
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} entityId - the entity to find connections for
 * @returns {Promise<Array>} relationships
 */
async function getRelationshipsForEntity(catalystApp, catalystUserId, entityId) {
	const table = await catalystApp.nosql().table('relationships');

	// Query both source and target to get all connections
	const sourceQuery = {
		key_condition: {
			attribute: 'catalyst_user_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(catalystUserId)
		},
		other_condition: {
			attribute: 'source_entity',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(entityId)
		},
		forward_scan: true
	};

	const targetQuery = {
		key_condition: {
			attribute: 'catalyst_user_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(catalystUserId)
		},
		other_condition: {
			attribute: 'target_entity',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(entityId)
		},
		forward_scan: true
	};

	try {
		const sourceResult = await table.queryTable(sourceQuery);
		const targetResult = await table.queryTable(targetQuery);

		const sourceRels = (sourceResult.get || [])
			.map(entry => entry.item?.to?.())
			.filter(Boolean);

		const targetRels = (targetResult.get || [])
			.map(entry => entry.item?.to?.())
			.filter(Boolean);

		return [...sourceRels, ...targetRels];
	} catch (err) {
		console.warn('Error querying relationships:', err.message);
		return [];
	}
}

/**
 * Fetches all relationships for a specific case/session
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} caseId
 * @returns {Promise<Array>} relationships
 */
async function getRelationshipsForCase(catalystApp, catalystUserId, caseId) {
	const table = await catalystApp.nosql().table('relationships');

	const query = {
		key_condition: {
			attribute: 'catalyst_user_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(catalystUserId)
		},
		other_condition: {
			attribute: 'case_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(caseId)
		},
		forward_scan: true
	};

	try {
		const result = await table.queryTable(query);
		return (result.get || [])
			.map(entry => entry.item?.to?.())
			.filter(Boolean);
	} catch (err) {
		console.warn('Error querying case relationships:', err.message);
		return [];
	}
}

/**
 * Deletes a relationship
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {string} catalystUserId
 * @param {string} relationshipId
 */
async function deleteRelationship(catalystApp, catalystUserId, relationshipId) {
	const table = await catalystApp.nosql().table('relationships');
	const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');

	// Need to find the relationship first to get the sort key (updated_at)
	const query = {
		key_condition: {
			attribute: 'catalyst_user_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(catalystUserId)
		},
		other_condition: {
			attribute: 'relationship_id',
			operator: NoSQLOperator.EQUALS,
			value: NoSQLMarshall.makeString(relationshipId)
		},
		forward_scan: true
	};

	const result = await table.queryTable(query);
	const rel = result?.get?.[0]?.item?.to?.();

	if (rel && rel.updated_at) {
		const key = NoSQLItem.from({
			catalyst_user_id: catalystUserId,
			updated_at: rel.updated_at
		});
		await table.deleteItems({ keys: key });
	}
}

/**
 * Extract entities from chat message using simple keyword matching
 * This is a placeholder; in production, use NER (Named Entity Recognition)
 * @param {string} message
 * @returns {Object} { entities: [], mentions: [] }
 */
function extractEntitiesFromMessage(message) {
	const entities = [];
	const patterns = {
		accused: /accused named\s+([a-z\s]+)(?:\s|$|,)/gi,
		victim: /victim\s+([a-z\s]+)(?:\s|$|,)/gi,
		location: /(?:at|in|near|from)\s+([a-z\s]+)(?:\s|$|,)/gi,
		case: /case\s+(?:no\.?|#)?(\d+)/gi
	};

	for (const [type, pattern] of Object.entries(patterns)) {
		let match;
		while ((match = pattern.exec(message)) !== null) {
			entities.push({
				type,
				value: match[1].trim(),
				confidence: 0.6 // placeholder
			});
		}
	}

	return { entities, mentions: message };
}

module.exports = {
	createRelationship,
	getRelationshipsForEntity,
	getRelationshipsForCase,
	deleteRelationship,
	extractEntitiesFromMessage
};
