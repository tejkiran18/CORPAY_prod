const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')

module.exports = [
  ['GET', 'projects', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('ORG:READ')(ctx)
    const rows = await prisma.project.findMany({ where: withTenant(ctx), include: { type: true }, orderBy: { name: 'asc' } })
    return ok(rows)
  }],
  ['GET', 'projects/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('ORG:READ')(ctx)
    const p = await prisma.project.findFirst({ where: { id: ctx.params.id, organizationId: ctx.orgId }, include: { type: true, employees: { select: { id: true, name: true, designation: true } } } })
    return ok(p)
  }],
  ['GET', 'project-types', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    return ok(await prisma.projectType.findMany({ orderBy: { name: 'asc' } }))
  }],
]
