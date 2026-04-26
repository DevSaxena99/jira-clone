/**
 * Project member role constants.
 */

const ROLES = {
  OWNER:  'owner',
  ADMIN:  'admin',
  MEMBER: 'member'
}

/** Roles allowed to perform admin-level actions (add members, update project) */
const ADMIN_ROLES = [ROLES.OWNER, ROLES.ADMIN]

module.exports = { ROLES, ADMIN_ROLES }
