'use strict';

/**
 * Phase 3: Crime Forecasting & Early Warning System
 * AI-driven identification of emerging crime patterns and early warning alerts
 */

/**
 * Forecasts emerging crime patterns based on historical data
 * @param {Array} crimeIncidents - Historical crime incidents
 * @param {number} lookbackDays - Days to analyze (default 180)
 */
function forecastEmergingCrimes(crimeIncidents, lookbackDays = 180) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

	const recentCrimes = crimeIncidents.filter(crime => {
		const crimeDate = new Date(crime.date_of_incident);
		return crimeDate > cutoffDate;
	});

	const forecasts = {
		prediction_date: new Date().toISOString(),
		lookback_days: lookbackDays,
		analyzed_crimes: recentCrimes.length,
		emerging_patterns: [],
		risk_alerts: []
	};

	// Analyze crime type trends
	const crimeTypeTrends = {};
	recentCrimes.forEach(crime => {
		const type = crime.crime_type;
		if (!crimeTypeTrends[type]) {
			crimeTypeTrends[type] = {
				type,
				count: 0,
				trend: 0,
				locations: {},
				last_occurrence: null
			};
		}
		crimeTypeTrends[type].count++;
		crimeTypeTrends[type].locations[crime.location] = (crimeTypeTrends[type].locations[crime.location] || 0) + 1;
		crimeTypeTrends[type].last_occurrence = crime.date_of_incident;
	});

	// Detect emerging patterns (crimes with increasing frequency)
	Object.entries(crimeTypeTrends).forEach(([type, data]) => {
		// Calculate trend (simple: if count > average, it's emerging)
		const avgCount = recentCrimes.length / Object.keys(crimeTypeTrends).length;
		const trendScore = (data.count - avgCount) / avgCount;

		if (trendScore > 0.5) { // 50% above average = emerging
			const topLocation = Object.entries(data.locations).sort((a, b) => b[1] - a[1])[0];

			forecasts.emerging_patterns.push({
				pattern_id: `pattern_${type}_${Date.now()}`,
				crime_type: type,
				pattern_description: `${type} crimes increasing in frequency`,
				frequency: data.count,
				trend_score: trendScore,
				hotspot_location: topLocation?.[0],
				prediction_confidence: Math.min(trendScore * 100, 95),
				forecast_horizon: '30 days',
				recommended_action: 'Increase patrol and surveillance in identified hotspots'
			});
		}
	});

	// Geographic clustering for hotspot forecasting
	const geographicClusters = {};
	recentCrimes.forEach(crime => {
		const location = crime.location;
		if (!geographicClusters[location]) {
			geographicClusters[location] = { count: 0, crime_types: {} };
		}
		geographicClusters[location].count++;
		geographicClusters[location].crime_types[crime.crime_type] = 
			(geographicClusters[location].crime_types[crime.crime_type] || 0) + 1;
	});

	// Identify high-risk areas
	Object.entries(geographicClusters).forEach(([location, data]) => {
		if (data.count > 5) { // More than 5 crimes in lookback period
			forecasts.risk_alerts.push({
				alert_id: `alert_${location}_${Date.now()}`,
				alert_type: 'HOTSPOT_FORECAST',
				location,
				crime_count_recent: data.count,
				risk_level: data.count > 15 ? 'CRITICAL' : data.count > 10 ? 'HIGH' : 'MEDIUM',
				dominant_crime: Object.entries(data.crime_types).sort((a, b) => b[1] - a[1])[0]?.[0],
				alert_message: `${location}: ${data.count} crimes in last ${lookbackDays} days`,
				recommended_response: 'Increase police presence and community engagement'
			});
		}
	});

	// Sort by confidence
	forecasts.emerging_patterns.sort((a, b) => b.prediction_confidence - a.prediction_confidence);
	forecasts.risk_alerts.sort((a, b) => {
		const riskMap = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
		return riskMap[b.risk_level] - riskMap[a.risk_level];
	});

	return forecasts;
}

/**
 * Generates early warning alerts for specific crime patterns
 * @param {Array} crimeIncidents - Recent crime incidents
 * @param {Array} offenderProfiles - Offender profiles
 */
function generateEarlyWarningAlerts(crimeIncidents, offenderProfiles) {
	const alerts = [];
	const now = new Date();

	// Alert 1: Repeat offenders showing escalation
	offenderProfiles.forEach(offender => {
		if (offender.repeat_offender === 'yes' && offender.crime_history) {
			const recentCrimes = offender.crime_history.filter(crime => {
				const crimeDate = new Date(crime.date);
				const daysSince = (now - crimeDate) / (1000 * 60 * 60 * 24);
				return daysSince < 90; // Last 90 days
			});

			if (recentCrimes.length >= 2) {
				alerts.push({
					alert_id: `alert_repeat_${offender.offender_id}`,
					alert_type: 'REPEAT_OFFENDER_ESCALATION',
					severity: 'HIGH',
					offender_name: offender.name,
					offender_id: offender.offender_id,
					recent_crime_count: recentCrimes.length,
					message: `${offender.name}: ${recentCrimes.length} crimes in last 90 days. Pattern of escalation detected.`,
					recommended_action: 'Prioritize for arrest and prosecution'
				});
			}
		}
	});

	// Alert 2: Gang activity spike
	const gangActivity = {};
	offenderProfiles.forEach(offender => {
		if (offender.associated_gang && offender.crime_history) {
			const gang = offender.associated_gang;
			if (!gangActivity[gang]) {
				gangActivity[gang] = { count: 0, offenders: [] };
			}
			gangActivity[gang].count += offender.crime_history.length;
			gangActivity[gang].offenders.push(offender.name);
		}
	});

	Object.entries(gangActivity).forEach(([gang, data]) => {
		if (data.count > 5) {
			alerts.push({
				alert_id: `alert_gang_${gang}`,
				alert_type: 'GANG_ACTIVITY_SURGE',
				severity: data.count > 10 ? 'CRITICAL' : 'HIGH',
				gang_name: gang,
				active_members: data.offenders.length,
				total_recent_crimes: data.count,
				message: `Gang activity surge: ${gang} with ${data.count} recent crimes by ${data.offenders.length} members`,
				recommended_action: 'Task force coordination and community intervention'
			});
		}
	});

	// Alert 3: Organized crime signature detection
	const organizedCrimeSignatures = ['homicide', 'organized_crime', 'human_trafficking', 'drug_distribution'];
	const lastWeekCrimes = crimeIncidents.filter(crime => {
		const crimeDate = new Date(crime.date_of_incident);
		const daysSince = (now - crimeDate) / (1000 * 60 * 60 * 24);
		return daysSince < 7;
	});

	const organizedCrimeCount = lastWeekCrimes.filter(crime =>
		organizedCrimeSignatures.includes(crime.crime_type?.toLowerCase())
	).length;

	if (organizedCrimeCount >= 2) {
		alerts.push({
			alert_id: `alert_organized_${Date.now()}`,
			alert_type: 'ORGANIZED_CRIME_SIGNATURE',
			severity: 'CRITICAL',
			crime_count: organizedCrimeCount,
			timeframe: 'last 7 days',
			message: `${organizedCrimeCount} organized crime incidents detected in last 7 days`,
			recommended_action: 'Activate specialized organized crime task force'
		});
	}

	return {
		alert_count: alerts.length,
		critical_alerts: alerts.filter(a => a.severity === 'CRITICAL').length,
		high_alerts: alerts.filter(a => a.severity === 'HIGH').length,
		alerts: alerts.sort((a, b) => {
			const severityMap = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
			return severityMap[b.severity] - severityMap[a.severity];
		})
	};
}

/**
 * Predicts potential crime hotspots
 * @param {Array} crimeIncidents - Crime incidents
 * @param {Array} geographicData - Geographic and demographic data
 */
function predictCrimeHotspots(crimeIncidents, geographicData = []) {
	const predictions = {
		prediction_date: new Date().toISOString(),
		predicted_hotspots: [],
		confidence_threshold: 0.7
	};

	// Analyze spatial clustering
	const locationDensity = {};
	crimeIncidents.forEach(crime => {
		const location = crime.location;
		if (!locationDensity[location]) {
			locationDensity[location] = {
				location,
				crime_count: 0,
				latitude: crime.latitude,
				longitude: crime.longitude,
				crime_types: {}
			};
		}
		locationDensity[location].crime_count++;
		locationDensity[location].crime_types[crime.crime_type] = 
			(locationDensity[location].crime_types[crime.crime_type] || 0) + 1;
	});

	// Identify predicted hotspots
	Object.values(locationDensity).forEach(location => {
		const density = location.crime_count / crimeIncidents.length;

		if (density > 0.05) { // >5% of crimes in one location
			predictions.predicted_hotspots.push({
				location: location.location,
				predicted_crime_count: Math.ceil(location.crime_count * 1.2), // 20% increase forecast
				current_density: density,
				confidence: Math.min(density * 100, 99),
				dominant_crime_type: Object.entries(location.crime_types).sort((a, b) => b[1] - a[1])[0]?.[0],
				coordinates: location.latitude && location.longitude 
					? `${location.latitude}, ${location.longitude}`
					: 'Not available',
				risk_classification: density > 0.1 ? 'ULTRA_HIGH' : density > 0.075 ? 'HIGH' : 'MEDIUM'
			});
		}
	});

	predictions.predicted_hotspots.sort((a, b) => b.confidence - a.confidence);

	return predictions;
}

module.exports = {
	forecastEmergingCrimes,
	generateEarlyWarningAlerts,
	predictCrimeHotspots
};
