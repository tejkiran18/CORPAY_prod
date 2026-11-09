const { z } = require('zod')
const { prisma } = require('../../db/client')
const { ok, created } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')
const { validate } = require('../../middleware/validate')
const { NotFoundError } = require('../../lib/errors')
const audit = require('../audit/audit.service')
const svc = require('./spending-rights.service')

const CreateSchema = z.object({
  employeeId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
  businessEventId: z.string().uuid().optional().nullable(),
  policyId: z.string().uuid().optional().nullable(),
  approvalWorkflowId: z.string().uuid().optional().nullable(),
  allocatedAmount: z.number().positive(),
  currencyCode: z.string().length(3).default('INR'),
  validityStart: z.coerce.date(),
  validityEnd: z.coerce.date(),
  singleTransactionLimit: z.number().positive().optional().nullable(),
  dailyLimit: z.number().positive().optional().nullable(),
  weeklyLimit: z.number().positive().optional().nullable(),
  monthlyLimit: z.number().positive().optional().nullable(),
  riskLevel: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('LOW'),
})

module.exports = [
  ['GET', 'spending-rights', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('SPEND_RIGHT:READ')(ctx)
    const where = withTenant(ctx)
    if (ctx.query.employeeId) where.employeeId = ctx.query.employeeId
    if (ctx.query.status) where.status = ctx.query.status
    const rows = await prisma.spendingRight.findMany({
      where,
      include: { employee: { select: { id: true, name: true } }, project: { select: { name: true, code: true } }, costCenter: { select: { code: true } }, businessEvent: { select: { name: true } }, categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return ok(rows)
  }],
  ['GET', 'spending-rights/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('SPEND_RIGHT:READ')(ctx)
    const row = await prisma.spendingRight.findFirst({ where: { id: ctx.params.id, organizationId: ctx.orgId }, include: { employee: true, project: true, costCenter: true, businessEvent: true, policy: { include: { rules: true } }, categories: { include: { category: true } } } })
    if (!row) throw new NotFoundError('SpendingRight')
    return ok(row)
  }],
  ['POST', 'spending-rights', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('SPEND_RIGHT:WRITE')(ctx)
    const body = validate(CreateSchema, await req.json())
    const row = await prisma.spendingRight.create({ data: { organizationId: ctx.orgId, ...body } })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'CREATE', entity: 'SPENDING_RIGHT', entityId: row.id, after: row })
    return created(row)
  }],
  ['GET', 'spending-rights/:id/velocity', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('SPEND_RIGHT:READ')(ctx)
    const row = await prisma.spendingRight.findFirst({ where: { id: ctx.params.id, organizationId: ctx.orgId } })
    if (!row) throw new NotFoundError('SpendingRight')
    return ok(await svc.velocityFor(row.id, row.employeeId))
  }],
]
