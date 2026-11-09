const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { withTenant } = require('../../middleware/tenant')

module.exports = [
  ['GET', 'business-events', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    const rows = await prisma.businessEvent.findMany({
      where: withTenant(ctx),
      include: { owner: { select: { id: true, name: true } }, project: { select: { name: true } }, trip: { include: { originCity: true, destinationCity: true } } },
      orderBy: { startDate: 'desc' }
    })
    return ok(rows)
  }],
  ['GET', 'business-events/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    const e = await prisma.businessEvent.findFirst({
      where: { id: ctx.params.id, organizationId: ctx.orgId },
      include: { owner: true, project: true, trip: { include: { originCity: true, destinationCity: true } }, transactions: { orderBy: { occurredAt: 'desc' }, take: 20 } }
    })
    return ok(e)
  }],
]
