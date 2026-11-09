const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')

async function kpis(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('ANALYTICS:READ')(ctx)
  const orgFilter = { organizationId: ctx.orgId }
  const [budgets, txnAgg, pending, rejected, departments, projects] = await Promise.all([
    prisma.budget.findMany({ where: withTenant(ctx) }),
    prisma.transaction.aggregate({ where: { ...orgFilter, paymentStatus: 'APPROVED' }, _sum: { amount: true } }),
    prisma.approval.count({ where: { status: 'PENDING', requester: { organizationId: ctx.orgId } } }),
    prisma.transaction.count({ where: { ...orgFilter, paymentStatus: 'REJECTED' } }),
    prisma.department.findMany({ where: withTenant(ctx) }),
    prisma.project.findMany({ where: withTenant(ctx) }),
  ])
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = Number(txnAgg._sum.amount || 0)

  const byDept = await Promise.all(departments.map(async d => {
    const a = await prisma.transaction.aggregate({ where: { organizationId: ctx.orgId, paymentStatus: 'APPROVED', employee: { departmentId: d.id } }, _sum: { amount: true } })
    return { name: d.name, spent: Number(a._sum.amount || 0) }
  }))
  const byProject = await Promise.all(projects.map(async p => {
    const a = await prisma.transaction.aggregate({ where: { organizationId: ctx.orgId, paymentStatus: 'APPROVED', projectId: p.id }, _sum: { amount: true } })
    return { name: p.name, spent: Number(a._sum.amount || 0), budget: Number(p.budgetCap || 0) }
  }))

  // Category breakdown
  const catRows = await prisma.transaction.groupBy({ by: ['transactionCategoryId'], where: { ...orgFilter, paymentStatus: 'APPROVED' }, _sum: { amount: true } })
  const cats = await prisma.transactionCategory.findMany({ where: withTenant(ctx) })
  const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]))
  const categoryData = catRows.map(r => ({ name: catMap[r.transactionCategoryId] || 'Uncategorised', value: Number(r._sum.amount || 0) }))

  // Monthly (last 6 months)
  const now = new Date()
  const monthly = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    const next = new Date(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1)
    const a = await prisma.transaction.aggregate({ where: { ...orgFilter, paymentStatus: 'APPROVED', occurredAt: { gte: d, lt: next } }, _sum: { amount: true } })
    monthly.push({ month: d.toLocaleString('en-US', { month: 'short' }), spent: Number(a._sum.amount || 0), allocated: Math.round(totalAllocated / 6) })
  }

  return ok({
    totalAllocated, totalSpent, remaining: totalAllocated - totalSpent,
    pendingCount: pending, violations: rejected,
    utilization: totalAllocated ? Math.round((totalSpent / totalAllocated) * 100) : 0,
    byDept: byDept.sort((a, b) => b.spent - a.spent),
    byProject: byProject.sort((a, b) => b.spent - a.spent),
    categoryData, monthly,
  })
}

async function costCenters(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('ANALYTICS:READ')(ctx)
  const ccs = await prisma.costCenter.findMany({ where: withTenant(ctx), include: { department: true } })
  const rows = await Promise.all(ccs.map(async cc => {
    const [alloc, spentAgg, pendingAgg, viol, txnCount] = await Promise.all([
      prisma.budget.aggregate({ where: { costCenterId: cc.id }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { costCenterId: cc.id, paymentStatus: 'APPROVED' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { costCenterId: cc.id, paymentStatus: 'PENDING' },  _sum: { amount: true } }),
      prisma.transaction.count({ where: { costCenterId: cc.id, paymentStatus: 'REJECTED' } }),
      prisma.transaction.count({ where: { costCenterId: cc.id } }),
    ])
    const allocated = Number(alloc._sum.amount || 0)
    const spent     = Number(spentAgg._sum.amount || 0)
    const pending   = Number(pendingAgg._sum.amount || 0)
    return { code: cc.code, department: cc.department.name, allocated, spent, pending, txnCount, violations: viol, remaining: allocated - spent, utilization: allocated ? Math.round((spent / allocated) * 100) : 0 }
  }))
  return ok(rows.sort((a, b) => b.spent - a.spent))
}

async function monthlyClosure(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('ANALYTICS:READ')(ctx)
  const month = ctx.query.month
  const ref = month ? new Date(month + '-01') : new Date()
  const start = new Date(ref.getUTCFullYear(), ref.getUTCMonth(), 1)
  const end   = new Date(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1)
  const [txns, approved, deps, projects, budgetAgg] = await Promise.all([
    prisma.transaction.findMany({ where: { organizationId: ctx.orgId, occurredAt: { gte: start, lt: end } }, include: { transactionCategory: true } }),
    prisma.transaction.aggregate({ where: { organizationId: ctx.orgId, occurredAt: { gte: start, lt: end }, paymentStatus: 'APPROVED' }, _sum: { amount: true } }),
    prisma.department.findMany({ where: withTenant(ctx) }),
    prisma.project.findMany({ where: withTenant(ctx) }),
    prisma.budget.aggregate({ where: { organizationId: ctx.orgId }, _sum: { amount: true } }),
  ])
  const byDept = await Promise.all(deps.map(async d => ({ name: d.name, spent: Number((await prisma.transaction.aggregate({ where: { organizationId: ctx.orgId, occurredAt: { gte: start, lt: end }, paymentStatus: 'APPROVED', employee: { departmentId: d.id } }, _sum: { amount: true } }))._sum.amount || 0) })))
  const byProject = await Promise.all(projects.map(async p => ({ name: p.name, spent: Number((await prisma.transaction.aggregate({ where: { organizationId: ctx.orgId, occurredAt: { gte: start, lt: end }, paymentStatus: 'APPROVED', projectId: p.id }, _sum: { amount: true } }))._sum.amount || 0) })))
  const byCategory = {}
  txns.filter(t => t.paymentStatus === 'APPROVED').forEach(t => { const k = t.transactionCategory?.name || 'Other'; byCategory[k] = (byCategory[k] || 0) + Number(t.amount) })
  const merchants = {}
  txns.filter(t => t.paymentStatus === 'APPROVED').forEach(t => { merchants[t.merchantName] = (merchants[t.merchantName] || 0) + Number(t.amount) })
  return ok({
    month: `${ref.toLocaleString('en-US', { month: 'long' })} ${ref.getUTCFullYear()}`,
    period: { start, end },
    txnCount: txns.length,
    approvedCount: txns.filter(t => t.paymentStatus === 'APPROVED').length,
    pending: txns.filter(t => t.paymentStatus === 'PENDING').length,
    violations: txns.filter(t => t.paymentStatus === 'REJECTED').length,
    totalSpent: Number(approved._sum.amount || 0),
    totalAllocated: Number(budgetAgg._sum.amount || 0),
    byDept, byProject,
    byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
    topMerchants: Object.entries(merchants).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name, amount]) => ({ name, amount })),
    closureStatus: end < new Date() ? 'Closed' : 'Open',
  })
}

module.exports = [
  ['GET', 'analytics/kpis',           kpis],
  ['GET', 'analytics/cost-centers',   costCenters],
  ['GET', 'analytics/monthly-closure', monthlyClosure],
]
