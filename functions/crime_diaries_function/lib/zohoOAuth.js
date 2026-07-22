'use strict';

const config = require('./config');

// In-memory cache, shared across invocations within the same warm container.
// Cold starts just refresh again — cheap compared to failing every request
// once an hour.
let cachedToken = null;
let cachedExpiresAt = 0;
let inFlightRefresh = null;

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} environment variable is not set`);
	}
	return value;
}

async function refreshAccessToken() {
	const clientId = requireEnv(config.zoho.clientIdEnvVar);
	const clientSecret = requireEnv(config.zoho.clientSecretEnvVar);
	const refreshToken = requireEnv(config.zoho.refreshTokenEnvVar);

	const params = new URLSearchParams({
		grant_type: 'refresh_token',
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: refreshToken
	});

	const response = await fetch(`${config.zoho.tokenUrl}?${params.toString()}`, {
		method: 'POST'
	});

	const data = await response.json();
	if (!response.ok || !data.access_token) {
		throw new Error(`Zoho OAuth token refresh failed: ${data.error || response.status}`);
	}

	cachedToken = data.access_token;
	cachedExpiresAt = Date.now() + (data.expires_in - config.zoho.expiryBufferSeconds) * 1000;
	return cachedToken;
}

/**
 * Returns a valid Zoho OAuth access token, transparently refreshing it via
 * the stored refresh token whenever the cached one is missing or close to
 * expiring. Concurrent callers during a refresh share the same in-flight
 * request instead of hitting Zoho's token endpoint multiple times at once.
 * @returns {Promise<string>}
 */
async function getAccessToken() {
	if (cachedToken && Date.now() < cachedExpiresAt) {
		return cachedToken;
	}

	if (!inFlightRefresh) {
		inFlightRefresh = refreshAccessToken().finally(() => {
			inFlightRefresh = null;
		});
	}
	return inFlightRefresh;
}

module.exports = { getAccessToken };
