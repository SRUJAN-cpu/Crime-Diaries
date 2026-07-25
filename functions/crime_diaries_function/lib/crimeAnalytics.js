'use strict';

/**
 * Phase 2: Crime Pattern & Trend Analysis
 * Analyzes crime patterns by time, geography, crime type, and modus operandi
 */

/**
 * Aggregates crime incidents by various dimensions
 * @param {Array} crimeIncidents - Array of crime incident records
 * @param {string} dimension - 'time' | 'geography' | 'crime_type' | 'modus_operandi' | 'status'
 */
function aggregateCrimesByDimension(crimeIncidents, dimension) {
	const aggregation = {};

	crimeIncidents.forEach(crime => {
		let key = '';

		switch (dimension) {
			case 'time':
				// Extract date from ISO string
				key = crime.date_of_incident ? crime.date_of_incident.split('T')[0] : 'unknown';
				break;
			case 'geography':
				key = crime.location || 'unknown';
				break;
			case 'crime_type':
				key = crime.crime_type || 'unknown';
				break;
			case 'modus_operandi':
				key = crime.modus_operandi || 'unknown';
				break;
			case 'status':
				key = crime.investigation_status || 'unknown';
				break;
			default:
				key = 'unknown';
		}

		if (!aggregation[key]) {
			aggregation[key] = {
				dimension_value: key,
				count: 0,
				crimes: []
			};
		}

		aggregation[key].count += 1;
		aggregation[key].crimes.push(crime.crime_id);
	});

	return Object.values(aggregation).sort((a, b) => b.count - a.count);
}

/**
 * Identifies crime hotspots (geographic areas with high crime concentration)
 * @param {Array} crimeIncidents - Array of crime incident records
 */
function identifyHotspots(crimeIncidents) {
	const locationStats = {};

	crimeIncidents.forEach(crime => {
		const location = crime.location || 'unknown';

		if (!locationStats[location]) {
			locationStats[location] = {
				location,
				crime_count: 0,
				crime_types: {},
				latitude: crime.latitude,
				longitude: crime.longitude,
				recent_crimes: []
			};
		}

		locationStats[location].crime_count += 1;

		const crimeType = crime.crime_type || 'unknown';
		locationStats[location].crime_types[crimeType] = (locationStats[location].crime_types[crimeType] || 0) + 1;

		locationStats[location].recent_crimes.push({
			crime_id: crime.crime_id,
			date: crime.date_of_incident,
			type: crimeType
		});
	});

	// Sort by crime count to identify hotspots
	return Object.values(locationStats)
		.map(loc => ({
			...loc,
			hotspot_level: loc.crime_count > 5 ? 'critical' : loc.crime_count > 3 ? 'high' : 'moderate',
			dominant_crime_type: Object.entries(loc.crime_types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
		}))
		.sort((a, b) => b.crime_count - a.crime_count);
}

/**
 * Analyzes temporal trends (seasonal, weekly, daily patterns)
 * @param {Array} crimeIncidents - Array of crime incident records
 */
function analyzeTemporalTrends(crimeIncidents) {
	const temporal = {
		by_date: {},
		by_month: {},
		by_day_of_week: {},
		total_crimes: crimeIncidents.length,
		date_range: {}
	};

	crimeIncidents.forEach(crime => {
		if (!crime.date_of_incident) return;

		const date = new Date(crime.date_of_incident);
		const dateStr = crime.date_of_incident.split('T')[0];
		const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

		temporal.by_date[dateStr] = (temporal.by_date[dateStr] || 0) + 1;
		temporal.by_month[month] = (temporal.by_month[month] || 0) + 1;
		temporal.by_day_of_week[dayOfWeek] = (temporal.by_day_of_week[dayOfWeek] || 0) + 1;

		if (!temporal.date_range.earliest || dateStr < temporal.date_range.earliest) {
			temporal.date_range.earliest = dateStr;
		}
		if (!temporal.date_range.latest || dateStr > temporal.date_range.latest) {
			temporal.date_range.latest = dateStr;
		}
	});

	// Find peak day of week
	temporal.peak_day_of_week = Object.entries(temporal.by_day_of_week).sort((a, b) => b[1] - a[1])[0]?.[0];
	temporal.peak_month = Object.entries(temporal.by_month).sort((a, b) => b[1] - a[1])[0]?.[0];

	return temporal;
}

/**
 * Detects emerging crime clusters (new patterns)
 * @param {Array} crimeIncidents - Array of crime incident records
 */
function detectEmergingClusters(crimeIncidents) {
	const modusClusters = {};

	crimeIncidents.forEach(crime => {
		const modus = crime.modus_operandi || 'unknown';
		const location = crime.location || 'unknown';

		const clusterId = `${modus}_${location}`;

		if (!modusClusters[clusterId]) {
			modusClusters[clusterId] = {
				cluster_id: clusterId,
				modus_operandi: modus,
				location,
				crime_count: 0,
				crimes: [],
				emergence_score: 0
			};
		}

		modusClusters[clusterId].crime_count += 1;
		modusClusters[clusterId].crimes.push(crime.crime_id);
	});

	// Calculate emergence score based on frequency and recency
	return Object.values(modusClusters)
		.map(cluster => ({
			...cluster,
			emergence_score: cluster.crime_count * 10, // Weighted by frequency
			alert_level: cluster.crime_count > 3 ? 'alert' : 'monitor'
		}))
		.sort((a, b) => b.emergence_score - a.emergence_score);
}

module.exports = {
	aggregateCrimesByDimension,
	identifyHotspots,
	analyzeTemporalTrends,
	detectEmergingClusters
};
