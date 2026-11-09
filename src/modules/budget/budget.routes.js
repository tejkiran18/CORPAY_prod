const { z } = require('zod')
const { prisma } = require('../../db/client')
const { ok, created } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')
const { validate } = require('../../middleware/validate')
const audit = require('../audit/audit.service')

const CreateSchema = z.object({
  name: z.string().min(2).max(160),
  type: z.enum(['TRAVEL','PROJECT','DEPARTMENT','EMPLOYEE','EVENT','MISC']),
  amount: z.number().positive(),
  currencyCode: z.string().length(3).default('INR'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  categoryId: z.string().uuid().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  businessEventId: z.string().uuid().optional().nullable(),
  approvalRequired: z.boolean().default(false),
  breakdown: z.any().optional().nullable(),
})

module.exports = [
  ['GET', 'budgets', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('BUDGET:READ')(ctx)
    const where = withTenant(ctx)
    if (ctx.query.type) where.type = ctx.query.type
    if (ctx.query.status) where.status = ctx.query.status
    const rows = await prisma.budget.findMany({
      where,
      include: { project: { select: { id: true, name: true, code: true } }, employee: { select: { id: true, name: true } }, costCenter: { select: { code: true } }, category: true },
      orderBy: { createdAt: 'desc' }
    })
    return ok(rows)
  }],
  ['GET', 'budgets/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('BUDGET:READ')(ctx)
    const b = await prisma.budget.findFirst({
      where: { id: ctx.params.id, organizationId: ctx.orgId },
      include: { project: true, employee: true, costCenter: true, category: true, transactions: { orderBy: { occurredAt: 'desc' }, take: 20 } }
    })
    return ok(b)
  }],
  ['POST', 'budgets', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('BUDGET:CREATE')(ctx)
    const body = validate(CreateSchema, await req.json())
    const row = await prisma.budget.create({ data: { organizationId: ctx.orgId, ...body } })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'CREATE', entity: 'BUDGET', entityId: row.id, after: row })
    return created(row)
  }],
  ['PUT', 'budgets/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('BUDGET:UPDATE')(ctx)
    const before = await prisma.budget.findFirst({ where: { id: ctx.params.id, organizationId: ctx.orgId } })
    if (!before) return ok(null)
    const body = validate(CreateSchema.partial(), await req.json())
    const row = await prisma.budget.update({ where: { id: before.id }, data: body })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'UPDATE', entity: 'BUDGET', entityId: row.id, before, after: row })
    return ok(row)
  }],
  ['DELETE', 'budgets/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('BUDGET:DELETE')(ctx)
    const before = await prisma.budget.findFirst({ where: { id: ctx.params.id, organizationId: ctx.orgId } })
    if (!before) return ok({ deleted: false })
    await prisma.budget.delete({ where: { id: before.id } })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'DELETE', entity: 'BUDGET', entityId: before.id, before })
    return ok({ deleted: true })
  }],
  ['GET', 'budget-categories', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('BUDGET:READ')(ctx)
    return ok(await prisma.budgetCategory.findMany({ where: withTenant(ctx), orderBy: { name: 'asc' } }))
  }],
]
