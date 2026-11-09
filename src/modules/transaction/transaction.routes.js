const { z } = require('zod')
const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')
const { validate: zValidate } = require('../../middleware/validate')
const { parse, envelope } = require('../../lib/pagination')
const { toCsv } = require('../../lib/csv')
const { raw } = require('../../lib/response')
const engine = require('./transaction.engine')

const ValidateSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number().positive(),
  categoryName: z.string(),
  merchantId: z.string().uuid().optional().nullable(),
  businessEventId: z.string().uuid().optional().nullable(),
  occurredAt: z.string().datetime().optional().nullable(),
})
const PaySchema = ValidateSchema.extend({
  merchantName: z.string().optional(),
  deviceId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

module.exports = [
  ['GET', 'transactions', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('TXN:READ')(ctx)
    const p = parse(ctx.query)
    const where = withTenant(ctx)
    if (ctx.query.employeeId) where.employeeId = ctx.query.employeeId
    if (ctx.query.status) where.paymentStatus = ctx.query.status.toUpperCase()
    if (ctx.query.projectId) where.projectId = ctx.query.projectId
    if (ctx.query.costCenterId) where.costCenterId = ctx.query.costCenterId
    if (ctx.query.search) where.OR = [
      { merchantName: { contains: ctx.query.search, mode: 'insensitive' } },
      { reference: { contains: ctx.query.search, mode: 'insensitive' } },
    ]
    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where, orderBy: { occurredAt: 'desc' }, skip: p.skip, take: p.limit,
        include: { employee: { select: { id: true, name: true, designation: true } }, project: { select: { name: true, code: true } }, merchant: { select: { name: true } }, transactionCategory: { select: { name: true } }, costCenter: { select: { code: true } } }
      }),
      prisma.transaction.count({ where })
    ])
    return ok(...Object.values(envelope(rows, total, p)))
  }],

  ['GET', 'transactions/:id', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('TXN:READ')(ctx)
    const txn = await prisma.transaction.findFirst({
      where: { id: ctx.params.id, organizationId: ctx.orgId },
      include: { employee: true, project: true, merchant: { include: { category: true } }, transactionCategory: true, budget: true, spendingRight: true, policy: true, riskEvents: true, costCenter: true }
    })
    return ok(txn)
  }],

  ['POST', 'transactions/validate', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('TXN:PAY')(ctx)
    const body = zValidate(ValidateSchema, await req.json())
    return ok(await engine.validate(body))
  }],

  ['POST', 'transactions/pay', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('TXN:PAY')(ctx)
    const body = zValidate(PaySchema, await req.json())
    return ok(await engine.pay(body))
  }],

  ['GET', 'transactions/export/csv', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('TXN:READ')(ctx)
    const rows = await prisma.transaction.findMany({
      where: withTenant(ctx),
      orderBy: { occurredAt: 'desc' },
      include: { employee: true, project: true, merchant: true, transactionCategory: true, costCenter: true },
      take: 5000,
    })
    const cols = [
      { header: 'TxnID',           map: r => r.reference },
      { header: 'Date',            map: r => new Date(r.occurredAt).toISOString() },
      { header: 'Merchant',        map: r => r.merchantName },
      { header: 'Category',        map: r => r.transactionCategory?.name || '' },
      { header: 'Amount (INR)',    map: r => r.amount },
      { header: 'Method',          map: r => r.method },
      { header: 'Payment Status',  map: r => r.paymentStatus },
      { header: 'Approval Status', map: r => r.approvalStatus },
      { header: 'Employee',        map: r => r.employee?.name || '' },
      { header: 'Designation',     map: r => r.employee?.designation || '' },
      { header: 'Project',         map: r => r.project?.name || '' },
      { header: 'Cost Center',     map: r => r.costCenter?.code || '' },
      { header: 'Risk Score',      map: r => r.riskScore },
      { header: 'Reason',          map: r => r.reason || '' },
    ]
    return raw(toCsv(rows, cols), { status: 200, headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="corpay-transactions-${new Date().toISOString().slice(0,10)}.csv"`
    } })
  }],
]
