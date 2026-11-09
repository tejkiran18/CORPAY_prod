const { ForbiddenError } = require('../lib/errors')

// Wraps a Prisma where clause with the tenant filter. Called by every service.
function withTenant(ctx, where = {}) {
  if (!ctx.orgId) throw new ForbiddenError('Missing tenant context')
  return { ...where, organizationId: ctx.orgId }
}

// Assert that a resource fetched by id belongs to the current tenant.
function assertSameTenant(ctx, row, entity = 'Resource') {
  if (!row) return
  if (row.organizationId && row.organizationId !== ctx.orgId) {
    throw new ForbiddenError(`${entity} does not belong to your organization`)
  }
}

module.exports = { withTenant, assertSameTenant }
