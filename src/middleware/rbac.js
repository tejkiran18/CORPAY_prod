const { ForbiddenError } = require('../lib/errors')

function requirePermission(...codes) {
  return function check(ctx) {
    if (!ctx.permissions || codes.some(c => !ctx.permissions.has(c))) {
      throw new ForbiddenError(`Missing permission: ${codes.join(', ')}`)
    }
  }
}

function requireRole(...roleNames) {
  return function check(ctx) {
    const r = ctx.employee?.role?.name
    if (!r || !roleNames.includes(r)) throw new ForbiddenError(`Requires role: ${roleNames.join(' or ')}`)
  }
}

module.exports = { requirePermission, requireRole }
