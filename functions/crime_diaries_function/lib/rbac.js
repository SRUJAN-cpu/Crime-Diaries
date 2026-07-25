'use strict';

/**
 * Role-Based Access Control for Crime Diaries
 * Roles: supervisor, investigator, analyst, policymaker
 */

const ROLES = {
	SUPERVISOR: 'supervisor',        // Full access, can manage users
	INVESTIGATOR: 'investigator',    // Can create/read/modify cases
	ANALYST: 'analyst',              // Can read and analyze data
	POLICYMAKER: 'policymaker'       // Read-only access to reports
};

const ROLE_PERMISSIONS = {
	[ROLES.SUPERVISOR]: {
		createCase: true,
		readCase: true,
		updateCase: true,
		deleteCase: true,
		createRelationship: true,
		readRelationship: true,
		updateRelationship: true,
		deleteRelationship: true,
		viewAnalytics: true,
		manageUsers: true,
		viewAudit: true
	},
	[ROLES.INVESTIGATOR]: {
		createCase: true,
		readCase: true,
		updateCase: true,
		deleteCase: true,
		createRelationship: true,
		readRelationship: true,
		updateRelationship: true,
		deleteRelationship: false,
		viewAnalytics: true,
		manageUsers: false,
		viewAudit: true
	},
	[ROLES.ANALYST]: {
		createCase: false,
		readCase: true,
		updateCase: false,
		deleteCase: false,
		createRelationship: false,
		readRelationship: true,
		updateRelationship: false,
		deleteRelationship: false,
		viewAnalytics: true,
		manageUsers: false,
		viewAudit: true
	},
	[ROLES.POLICYMAKER]: {
		createCase: false,
		readCase: true,
		updateCase: false,
		deleteCase: false,
		createRelationship: false,
		readRelationship: true,
		updateRelationship: false,
		deleteRelationship: false,
		viewAnalytics: true,
		manageUsers: false,
		viewAudit: false
	}
};

const DEFAULT_ROLE = ROLES.INVESTIGATOR;

/**
 * Middleware to extract user role from Catalyst user
 * @param {import('zcatalyst-sdk-node/lib/catalyst-app').CatalystApp} catalystApp
 * @param {import('zcatalyst-sdk-node/lib/utils/pojo/common').ICatalystUser} catalystUser
 * @returns {string} user role
 */
async function getUserRole(catalystApp, catalystUser) {
	try {
		// Try to fetch user profile with role from user table
		const userTable = await catalystApp.nosql().table('user');
		const { NoSQLItem } = require('zcatalyst-sdk-node/lib/no-sql');
		const key = NoSQLItem.from({ catalyst_user_id: catalystUser.user_id });
		const result = await userTable.fetchItem({ keys: [key] });
		const user = result?.get?.[0]?.item?.to?.();
		
		if (user?.role && ROLE_PERMISSIONS[user.role]) {
			return user.role;
		}
	} catch (err) {
		console.warn('Could not fetch user role from DB:', err.message);
	}
	
	// Default role if not found
	return DEFAULT_ROLE;
}

/**
 * Check if user has permission for an action
 * @param {string} userRole
 * @param {string} permission
 * @returns {boolean}
 */
function hasPermission(userRole, permission) {
	const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[DEFAULT_ROLE];
	return permissions[permission] === true;
}

/**
 * Middleware to enforce permission check
 * @param {string} permission - permission name to check
 * @returns {Function} express middleware
 */
function requirePermission(permission) {
	return async (req, res, next) => {
		try {
			const catalyst = require('zcatalyst-sdk-node');
			const catalystApp = catalyst.initialize(req);
			const catalystUser = await catalystApp.userManagement().getCurrentUser();
			const userRole = await getUserRole(catalystApp, catalystUser);

			req.userRole = userRole;
			req.catalystUser = catalystUser;

			if (!hasPermission(userRole, permission)) {
				return res.status(403).json({
					error: 'Forbidden',
					message: `Role '${userRole}' does not have permission: ${permission}`
				});
			}

			next();
		} catch (err) {
			console.error('Permission check failed:', err.message);
			res.status(401).json({ error: 'Authentication failed' });
		}
	};
}

module.exports = {
	ROLES,
	ROLE_PERMISSIONS,
	DEFAULT_ROLE,
	getUserRole,
	hasPermission,
	requirePermission
};
