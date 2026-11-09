const { prisma } = require('../../db/client')
const { NotFoundError, ConflictError } = require('../../lib/errors')

// Find the active spending right for an employee (optionally scoped to a business event).
async function resolveForEmployee({ organizationId, employeeId, businessEventId, at = new Date() }) {
  return prisma.spendingRight.findFirst({
    where: {
      organizationId, employeeId, status: 'ACTIVE',
      validityStart: { lte: at }, validityEnd: { gte: at },
      ...(businessEventId ? { businessEventId } : {}),
    },
    include: { policy: true, categories: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

// Aggregate current-day/week/month spent for velocity rules.
async function velocityFor(spendingRightId, employeeId, at = new Date()) {
  const day = new Date(at); day.setUTCHours(0,0,0,0)
  const weekStart = new Date(day); weekStart.setUTCDate(day.getUTCDate() - day.getUTCDay())
  const monthStart = new Date(day.getUTCFullYear(), day.getUTCMonth(), 1)
  const [d, w, m] = await Promise.all([
    prisma.transaction.aggregate({ where: { employeeId, paymentStatus: { in: ['APPROVED','PENDING'] }, occurredAt: { gte: day } }, _sum: { amount: true }, _count: true }),
    prisma.transaction.aggregate({ where: { employeeId, paymentStatus: { in: ['APPROVED','PENDING'] }, occurredAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { employeeId, paymentStatus: { in: ['APPROVED','PENDING'] }, occurredAt: { gte: monthStart } }, _sum: { amount: true } }),
  ])
  return {
    dailySpent: Number(d._sum.amount || 0),
    weeklySpent: Number(w._sum.amount || 0),
    monthlySpent: Number(m._sum.amount || 0),
    recentTxnCount: d._count || 0,
  }
}

// Consume amount atomically. Called INSIDE a prisma.$transaction from TransactionEngine.
async function consumeInTx(tx, spendingRightId, amount) {
  const row = await tx.spendingRight.findUnique({ where: { id: spendingRightId } })
  if (!row) throw new NotFoundError('SpendingRight')
  const remaining = Number(row.allocatedAmount) - Number(row.consumedAmount)
  if (Number(amount) > remaining) throw new ConflictError(`Insufficient allocation (available ₹${remaining.toFixed(2)})`)
  const updated = await tx.spendingRight.update({
    where: { id: spendingRightId },
    data: { consumedAmount: { increment: Number(amount) } }
  })
  return updated
}

module.exports = { resolveForEmployee, velocityFor, consumeInTx }
