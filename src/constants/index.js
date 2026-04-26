/**
 * Central re-export of all constant modules.
 * Usage: const { ROLES, ERROR_CODES, ISSUE_EVENTS } = require('../constants')
 */
module.exports = {
  ...require('./events'),
  ...require('./errors'),
  ...require('./roles'),
  ...require('./issue'),
  ...require('./notification'),
  ...require('./workflow'),
  ...require('./cache')
}
