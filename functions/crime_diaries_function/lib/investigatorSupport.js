'use strict';

/**
 * Phase 2: Investigator Decision Support
 * Provides case summaries, similar case recommendations, and investigative leads
 */

/**
 * Generates an automated case summary
 * @param {Object} crimeIncident - Crime incident record
 * @param {Array} offenderProfiles - Related offender profiles
 * @param {Array} relationships - Criminal relationships
 */
function generateCaseSummary(crimeIncident, offenderProfiles, relationships) {
	const summary = {
		case_id: crimeIncident.crime_id,
		fir_number: crimeIncident.fir_number,
		title: `${crimeIncident.crime_type.toUpperCase()} - ${crimeIncident.location}`,
		
		incident_details: {
			type: crimeIncident.crime_type,
			category: crimeIncident.crime_category,
			date: crimeIncident.date_of_incident,
			location: crimeIncident.location,
			coordinates: crimeIncident.latitude && crimeIncident.longitude 
				? `${crimeIncident.latitude}, ${crimeIncident.longitude}`
				: 'Unknown',
			modus_operandi: crimeIncident.modus_operandi
		},

		investigation_status: crimeIncident.investigation_status,
		investigating_officer: crimeIncident.investigating_officer,
		
		accused: [],
		victims: [],
		
		timeline: {
			registered: crimeIncident.date_registered,
			incident: crimeIncident.date_of_incident,
			days_elapsed: crimeIncident.date_registered 
				? Math.floor((new Date(crimeIncident.date_registered) - new Date(crimeIncident.date_of_incident)) / (1000 * 60 * 60 * 24))
				: 0
		},

		evidence_summary: crimeIncident.evidence_description,
		case_notes: crimeIncident.case_summary,
		
		risk_assessment: {
			suspects_count: 0,
			suspects_risk_level: 'unknown',
			organized_crime_involvement: 'no'
		}
	};

	// Add accused information
	if (crimeIncident.accused_ids) {
		const accusedIds = typeof crimeIncident.accused_ids === 'string'
			? JSON.parse(crimeIncident.accused_ids)
			: crimeIncident.accused_ids;

		summary.accused = accusedIds.map(accusedId => {
			const offender = offenderProfiles.find(o => o.offender_id === accusedId);
			return {
				offender_id: accusedId,
				name: offender?.name || 'Unknown',
				age: offender?.age,
				risk_level: offender?.risk_level || 'unknown',
				repeat_offender: offender?.repeat_offender
			};
		});

		summary.risk_assessment.suspects_count = summary.accused.length;
		const maxRisk = Math.max(...summary.accused.map(s => {
			const riskMap = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
			return riskMap[s.risk_level] || 0;
		}));
		const riskLevels = { 4: 'critical', 3: 'high', 2: 'medium', 1: 'low', 0: 'unknown' };
		summary.risk_assessment.suspects_risk_level = riskLevels[maxRisk];
	}

	// Check for organized crime involvement
	if (summary.accused.some(s => relationships.find(r => 
		(r.entity_id_1 === s.offender_id || r.entity_id_2 === s.offender_id) &&
		r.relationship_type === 'co-accused_with'
	))) {
		summary.risk_assessment.organized_crime_involvement = 'yes';
	}

	return summary;
}

/**
 * Finds similar past cases for reference
 * @param {Object} crimeIncident - Current case
 * @param {Array} pastCrimes - Array of past crime incidents
 * @param {number} limit - Max cases to return
 */
function findSimilarCases(crimeIncident, pastCrimes, limit = 5) {
	const similarCases = pastCrimes
		.filter(crime => crime.crime_id !== crimeIncident.crime_id) // Exclude current case
		.map(crime => {
			let similarity = 0;

			// Crime type match (40 points)
			if (crime.crime_type === crimeIncident.crime_type) {
				similarity += 40;
			}

			// Modus operandi match (30 points)
			if (crime.modus_operandi === crimeIncident.modus_operandi) {
				similarity += 30;
			}

			// Location proximity (20 points) - simplified (same location)
			if (crime.location === crimeIncident.location) {
				similarity += 20;
			}

			// Timeline proximity (10 points) - within 1 year
			if (crimeIncident.date_of_incident && crime.date_of_incident) {
				const daysDiff = Math.abs(
					(new Date(crimeIncident.date_of_incident) - new Date(crime.date_of_incident)) / (1000 * 60 * 60 * 24)
				);
				if (daysDiff < 365) {
					similarity += 10;
				}
			}

			return {
				crime_id: crime.crime_id,
				fir_number: crime.fir_number,
				crime_type: crime.crime_type,
				location: crime.location,
				date: crime.date_of_incident,
				status: crime.investigation_status,
				similarity_score: similarity,
				outcome: crime.investigation_status === 'solved' ? 'SOLVED' : crime.investigation_status === 'closed' ? 'CLOSED' : 'OPEN'
			};
		})
		.filter(c => c.similarity_score > 0)
		.sort((a, b) => b.similarity_score - a.similarity_score)
		.slice(0, limit);

	return {
		current_case: crimeIncident.crime_id,
		similar_cases_found: similarCases.length,
		cases: similarCases,
		recommendation: similarCases.length > 0 
			? `Review ${similarCases.length} similar case(s) for investigative insights`
			: 'No similar past cases found'
	};
}

/**
 * Recommends investigative leads
 * @param {Object} caseSummary - Generated case summary
 * @param {Array} offenderProfiles - Offender profiles
 * @param {Array} relationships - Criminal relationships
 */
function generateInvestigativeLeads(caseSummary, offenderProfiles, relationships) {
	const leads = [];

	// Lead 1: High-risk suspects
	const highRiskSuspects = caseSummary.accused.filter(s => 
		s.risk_level === 'critical' || s.risk_level === 'high'
	);
	if (highRiskSuspects.length > 0) {
		leads.push({
			priority: 'HIGH',
			type: 'suspect_risk_assessment',
			description: `${highRiskSuspects.length} suspect(s) have HIGH or CRITICAL risk profile`,
			suspects: highRiskSuspects.map(s => s.name),
			action: 'Prioritize surveillance and interrogation of flagged suspects'
		});
	}

	// Lead 2: Repeat offenders
	const repeatOffenders = caseSummary.accused.filter(s => s.repeat_offender === 'yes');
	if (repeatOffenders.length > 0) {
		leads.push({
			priority: 'HIGH',
			type: 'repeat_offender_pattern',
			description: `${repeatOffenders.length} repeat offender(s) involved in this case`,
			suspects: repeatOffenders.map(s => s.name),
			action: 'Review historical MO and victim profiles of these offenders'
		});
	}

	// Lead 3: Organized crime connections
	if (caseSummary.risk_assessment.organized_crime_involvement === 'yes') {
		leads.push({
			priority: 'CRITICAL',
			type: 'organized_crime_link',
			description: 'Case involves known organized crime connections',
			action: 'Escalate to organized crime task force'
		});
	}

	// Lead 4: Related relationships
	const relatedConnections = relationships.filter(r =>
		caseSummary.accused.some(s => s.offender_id === r.entity_id_1 || s.offender_id === r.entity_id_2)
	);
	if (relatedConnections.length > 0) {
		leads.push({
			priority: 'MEDIUM',
			type: 'criminal_network',
			description: `${relatedConnections.length} criminal relationship(s) connected to suspects`,
			connections_count: relatedConnections.length,
			action: 'Investigate network of associated criminals'
		});
	}

	// Lead 5: Case resolution timeframe
	if (caseSummary.timeline.days_elapsed > 30 && caseSummary.investigation_status === 'under_investigation') {
		leads.push({
			priority: 'MEDIUM',
			type: 'investigation_timeline',
			description: `Investigation ongoing for ${caseSummary.timeline.days_elapsed} days without closure`,
			action: 'Review investigation progress and consider additional resources'
		});
	}

	return {
		case_id: caseSummary.case_id,
		total_leads: leads.length,
		leads: leads.sort((a, b) => {
			const priorityMap = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
			return priorityMap[b.priority] - priorityMap[a.priority];
		})
	};
}

module.exports = {
	generateCaseSummary,
	findSimilarCases,
	generateInvestigativeLeads
};
