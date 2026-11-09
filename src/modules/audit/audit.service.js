const { prisma } = require('../../db/client')

// Fire-and-forget writer. Never throws to the caller.
async function log({ orgId, actorEmployeeId = null, action, entity, entityId = null, before = null, after = null, ip = null, ua = null }) {
  try {
    await prisma.auditLog.create({
      data: { organizationId: orgId, actorEmployeeId, action, entity, entityId, before, after, ipAddress: ip, userAgent: ua }
    })
  } catch (e) {
    // Swallow — audit MUST never break the primary write path.
  }
}

async function list(ctx, { page = 1, limit = 50, entity, entityId, action }) {
  const where = { organizationId: ctx.orgId }
  if (entity) where.entity = entity
  if (entityId) where.entityId = entityId
  if (action) where.action = action
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where })
  ])
  return { rows, total }
}

module.exports = { log, list }
