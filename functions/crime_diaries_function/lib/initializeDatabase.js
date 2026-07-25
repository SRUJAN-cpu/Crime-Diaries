'use strict';

const catalyst = require('zcatalyst-sdk-node');
const schema = require('./schema');

/**
 * Initialize Crime Diaries Phase 1-3 database tables in Catalyst
 * Run once during deployment to set up all required tables
 * 
 * Usage:
 * node initializeDatabase.js
 * or via endpoint: GET /server/crime_diaries_function/debug/init-db
 */

async function initializeDatabase(catalystApp) {
	const resultsTable = [];
	const nosql = catalystApp.nosql();

	console.log('=== Starting Crime Diaries Phase 1-3 Database Initialization ===\n');

	// List of new tables to create (skip user and conversation as they already exist)
	const newTables = [
		// Phase 1 tables
		'session_metadata',
		'criminal_relationships',
		'offender_profiles',
		'crime_incidents',
		'investigator_roles',
		'evidence_sources',
		// Phase 3 tables
		'financial_transactions',
		'demographic_data',
		'social_risk_factors',
		'urbanization_data'
	];

	for (const tableName of newTables) {
		try {
			console.log(`Attempting to access table: ${tableName}...`);
			
			// Try to access the table - if it exists, skip it
			const table = await nosql.table(tableName);
			console.log(`✓ Table "${tableName}" already exists`);
			resultsTable.push({
				table: tableName,
				status: 'already_exists',
				message: 'Table was already created'
			});
		} catch (err) {
			// Table doesn't exist, try to create it
			if (err.message.includes('not found') || err.message.includes('does not exist')) {
				console.log(`✗ Table "${tableName}" not found. You must create it manually in Catalyst Console.`);
				resultsTable.push({
					table: tableName,
					status: 'not_found',
					action_required: 'Create table in Catalyst Console',
					schema: schema.tables[tableName]
				});
			} else {
				console.error(`✗ Error accessing table "${tableName}":`, err.message);
				resultsTable.push({
					table: tableName,
					status: 'error',
					error: err.message
				});
			}
		}
	}

	console.log('\n=== Database Initialization Complete ===\n');
	return resultsTable;
}

/**
 * Generates SQL/instructions for manual table creation in Catalyst Console
 */
function generateTableCreationGuide() {
	const guide = `
╔════════════════════════════════════════════════════════════════════════════╗
║               Crime Diaries Phase 1 - Table Creation Guide                 ║
║                   MANUAL SETUP IN CATALYST CONSOLE                          ║
╚════════════════════════════════════════════════════════════════════════════╝

You must create these tables manually in Catalyst Console → NoSQL:

1. SESSION_METADATA
   Partition Key: session_id (String)
   Columns:
   - session_id (String, Required)
   - catalyst_user_id (String, Required)
   - chat_name (String, Required)
   - description (String)
   - tags (String)
   - case_type (String)
   - priority (String)
   - is_archived (String)
   - created_time (String)
   - updated_time (String)
   - last_accessed (String)

2. CRIMINAL_RELATIONSHIPS
   Partition Key: relationship_id (String)
   Columns:
   - relationship_id (String, Required)
   - entity_type_1 (String, Required)
   - entity_id_1 (String, Required)
   - entity_name_1 (String)
   - entity_type_2 (String, Required)
   - entity_id_2 (String, Required)
   - entity_name_2 (String)
   - relationship_type (String, Required)
   - strength (String)
   - evidence_count (Number)
   - created_time (String)
   - created_by (String)
   - last_updated (String)
   - notes (String)

2. OFFENDER_PROFILES
   Partition Key: offender_id (String)
   Columns:
   - offender_id (String, Required)
   - name (String, Required)
   - age (Number)
   - gender (String)
   - criminal_history_count (Number)
   - repeat_offender (String)
   - primary_modus_operandi (String)
   - modus_operandi_list (String)
   - risk_score (Number)
   - risk_level (String)
   - last_crime_date (String)
   - last_known_location (String)
   - behavioral_profile (String)
   - associated_gang (String)
   - created_time (String)
   - updated_time (String)

3. CRIME_INCIDENTS
   Partition Key: crime_id (String)
   Columns:
   - crime_id (String, Required)
   - fir_number (String)
   - crime_type (String, Required)
   - crime_category (String)
   - modus_operandi (String)
   - date_of_incident (String)
   - date_registered (String)
   - location (String, Required)
   - latitude (Number)
   - longitude (Number)
   - accused_ids (String)
   - victim_ids (String)
   - investigation_status (String)
   - investigating_officer (String)
   - case_summary (String)
   - evidence_description (String)
   - seasonal_tag (String)
   - event_related (String)
   - created_time (String)
   - updated_time (String)

4. INVESTIGATOR_ROLES
   Partition Key: catalyst_user_id (String)
   Columns:
   - catalyst_user_id (String, Required)
   - email (String, Required)
   - role (String, Required)
   - permissions (String)
   - department (String)
   - jurisdiction (String)
   - can_view_sensitive_data (String)
   - can_export_data (String)
   - can_manage_users (String)
   - assigned_cases (String)
   - created_time (String)
   - last_login (String)

5. EVIDENCE_SOURCES
   Partition Key: source_id (String)
   Columns:
   - source_id (String, Required)
   - session_id (String, Required)
   - catalyst_user_id (String, Required)
   - query (String)
   - response (String)
   - source_type (String, Required)
   - source_id_reference (String)
   - source_confidence (Number)
   - evidence_items (String)
   - reasoning_path (String)
   - created_time (String)
   - human_verified (String)
   - verification_notes (String)

After creating these tables in Catalyst Console:
1. Run: catalyst deploy
2. Call: GET /server/crime_diaries_function/debug/init-db
3. Verify all tables show status "already_exists"
	`;
	return guide;
}

module.exports = { initializeDatabase, generateTableCreationGuide };
