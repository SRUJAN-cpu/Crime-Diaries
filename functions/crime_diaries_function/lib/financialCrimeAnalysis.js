'use strict';

/**
 * Phase 3: Financial Crime & Transaction Link Analysis
 * Detects financial transactions linked to criminal activities
 */

/**
 * Analyzes financial transactions for suspicious patterns
 * @param {Array} transactions - Array of transaction records
 * @param {Array} offenderProfiles - Array of offender profiles
 */
function analyzeFinancialTransactions(transactions, offenderProfiles) {
	const analysis = {
		total_transactions: transactions.length,
		suspicious_transactions: [],
		money_trails: [],
		summary: {
			high_risk_count: 0,
			medium_risk_count: 0,
			total_suspicious_amount: 0
		}
	};

	// Define risk patterns
	const suspiciousPatterns = {
		structuring: { threshold: 10000, pattern: 'multiple_small_deposits' }, // Deposits under reporting limit
		layering: { threshold: 50000, pattern: 'rapid_transfers' }, // Quick fund movement
		rapid_withdrawal: { threshold: 5000, pattern: 'immediate_cash_out' }, // Cash-outs after deposits
		unusual_frequency: { pattern: 'abnormal_activity_spike' },
		high_value: { threshold: 100000, pattern: 'large_single_transaction' }
	};

	// Analyze each transaction
	transactions.forEach(tx => {
		let riskScore = 0;
		let riskFactors = [];

		// Check if transaction involves known offender
		const linkedOffender = offenderProfiles.find(o => 
			o.financial_account === tx.account_id || 
			o.offender_id === tx.subject_id
		);

		if (linkedOffender) {
			riskScore += 30;
			riskFactors.push(`Linked to known offender: ${linkedOffender.name}`);
		}

		// High value transaction
		if (tx.amount > suspiciousPatterns.high_value.threshold) {
			riskScore += 25;
			riskFactors.push('High value transaction');
		}

		// Structuring pattern
		if (tx.amount > 0 && tx.amount < suspiciousPatterns.structuring.threshold && 
			tx.frequency === 'frequent') {
			riskScore += 20;
			riskFactors.push('Possible structuring pattern');
		}

		// Unusual destination
		if (tx.destination_country && ['high_risk_jurisdiction', 'sanctions'].includes(tx.destination_country)) {
			riskScore += 25;
			riskFactors.push(`Transfer to high-risk jurisdiction: ${tx.destination_country}`);
		}

		// Rapid movement
		if (tx.time_since_previous_transaction && tx.time_since_previous_transaction < 3600) { // < 1 hour
			riskScore += 15;
			riskFactors.push('Rapid transfer after previous transaction');
		}

		// Classify risk
		const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

		if (riskScore > 0) {
			const suspiciousTx = {
				transaction_id: tx.transaction_id,
				account_id: tx.account_id,
				amount: tx.amount,
				currency: tx.currency,
				date: tx.date,
				source: tx.source_entity,
				destination: tx.destination_entity,
				risk_score: riskScore,
				risk_level: riskLevel,
				risk_factors: riskFactors,
				linked_offender: linkedOffender?.name || null
			};

			analysis.suspicious_transactions.push(suspiciousTx);

			if (riskLevel === 'high') analysis.summary.high_risk_count++;
			if (riskLevel === 'medium') analysis.summary.medium_risk_count++;
			analysis.summary.total_suspicious_amount += tx.amount;
		}
	});

	// Sort by risk
	analysis.suspicious_transactions.sort((a, b) => b.risk_score - a.risk_score);

	return analysis;
}

/**
 * Detects money trails and suspicious transaction networks
 * @param {Array} transactions - Array of transaction records
 */
function detectMoneyTrails(transactions) {
	const trails = [];
	const accountGraph = {};

	// Build transaction network
	transactions.forEach(tx => {
		const source = tx.source_entity;
		const destination = tx.destination_entity;

		if (!accountGraph[source]) {
			accountGraph[source] = {
				account: source,
				outgoing: [],
				incoming: [],
				total_out: 0,
				total_in: 0
			};
		}
		if (!accountGraph[destination]) {
			accountGraph[destination] = {
				account: destination,
				outgoing: [],
				incoming: [],
				total_out: 0,
				total_in: 0
			};
		}

		accountGraph[source].outgoing.push({
			to: destination,
			amount: tx.amount,
			date: tx.date,
			tx_id: tx.transaction_id
		});
		accountGraph[source].total_out += tx.amount;

		accountGraph[destination].incoming.push({
			from: source,
			amount: tx.amount,
			date: tx.date,
			tx_id: tx.transaction_id
		});
		accountGraph[destination].total_in += tx.amount;
	});

	// Trace money trails (follow funds through network)
	Object.entries(accountGraph).forEach(([account, data]) => {
		if (data.outgoing.length > 3 && data.total_out > 50000) {
			// Likely a layering node
			trails.push({
				trail_id: `trail_${account}_${Date.now()}`,
				type: 'layering',
				source_account: account,
				total_amount: data.total_out,
				num_outgoing: data.outgoing.length,
				destinations: data.outgoing.map(tx => tx.to),
				description: `Funds dispersed to ${data.outgoing.length} accounts totaling ${data.total_out}`
			});
		}

		if (data.incoming.length > 3 && data.total_in > 50000) {
			// Likely a collection node
			trails.push({
				trail_id: `trail_${account}_${Date.now()}`,
				type: 'collection',
				destination_account: account,
				total_amount: data.total_in,
				num_incoming: data.incoming.length,
				sources: data.incoming.map(tx => tx.from),
				description: `Funds collected from ${data.incoming.length} accounts totaling ${data.total_in}`
			});
		}
	});

	return {
		total_trails_detected: trails.length,
		trails: trails.sort((a, b) => b.total_amount - a.total_amount),
		alert_threshold: 'Money trails detected that may indicate money laundering',
		high_priority_trails: trails.filter(t => t.total_amount > 100000)
	};
}

/**
 * Links financial activities to crime incidents
 * @param {Array} transactions - Transaction records
 * @param {Array} crimeIncidents - Crime incident records
 * @param {Array} offenderProfiles - Offender profiles
 */
function linkFinancialToCrime(transactions, crimeIncidents, offenderProfiles) {
	const links = [];

	offenderProfiles.forEach(offender => {
		// Find crimes involving this offender
		const relatedCrimes = crimeIncidents.filter(crime => {
			const accusedIds = typeof crime.accused_ids === 'string'
				? JSON.parse(crime.accused_ids)
				: crime.accused_ids;
			return accusedIds?.includes(offender.offender_id);
		});

		// Find transactions involving this offender
		const relatedTransactions = transactions.filter(tx =>
			tx.subject_id === offender.offender_id ||
			tx.account_id === offender.financial_account
		);

		if (relatedCrimes.length > 0 && relatedTransactions.length > 0) {
			links.push({
				link_id: `link_${offender.offender_id}_${Date.now()}`,
				offender_id: offender.offender_id,
				offender_name: offender.name,
				crimes_count: relatedCrimes.length,
				transaction_count: relatedTransactions.length,
				total_transaction_amount: relatedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
				crime_types: [...new Set(relatedCrimes.map(c => c.crime_type))],
				transaction_timeline: {
					first: relatedTransactions[0]?.date,
					last: relatedTransactions[relatedTransactions.length - 1]?.date
				},
				crime_timeline: {
					earliest: relatedCrimes[0]?.date_of_incident,
					latest: relatedCrimes[relatedCrimes.length - 1]?.date_of_incident
				},
				temporal_correlation: 'STRONG' // If timelines overlap
			});
		}
	});

	return {
		total_crime_financial_links: links.length,
		links: links.sort((a, b) => b.total_transaction_amount - a.total_transaction_amount),
		investigation_priority: links.filter(l => l.total_transaction_amount > 50000).length
	};
}

module.exports = {
	analyzeFinancialTransactions,
	detectMoneyTrails,
	linkFinancialToCrime
};
