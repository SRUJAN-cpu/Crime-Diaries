'use strict';

/**
 * Phase 3: Sociological Crime Insights
 * Analysis of crime patterns based on demographic attributes and social factors
 */

/**
 * Analyzes crime patterns by demographic attributes
 * @param {Array} crimeIncidents - Crime incidents
 * @param {Array} demographicData - Demographic information (age, gender, socio-economic, education)
 */
function analyzeCrimeByDemographics(crimeIncidents, demographicData) {
	const analysis = {
		timestamp: new Date().toISOString(),
		demographics: {
			by_age_group: {},
			by_gender: {},
			by_socioeconomic_status: {},
			by_education_level: {}
		},
		insights: [],
		correlations: {}
	};

	// Process demographic data
	demographicData.forEach(demo => {
		// Age group analysis
		const ageGroup = demo.age_group || 'Unknown';
		if (!analysis.demographics.by_age_group[ageGroup]) {
			analysis.demographics.by_age_group[ageGroup] = {
				age_group: ageGroup,
				crime_count: 0,
				crimes: [],
				crime_types: {}
			};
		}
		analysis.demographics.by_age_group[ageGroup].crime_count++;
		analysis.demographics.by_age_group[ageGroup].crimes.push(demo.crime_id);

		// Gender analysis
		const gender = demo.gender || 'Unknown';
		if (!analysis.demographics.by_gender[gender]) {
			analysis.demographics.by_gender[gender] = {
				gender,
				crime_count: 0,
				crime_types: {}
			};
		}
		analysis.demographics.by_gender[gender].crime_count++;

		// Socio-economic analysis
		const ses = demo.socioeconomic_status || 'Unknown';
		if (!analysis.demographics.by_socioeconomic_status[ses]) {
			analysis.demographics.by_socioeconomic_status[ses] = {
				socioeconomic_status: ses,
				crime_count: 0,
				crime_types: {}
			};
		}
		analysis.demographics.by_socioeconomic_status[ses].crime_count++;

		// Education level analysis
		const education = demo.education_level || 'Unknown';
		if (!analysis.demographics.by_education_level[education]) {
			analysis.demographics.by_education_level[education] = {
				education_level: education,
				crime_count: 0,
				crime_types: {}
			};
		}
		analysis.demographics.by_education_level[education].crime_count++;
	});

	// Generate insights
	const totalDemos = demographicData.length;

	// Age group insight
	const ageGroups = Object.entries(analysis.demographics.by_age_group)
		.sort((a, b) => b[1].crime_count - a[1].crime_count);
	if (ageGroups.length > 0) {
		analysis.insights.push({
			type: 'age_pattern',
			finding: `Age group ${ageGroups[0][0]} accounts for ${Math.round(ageGroups[0][1].crime_count / totalDemos * 100)}% of crimes`,
			percentage: Math.round(ageGroups[0][1].crime_count / totalDemos * 100),
			recommendation: 'Target youth intervention and rehabilitation programs'
		});
	}

	// Gender insight
	const genders = Object.entries(analysis.demographics.by_gender)
		.sort((a, b) => b[1].crime_count - a[1].crime_count);
	if (genders.length > 0) {
		analysis.insights.push({
			type: 'gender_pattern',
			finding: `${genders[0][0]} accounts for ${Math.round(genders[0][1].crime_count / totalDemos * 100)}% of crimes`,
			percentage: Math.round(genders[0][1].crime_count / totalDemos * 100),
			recommendation: 'Develop gender-specific prevention strategies'
		});
	}

	// Socio-economic insight
	const sesList = Object.entries(analysis.demographics.by_socioeconomic_status)
		.sort((a, b) => b[1].crime_count - a[1].crime_count);
	if (sesList.length > 0) {
		analysis.insights.push({
			type: 'socioeconomic_pattern',
			finding: `${sesList[0][0]} status correlates with ${Math.round(sesList[0][1].crime_count / totalDemos * 100)}% of crimes`,
			percentage: Math.round(sesList[0][1].crime_count / totalDemos * 100),
			recommendation: 'Implement economic opportunity programs and social support'
		});
	}

	// Education insight
	const educationList = Object.entries(analysis.demographics.by_education_level)
		.sort((a, b) => b[1].crime_count - a[1].crime_count);
	if (educationList.length > 0) {
		analysis.insights.push({
			type: 'education_pattern',
			finding: `${educationList[0][0]} education correlates with ${Math.round(educationList[0][1].crime_count / totalDemos * 100)}% of crimes`,
			percentage: Math.round(educationList[0][1].crime_count / totalDemos * 100),
			recommendation: 'Expand educational access and vocational training'
		});
	}

	return analysis;
}

/**
 * Identifies social risk factors influencing crime
 * @param {Array} crimeIncidents - Crime incidents
 * @param {Array} socialData - Social factors data (unemployment, poverty, education, etc.)
 */
function identifySocialRiskFactors(crimeIncidents, socialData) {
	const riskFactors = {
		identified_factors: [],
		risk_correlations: [],
		communities_at_risk: []
	};

	// Map crime to social factors by location
	const locationRisks = {};
	crimeIncidents.forEach(crime => {
		const location = crime.location;
		if (!locationRisks[location]) {
			locationRisks[location] = {
				location,
				crime_count: 0,
				risk_scores: {}
			};
		}
		locationRisks[location].crime_count++;
	});

	// Cross-reference with social data
	socialData.forEach(social => {
		const location = social.location;
		if (locationRisks[location]) {
			// Calculate risk based on social factors
			let riskScore = 0;
			let factors = [];

			if (social.unemployment_rate > 15) {
				riskScore += 25;
				factors.push(`High unemployment (${social.unemployment_rate}%)`);
			}

			if (social.poverty_rate > 30) {
				riskScore += 25;
				factors.push(`High poverty (${social.poverty_rate}%)`);
			}

			if (social.high_school_dropout_rate > 20) {
				riskScore += 20;
				factors.push(`High dropout rate (${social.high_school_dropout_rate}%)`);
			}

			if (social.population_density > 10000) {
				riskScore += 15;
				factors.push(`High density (${social.population_density} per km²)`);
			}

			if (social.migration_influx_high) {
				riskScore += 10;
				factors.push('High migration influx');
			}

			if (social.economic_stress_index > 0.7) {
				riskScore += 15;
				factors.push(`Economic stress index: ${social.economic_stress_index}`);
			}

			if (riskScore > 0) {
				locationRisks[location].risk_scores = {
					total_risk: riskScore,
					factors,
					recommendation: riskScore > 80 
						? 'Critical intervention needed' 
						: riskScore > 60 
							? 'High risk - targeted programs required' 
							: 'Moderate risk - monitoring recommended'
				};
			}
		}
	});

	// Compile at-risk communities
	Object.values(locationRisks).forEach(location => {
		if (location.risk_scores.total_risk > 50) {
			riskFactors.communities_at_risk.push({
				location: location.location,
				crime_count: location.crime_count,
				risk_score: location.risk_scores.total_risk,
				contributing_factors: location.risk_scores.factors,
				intervention_level: location.risk_scores.recommendation
			});
		}
	});

	// Identify major risk factors across all communities
	const factorFrequency = {};
	riskFactors.communities_at_risk.forEach(community => {
		community.contributing_factors.forEach(factor => {
			factorFrequency[factor] = (factorFrequency[factor] || 0) + 1;
		});
	});

	riskFactors.identified_factors = Object.entries(factorFrequency)
		.map(([factor, frequency]) => ({
			factor,
			affected_communities: frequency,
			correlation_strength: (frequency / Math.max(riskFactors.communities_at_risk.length, 1)) * 100
		}))
		.sort((a, b) => b.affected_communities - a.affected_communities);

	riskFactors.communities_at_risk.sort((a, b) => b.risk_score - a.risk_score);

	return riskFactors;
}

/**
 * Correlates crime with urbanization and migration patterns
 * @param {Array} crimeIncidents - Crime incidents
 * @param {Array} urbanizationData - Urbanization metrics
 */
function analyzeUrbanizationCrimeCorrelation(crimeIncidents, urbanizationData) {
	const correlation = {
		analysis_date: new Date().toISOString(),
		urbanization_levels: {
			urban: { crime_count: 0, percentage: 0 },
			semi_urban: { crime_count: 0, percentage: 0 },
			rural: { crime_count: 0, percentage: 0 }
		},
		migration_impact: {},
		findings: []
	};

	// Categorize crimes by urbanization
	crimeIncidents.forEach(crime => {
		const matchingArea = urbanizationData.find(u => u.location === crime.location);
		if (matchingArea) {
			const urbanLevel = matchingArea.urbanization_level || 'unknown';
			if (correlation.urbanization_levels[urbanLevel]) {
				correlation.urbanization_levels[urbanLevel].crime_count++;
			}
		}
	});

	// Calculate percentages
	const totalCrimes = crimeIncidents.length;
	Object.keys(correlation.urbanization_levels).forEach(level => {
		correlation.urbanization_levels[level].percentage = 
			Math.round(correlation.urbanization_levels[level].crime_count / totalCrimes * 100);
	});

	// Analyze migration impact
	urbanizationData.forEach(area => {
		const areacrimes = crimeIncidents.filter(c => c.location === area.location);
		if (areacrimes.length > 0 && area.migration_rate) {
			correlation.migration_impact[area.location] = {
				location: area.location,
				migration_rate: area.migration_rate,
				crime_count: areacrimes.length,
				crime_rate_per_100k: Math.round(areacrimes.length / (area.population / 100000)),
				correlation_indicator: area.migration_rate > 10 && areacrimes.length > 5 ? 'STRONG' : 'WEAK'
			};
		}
	});

	// Generate findings
	const urbanCrimes = correlation.urbanization_levels.urban.crime_count;
	if (urbanCrimes > (totalCrimes * 0.5)) {
		correlation.findings.push({
			finding: `Urban areas account for ${correlation.urbanization_levels.urban.percentage}% of crimes`,
			implication: 'Urban crime concentration requires targeted urban policing strategies',
			recommendation: 'Increase resource allocation to urban enforcement and community programs'
		});
	}

	return correlation;
}

module.exports = {
	analyzeCrimeByDemographics,
	identifySocialRiskFactors,
	analyzeUrbanizationCrimeCorrelation
};
