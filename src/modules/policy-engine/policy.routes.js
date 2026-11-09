const { z } = require('zod')
const { prisma } = require('../../db/client')
const { ok, created } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')
const { validate } = require('../../middleware/validate')
const { NotFoundError } = require('../../lib/errors')
const audit = require('../audit/audit.service')
const engine = require('./policy.engine')

const RuleSchema = z.object({
  ruleType: z.enum(['CATEGORY_LIMIT','PER_TRANSACTION_LIMIT','DAILY_LIMIT','WEEKLY_LIMIT','MONTHLY_LIMIT','ALLOWED_CATEGORY','RESTRICTED_CATEGORY','APPROVAL_THRESHOLD','MERCHANT_RULE','GEO_RULE','TIME_RULE','VELOCITY_RULE']),
  field: z.string().max(60),
  operator: z.enum(['EQ','NEQ','GT','GTE','LT','LTE','IN','NOT_IN','CONTAINS','BETWEEN']),
  valueNumeric: z.number().optional().nullable(),
  valueText: z.string().max(160).optional().nullable(),
  valueJson: z.any().optional().nullable(),
  connector: z.enum(['AND','OR','NOT']).default('AND'),
  sortOrder: z.number().int().default(0),
  actionOnViolation: z.enum(['BLOCK','REQUIRE_APPROVAL','WARN','AUTO_APPROVE']).default('REQUIRE_APPROVAL'),
  message: z.string().max(200).optional(),
  active: z.boolean().default(true),
})

module.exports = [
  ['GET', 'policies', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('POLICY:READ')(ctx)
    const rows = await prisma.policy.findMany({ where: withTenant(ctx), include: { rules: { orderBy: { sortOrder: 'asc' } } }, orderBy: { createdAt: 'desc' } })
    return ok(rows)
  }],
  ['GET', 'policies/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('POLICY:READ')(ctx)
    const p = await prisma.policy.findFirst({ where: { id: ctx.params.id, organizationId: ctx.orgId }, include: { rules: { orderBy: { sortOrder: 'asc' } } } })
    if (!p) throw new NotFoundError('Policy')
    return ok(p)
  }],
  ['POST', 'policies/:id/rules', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('POLICY:WRITE')(ctx)
    const body = validate(RuleSchema, await req.json())
    const policy = await prisma.policy.findFirst({ where: { id: ctx.params.id, organizationId: ctx.orgId } })
    if (!policy) throw new NotFoundError('Policy')
    const rule = await prisma.policyRule.create({ data: { policyId: policy.id, ...body } })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'POLICY_CHANGE', entity: 'POLICY_RULE', entityId: rule.id, after: rule })
    return created(rule)
  }],
  ['DELETE', 'policy-rules/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('POLICY:WRITE')(ctx)
    const rule = await prisma.policyRule.findUnique({ where: { id: ctx.params.id }, include: { policy: true } })
    if (!rule || rule.policy.organizationId !== ctx.orgId) throw new NotFoundError('Rule')
    await prisma.policyRule.delete({ where: { id: rule.id } })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'POLICY_CHANGE', entity: 'POLICY_RULE', entityId: rule.id, before: rule })
    return ok({ deleted: true })
  }],
  ['POST', 'policies/:id/evaluate', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('POLICY:READ')(ctx)
    const body = await req.json()
    const result = await engine.evaluate(ctx.params.id, body)
    return ok(result)
  }],
]
