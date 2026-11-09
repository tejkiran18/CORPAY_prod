const { ok } = require('../../lib/response')
const { seed } = require('../../../prisma/seed')
const { prisma } = require('../../db/client')

module.exports = [
  ['GET', 'health', async () => ok({ status: 'ok', service: 'CORPAY', version: 'v1', db: 'postgres', time: new Date() })],
  ['POST', 'admin/seed', async () => ok(await seed())],
  ['GET', 'admin/stats', async () => {
    const [orgs, emps, txns, budgets, policies, rules, sr, approvals] = await Promise.all([
      prisma.organization.count(), prisma.employee.count(), prisma.transaction.count(),
      prisma.budget.count(), prisma.policy.count(), prisma.policyRule.count(),
      prisma.spendingRight.count(), prisma.approval.count(),
    ])
    return ok({ organizations: orgs, employees: emps, transactions: txns, budgets, policies, policyRules: rules, spendingRights: sr, approvals })
  }],
]
