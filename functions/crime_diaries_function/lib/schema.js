'use strict';

/**
 * Database schema definition for Crime Diaries
 * 
 * PHASE 1 Tables (existing):
 * 1. user - user profiles
 * 2. conversation - chat messages
 * 3. session_metadata - session info
 * 4. criminal_relationships - entity connections
 * 5. offender_profiles - offender information
 * 6. crime_incidents - FIR and crime details
 * 7. investigator_roles - user roles and permissions
 * 8. evidence_sources - data sources for explainability
 * 
 * PHASE 3 Tables (new):
 * 9. financial_transactions - money laundering analysis
 * 10. demographic_data - demographic correlations
 * 11. social_risk_factors - social risk indicators
 * 12. urbanization_data - geographic characteristics
 */

module.exports = {
	tables: {
		// EXISTING TABLES (for reference)
		user: {
			name: 'user',
			description: 'User profiles and activity tracking',
			partitionKey: 'catalyst_user_id',
			columns: {
				catalyst_user_id: { type: 'String', required: true },
				email: { type: 'String' },
				first_name: { type: 'String' },
				last_name: { type: 'String' },
				created_time: { type: 'String' }, // ISO-8601
				last_active_time: { type: 'String' } // ISO-8601
			}
		},
		conversation: {
			name: 'conversation',
			description: 'Chat message history',
			partitionKey: 'catalyst_user_id',
			sortKey: 'updated_at',
			columns: {
				catalyst_user_id: { type: 'String', required: true },
				updated_at: { type: 'String', required: true }, // ISO-8601, sort key
				session_id: { type: 'String', required: true },
				role: { type: 'String', required: true }, // 'user', 'assistant', 'system'
				content: { type: 'String', required: true },
				source: { type: 'String' }, // 'llm' or 'rag'
				explanation: { type: 'String' } // Explainability data (JSON)
			}
		},

		session_metadata: {
			name: 'session_metadata',
			description: 'Chat session metadata - names, descriptions, tags',
			partitionKey: 'session_id',
			columns: {
				session_id: { type: 'String', required: true },
				catalyst_user_id: { type: 'String', required: true },
				chat_name: { type: 'String', required: true },
				description: { type: 'String' },
				tags: { type: 'String' }, // JSON array
				case_type: { type: 'String' }, // 'murder', 'theft', 'fraud', etc.
				priority: { type: 'String' }, // 'low', 'medium', 'high', 'critical'
				is_archived: { type: 'String' }, // 'yes', 'no'
				created_time: { type: 'String' }, // ISO-8601
				updated_time: { type: 'String' }, // ISO-8601
				last_accessed: { type: 'String' } // ISO-8601
			}
		},

		// PHASE 1 NEW TABLES

		criminal_relationships: {
			name: 'criminal_relationships',
			description: 'Links between accused, victims, locations, and crime incidents',
			partitionKey: 'relationship_id', // UUIDv4
			columns: {
				relationship_id: { type: 'String', required: true }, // Primary identifier
				entity_type_1: { type: 'String', required: true }, // 'accused', 'victim', 'location', 'financial_account'
				entity_id_1: { type: 'String', required: true }, // ID of first entity
				entity_name_1: { type: 'String' }, // Name of first entity
				
				entity_type_2: { type: 'String', required: true }, // Type of second entity
				entity_id_2: { type: 'String', required: true }, // ID of second entity
				entity_name_2: { type: 'String' }, // Name of second entity
				
				relationship_type: { type: 'String', required: true }, // 'associated_with', 'transaction_to', 'co-accused_with', 'suspect_location'
				strength: { type: 'String' }, // 'weak', 'moderate', 'strong' (confidence)
				evidence_count: { type: 'Number' }, // How many cases link them
				
				created_time: { type: 'String' }, // ISO-8601
				created_by: { type: 'String' }, // analyst user_id
				last_updated: { type: 'String' }, // ISO-8601
				notes: { type: 'String' } // Relationship details
			}
		},

		offender_profiles: {
			name: 'offender_profiles',
			description: 'Offender information, risk scores, and behavioral patterns',
			partitionKey: 'offender_id', // UUIDv4
			columns: {
				offender_id: { type: 'String', required: true }, // Primary identifier
				name: { type: 'String', required: true },
				age: { type: 'Number' },
				gender: { type: 'String' }, // 'M', 'F', 'Other'
				criminal_history_count: { type: 'Number' }, // Total crime count
				repeat_offender: { type: 'String' }, // 'yes', 'no'
				
				primary_modus_operandi: { type: 'String' }, // Most common crime type
				modus_operandi_list: { type: 'String' }, // JSON array of crime types
				
				risk_score: { type: 'Number' }, // 0-100 scale
				risk_level: { type: 'String' }, // 'low', 'medium', 'high', 'critical'
				
				last_crime_date: { type: 'String' }, // ISO-8601
				last_known_location: { type: 'String' },
				
				behavioral_profile: { type: 'String' }, // JSON with behavioral traits
				associated_gang: { type: 'String' }, // If part of organized crime group
				
				created_time: { type: 'String' }, // ISO-8601
				updated_time: { type: 'String' } // ISO-8601
			}
		},

		crime_incidents: {
			name: 'crime_incidents',
			description: 'Crime records, FIRs, and incident details',
			partitionKey: 'crime_id', // UUIDv4 or FIR number
			columns: {
				crime_id: { type: 'String', required: true }, // Primary identifier
				fir_number: { type: 'String' }, // FIR registration number
				
				crime_type: { type: 'String', required: true }, // 'theft', 'assault', 'fraud', etc.
				crime_category: { type: 'String' }, // 'violent', 'property', 'cyber', 'white-collar'
				modus_operandi: { type: 'String' }, // How the crime was committed
				
				date_of_incident: { type: 'String' }, // ISO-8601
				date_registered: { type: 'String' }, // ISO-8601
				
				location: { type: 'String', required: true }, // Address/area
				latitude: { type: 'Number' }, // For map visualization
				longitude: { type: 'Number' },
				
				accused_ids: { type: 'String' }, // JSON array of offender_ids
				victim_ids: { type: 'String' }, // JSON array of victim_ids
				
				investigation_status: { type: 'String' }, // 'registered', 'under_investigation', 'closed', 'solved', 'unsolved'
				investigating_officer: { type: 'String' }, // Officer ID
				
				case_summary: { type: 'String' }, // Detailed summary
				evidence_description: { type: 'String' }, // Evidence collected
				
				seasonal_tag: { type: 'String' }, // For seasonal analysis
				event_related: { type: 'String' }, // If linked to specific event
				
				created_time: { type: 'String' }, // ISO-8601
				updated_time: { type: 'String' } // ISO-8601
			}
		},

		investigator_roles: {
			name: 'investigator_roles',
			description: 'User roles and permissions for RBAC',
			partitionKey: 'catalyst_user_id',
			columns: {
				catalyst_user_id: { type: 'String', required: true },
				email: { type: 'String', required: true },
				
				role: { type: 'String', required: true }, // 'investigator', 'analyst', 'supervisor', 'policymaker', 'admin'
				
				// Permissions (as JSON string for flexibility)
				permissions: { type: 'String' }, // JSON array: ['view_cases', 'edit_cases', 'delete_cases', 'view_reports', etc.]
				
				// Department/jurisdiction
				department: { type: 'String' },
				jurisdiction: { type: 'String' }, // Geographic area
				
				// Access level
				can_view_sensitive_data: { type: 'String' }, // 'yes', 'no'
				can_export_data: { type: 'String' }, // 'yes', 'no'
				can_manage_users: { type: 'String' }, // 'yes', 'no'
				
				assigned_cases: { type: 'String' }, // JSON array of crime_ids
				
				created_time: { type: 'String' }, // ISO-8601
				last_login: { type: 'String' } // ISO-8601
			}
		},

		evidence_sources: {
			name: 'evidence_sources',
			description: 'Data sources for explainable AI responses',
			partitionKey: 'source_id', // UUIDv4
			columns: {
				source_id: { type: 'String', required: true }, // Primary identifier
				session_id: { type: 'String', required: true }, // Linked conversation
				catalyst_user_id: { type: 'String', required: true }, // User who made the query
				
				query: { type: 'String' }, // Original user question
				response: { type: 'String' }, // AI response given
				
				source_type: { type: 'String', required: true }, // 'crime_incident', 'offender_profile', 'relationship', 'rag_document', 'llm'
				source_id_reference: { type: 'String' }, // ID of the source record
				source_confidence: { type: 'Number' }, // 0-100 confidence
				
				evidence_items: { type: 'String' }, // JSON array of evidence references
				reasoning_path: { type: 'String' }, // JSON explanation of how AI reached conclusion
				
				created_time: { type: 'String' }, // ISO-8601
				human_verified: { type: 'String' }, // 'pending', 'verified', 'disputed'
				verification_notes: { type: 'String' }
			}
		},

		// PHASE 3 NEW TABLES

		financial_transactions: {
			name: 'financial_transactions',
			description: 'Financial transactions for money laundering and crime financing analysis',
			partitionKey: 'transaction_id', // UUIDv4
			columns: {
				transaction_id: { type: 'String', required: true }, // Primary identifier
				offender_id: { type: 'String' }, // Linked to offender profile
				crime_id: { type: 'String' }, // Linked crime incident
				
				transaction_date: { type: 'String', required: true }, // ISO-8601
				transaction_amount: { type: 'Number', required: true }, // Amount in base currency
				
				source_entity: { type: 'String', required: true }, // Account/entity sending money
				destination_entity: { type: 'String', required: true }, // Account/entity receiving money
				
				source_type: { type: 'String' }, // 'bank_account', 'cash', 'cryptocurrency', 'hawala'
				destination_type: { type: 'String' }, // Type of receiving entity
				
				transaction_type: { type: 'String' }, // 'wire_transfer', 'cash_deposit', 'payment', 'atm_withdrawal'
				
				risk_score: { type: 'Number' }, // 0-100 risk assessment
				risk_factors: { type: 'String' }, // JSON array of risk indicators
				
				is_suspicious: { type: 'String' }, // 'yes', 'no', 'pending_review'
				structuring_indicator: { type: 'String' }, // 'yes', 'no' (multiple small txns to avoid reporting)
				
				created_time: { type: 'String' }, // ISO-8601
				analyst_notes: { type: 'String' }
			}
		},

		demographic_data: {
			name: 'demographic_data',
			description: 'Demographic information for crime correlations',
			partitionKey: 'demographic_id', // UUIDv4
			columns: {
				demographic_id: { type: 'String', required: true }, // Primary identifier
				crime_id: { type: 'String', required: true }, // Linked to crime incident
				offender_id: { type: 'String' }, // Linked to offender (if applicable)
				
				age: { type: 'Number' }, // Age in years
				age_group: { type: 'String' }, // '18-25', '26-35', '36-45', etc.
				
				gender: { type: 'String' }, // 'M', 'F', 'Other'
				
				socioeconomic_status: { type: 'String' }, // 'low', 'lower-middle', 'middle', 'upper-middle', 'high'
				
				education_level: { type: 'String' }, // 'primary', 'secondary', 'tertiary', 'higher'
				
				employment_status: { type: 'String' }, // 'employed', 'unemployed', 'student', 'retired'
				
				location: { type: 'String' }, // Geographic location
				
				created_time: { type: 'String' }, // ISO-8601
				data_source: { type: 'String' } // Source of demographic data
			}
		},

		social_risk_factors: {
			name: 'social_risk_factors',
			description: 'Social and economic risk factors by location/community',
			partitionKey: 'factor_id', // UUIDv4
			columns: {
				factor_id: { type: 'String', required: true }, // Primary identifier
				location: { type: 'String', required: true }, // Community/area name
				
				unemployment_rate: { type: 'Number' }, // Percentage
				poverty_rate: { type: 'Number' }, // Percentage
				high_school_dropout_rate: { type: 'Number' }, // Percentage
				
				population_density: { type: 'Number' }, // People per km²
				
				migration_influx_high: { type: 'String' }, // 'yes', 'no'
				migration_rate: { type: 'Number' }, // Percentage change
				
				economic_stress_index: { type: 'Number' }, // 0-1 scale
				crime_rate: { type: 'Number' }, // Crimes per 100k population
				
				infrastructure_quality: { type: 'String' }, // 'poor', 'fair', 'good', 'excellent'
				education_access: { type: 'String' }, // 'poor', 'fair', 'good', 'excellent'
				healthcare_access: { type: 'String' }, // 'poor', 'fair', 'good', 'excellent'
				
				overall_risk_score: { type: 'Number' }, // 0-100 composite score
				
				report_date: { type: 'String' }, // ISO-8601
				data_source: { type: 'String' } // Government, NGO, research body
			}
		},

		urbanization_data: {
			name: 'urbanization_data',
			description: 'Urbanization metrics and geographic characteristics',
			partitionKey: 'location', // Area/city name
			columns: {
				location: { type: 'String', required: true }, // Area identifier
				
				urbanization_level: { type: 'String', required: true }, // 'rural', 'semi_urban', 'urban', 'metropolitan'
				
				population: { type: 'Number' }, // Total population
				population_density: { type: 'Number' }, // Per km²
				
				area_km2: { type: 'Number' }, // Total area in km²
				
				migration_rate: { type: 'Number' }, // Annual percentage change
				
				infrastructure_index: { type: 'Number' }, // 0-100 score
				
				latitude: { type: 'Number' }, // For mapping
				longitude: { type: 'Number' },
				
				administrative_division: { type: 'String' }, // District, state, etc.
				
				last_updated: { type: 'String' }, // ISO-8601
				data_source: { type: 'String' } // Census, survey, etc.
			}
		}
	}
};
