'use strict';

/**
 * Phase 2: Offender Profiling & Risk Assessment
 * Detects repeat offenders, calculates risk scores, identifies organized crime networks
 */

/**
 * Identifies repeat offenders and habitual criminals
 * @param {Array} offenderProfiles - Array of offender profile records
 * @param {Array} crimeIncidents - Array of crime incident records
 */
function identifyRepeatOffenders(offenderProfiles, crimeIncidents) {
	const offenderCrimeMap = {};

	// Map crimes to offenders
	crimeIncidents.forEach(crime => {
		if (crime.accused_ids) {
			const accusedIds = typeof crime.accused_ids === 'string' 
				? JSON.parse(crime.accused_ids) 
				: crime.accused_ids;

			accusedIds.forEach(offenderId => {
				if (!offenderCrimeMap[offenderId]) {
					offenderCrimeMap[offenderId] = [];
				}
				offenderCrimeMap[offenderId].push({
					crime_id: crime.crime_id,
					crime_type: crime.crime_type,
					date: crime.date_of_incident,
					status: crime.investigation_status
				});
			});
		}
	});

	// Enhance offender profiles with crime history
	return offenderProfiles.map(offender => ({
		...offender,
		crime_history: offenderCrimeMap[offender.offender_id] || [],
		crime_count: (offenderCrimeMap[offender.offender_id] || []).length,
		is_repeat_offender: (offenderCrimeMap[offender.offender_id] || []).length > 2 ? 'yes' : 'no',
		most_recent_crime: offenderCrimeMap[offender.offender_id]?.[0]?.date,
		crime_types: [...new Set((offenderCrimeMap[offender.offender_id] || []).map(c => c.crime_type))]
	}));
}

/**
 * Calculates risk score for an offender (0-100 scale)
 * @param {Object} offender - Offender profile with crime history
 */
function calculateRiskScore(offender) {
	let score = 0;

	// Historical frequency weight (30 points)
	if (offender.crime_history) {
		const crimeCount = offender.crime_history.length;
		score += Math.min(crimeCount * 5, 30);
	}

	// Modus operandi severity (25 points)
	const severeModusOperandi = ['homicide', 'rape', 'assault', 'armed_robbery', 'organized_crime'];
	if (offender.modus_operandi_list) {
		const modusList = typeof offender.modus_operandi_list === 'string'
			? JSON.parse(offender.modus_operandi_list)
			: offender.modus_operandi_list;

		const hasSevere = modusList.some(m => severeModusOperandi.includes(m.toLowerCase()));
		if (hasSevere) score += 25;
	}

	// Repeat offender status (20 points)
	if (offender.is_repeat_offender === 'yes') {
		score += 20;
	}

	// Gang association (15 points)
	if (offender.associated_gang) {
		score += 15;
	}

	// Recency of crime (10 points if within last 6 months)
	if (offender.last_crime_date) {
		const lastCrimeDate = new Date(offender.last_crime_date);
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		if (lastCrimeDate > sixMonthsAgo) {
			score += 10;
		}
	}

	return Math.min(score, 100);
}

/**
 * Assigns risk level based on score
 * @param {number} riskScore - Risk score (0-100)
 */
function assignRiskLevel(riskScore) {
	if (riskScore >= 80) return 'critical';
	if (riskScore >= 60) return 'high';
	if (riskScore >= 40) return 'medium';
	return 'low';
}

/**
 * Builds offender risk profiles with scoring
 * @param {Array} enrichedOffenders - Offenders with crime history
 */
function buildRiskProfiles(enrichedOffenders) {
	return enrichedOffenders.map(offender => {
		const riskScore = calculateRiskScore(offender);
		const riskLevel = assignRiskLevel(riskScore);

		return {
			offender_id: offender.offender_id,
			name: offender.name,
			age: offender.age,
			crime_count: offender.crime_count,
			risk_score: riskScore,
			risk_level: riskLevel,
			is_repeat_offender: offender.is_repeat_offender,
			associated_gang: offender.associated_gang,
			crime_types: offender.crime_types,
			last_crime_date: offender.most_recent_crime,
			priority_for_investigation: riskLevel === 'critical' || riskLevel === 'high' ? 'yes' : 'no'
		};
	}).sort((a, b) => b.risk_score - a.risk_score);
}

/**
 * Detects organized crime networks and gang associations
 * @param {Array} offenderProfiles - Array of offender profiles
 * @param {Array} criminalRelationships - Array of criminal relationship records
 */
function detectOrganizedCrimeNetworks(offenderProfiles, criminalRelationships) {
	const networks = {};

	offenderProfiles.forEach(offender => {
		if (offender.associated_gang) {
			const gangId = offender.associated_gang;

			if (!networks[gangId]) {
				networks[gangId] = {
					gang_id: gangId,
					gang_name: offender.associated_gang,
					members: [],
					member_count: 0,
					total_crimes: 0,
					connections: [],
					threat_level: 'unknown'
				};
			}

			networks[gangId].members.push({
				offender_id: offender.offender_id,
				name: offender.name,
				role: offender.role || 'member'
			});
			networks[gangId].member_count += 1;
			networks[gangId].total_crimes += offender.criminal_history_count || 0;
		}
	});

	// Use relationships to find connections
	criminalRelationships.forEach(rel => {
		if (rel.relationship_type === 'co-accused_with' && rel.strength === 'strong') {
			const gang1 = offenderProfiles.find(o => o.offender_id === rel.entity_id_1)?.associated_gang;
			const gang2 = offenderProfiles.find(o => o.offender_id === rel.entity_id_2)?.associated_gang;

			if (gang1 && gang2 && gang1 === gang2) {
				if (networks[gang1]) {
					networks[gang1].connections.push({
						from: rel.entity_id_1,
						to: rel.entity_id_2,
						strength: rel.strength
					});
				}
			}
		}
	});

	// Assign threat levels
	return Object.values(networks).map(network => ({
		...network,
		threat_level: network.member_count > 10 ? 'critical' : network.member_count > 5 ? 'high' : 'medium'
	})).sort((a, b) => b.total_crimes - a.total_crimes);
}

module.exports = {
	identifyRepeatOffenders,
	calculateRiskScore,
	assignRiskLevel,
	buildRiskProfiles,
	detectOrganizedCrimeNetworks
};
