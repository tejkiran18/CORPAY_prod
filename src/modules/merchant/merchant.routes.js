const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { withTenant } = require('../../middleware/tenant')

module.exports = [
  ['GET', 'merchants', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    const rows = await prisma.merchant.findMany({ include: { category: true, city: true }, orderBy: { name: 'asc' } })
    return ok(rows)
  }],
  ['GET', 'merchant-categories', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    return ok(await prisma.merchantCategory.findMany({ orderBy: { name: 'asc' } }))
  }],
  ['GET', 'transaction-categories', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    return ok(await prisma.transactionCategory.findMany({ where: withTenant(ctx), orderBy: { name: 'asc' } }))
  }],
]
