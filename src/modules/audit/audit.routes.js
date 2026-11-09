const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { parse, envelope } = require('../../lib/pagination')
const audit = require('./audit.service')

module.exports = [
  ['GET', 'audit', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('AUDIT:READ')(ctx)
    const p = parse(ctx.query)
    const { rows, total } = await audit.list(ctx, { ...p, entity: ctx.query.entity, entityId: ctx.query.entityId, action: ctx.query.action })
    return ok(...Object.values(envelope(rows, total, p)))
  }]
]
