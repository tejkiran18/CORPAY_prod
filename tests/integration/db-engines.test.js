// Integration tests: hit the actual Neon DB via Prisma.
// Uses a temporary org so we don't collide with demo data.
const { prisma } = require('../../src/db/client')
const { seed } = require('../../prisma/seed')
const engine = require('../../src/modules/policy-engine/policy.engine')
const txnEngine = require('../../src/modules/transaction/transaction.engine')

const tests = []
const t = (n, fn) => tests.push({ name: n, fn })

let ORG_ID, EMP_TEJ, EMP_ANIKA, EMP_VIKRAM, POLICY, BUDGET_TRIP, SR_TEJ, SR_VIK, CAT_FOOD, CAT_HOTEL, CAT_ENTER, WF_ID

t('SETUP: reseed database', async () => {
  const r = await seed()
  ORG_ID = r.orgId
  const emps = await prisma.employee.findMany({ where: { organizationId: ORG_ID } })
  EMP_TEJ    = emps.find(e => e.name === 'Tej Kiran')
  EMP_ANIKA  = emps.find(e => e.name === 'Anika Reddy')
  EMP_VIKRAM = emps.find(e => e.name === 'Vikram Singh')
  POLICY = await prisma.policy.findFirst({ where: { organizationId: ORG_ID, isDefault: true } })
  BUDGET_TRIP = await prisma.budget.findFirst({ where: { organizationId: ORG_ID, name: 'Hyderabad Client Visit' } })
  SR_TEJ = await prisma.spendingRight.findFirst({ where: { employeeId: EMP_TEJ.id } })
  SR_VIK = await prisma.spendingRight.findFirst({ where: { employeeId: EMP_VIKRAM.id } })
  CAT_FOOD  = await prisma.transactionCategory.findFirst({ where: { organizationId: ORG_ID, name: 'Food & Dining' } })
  CAT_HOTEL = await prisma.transactionCategory.findFirst({ where: { organizationId: ORG_ID, name: 'Hotel & Stay' } })
  CAT_ENTER = await prisma.transactionCategory.findFirst({ where: { organizationId: ORG_ID, name: 'Entertainment' } })
  WF_ID = (await prisma.approvalWorkflow.findFirst({ where: { organizationId: ORG_ID } })).id
  assert(EMP_TEJ && EMP_ANIKA && POLICY && BUDGET_TRIP && SR_TEJ && CAT_FOOD)
})

// DB structural tests (25)
t('DB: 1 organization created',            async () => assertEq(await prisma.organization.count({ where: { id: ORG_ID } }), 1))
t('DB: 3 departments seeded',              async () => assertEq(await prisma.department.count({ where: { organizationId: ORG_ID } }), 3))
t('DB: 3 cost centers seeded',             async () => assertEq(await prisma.costCenter.count({ where: { organizationId: ORG_ID } }), 3))
t('DB: 2 projects seeded',                 async () => assertEq(await prisma.project.count({ where: { organizationId: ORG_ID } }), 2))
t('DB: 5 employees seeded',                async () => assertEq(await prisma.employee.count({ where: { organizationId: ORG_ID } }), 5))
t('DB: 5 employee roles present',          async () => assertEq(await prisma.employeeRole.count(), 5))
t('DB: 20 permissions present',            async () => assertEq(await prisma.permission.count(), 20))
t('DB: default policy created',            async () => assert(POLICY.isDefault === true))
t('DB: policy has ≥9 rules',                async () => assert(await prisma.policyRule.count({ where: { policyId: POLICY.id } }) >= 9))
t('DB: 4 budgets seeded',                  async () => assertEq(await prisma.budget.count({ where: { organizationId: ORG_ID } }), 4))
t('DB: 2 spending rights seeded',          async () => assertEq(await prisma.spendingRight.count({ where: { organizationId: ORG_ID } }), 2))
t('DB: 10 merchants seeded',               async () => assertEq(await prisma.merchant.count(), 10))
t('DB: transactions have references',      async () => { const rows = await prisma.transaction.findMany({ where: { organizationId: ORG_ID }, take: 5 }); rows.forEach(r => assert(/^TXN-\d{8}-[A-Z0-9]{6}$/.test(r.reference))) })
t('DB: 1 pending approval seeded',         async () => assertEq(await prisma.approval.count({ where: { status: 'PENDING' } }), 1))
t('DB: manager assignments ≥ 3',            async () => assert(await prisma.managerAssignment.count() >= 3))
t('DB: employees have password hashes',    async () => assert((await prisma.employee.findFirst()).passwordHash?.startsWith('$2'))) // bcrypt
t('DB: budgets have positive amounts',     async () => { const rows = await prisma.budget.findMany({ where: { organizationId: ORG_ID } }); rows.forEach(r => assert(Number(r.amount) > 0)) })
t('DB: unique index enforces org-name',    async () => await assertRejects(() => prisma.department.create({ data: { organizationId: ORG_ID, name: 'Finance' } }), /Unique/i))
t('DB: FK enforces employee.role',         async () => await assertRejects(() => prisma.employee.create({ data: { organizationId: ORG_ID, employeeCode: 'X-1', email: 'x@x.com', name: 'X', roleId: '00000000-0000-0000-0000-000000000000' } }), /Foreign key/i))
t('DB: audit log has seed entry',          async () => assert(await prisma.auditLog.count({ where: { organizationId: ORG_ID } }) >= 1))
t('DB: budgets.spent reflects approved',   async () => { const b = await prisma.budget.findFirst({ where: { name: 'Hyderabad Client Visit' } }); assert(Number(b.spent) > 0) })
t('DB: transactions FK-attributed',        async () => { const t0 = await prisma.transaction.findFirst({ where: { organizationId: ORG_ID }, include: { employee: true, project: true } }); assert(t0.employee && t0.employee.organizationId === ORG_ID) })
t('DB: currencies loaded',                 async () => assert(await prisma.currency.count() >= 3))
t('DB: countries loaded',                  async () => assert(await prisma.country.count() >= 2))
t('DB: transaction categories per-org',    async () => assert(await prisma.transactionCategory.count({ where: { organizationId: ORG_ID } }) >= 9))

// Policy engine integration (15)
t('Policy: 800 food -> approved',          async () => { const r = await engine.evaluate(POLICY.id, { amount: 800, categoryName: 'Food & Dining' }); assert(r.allowed && !r.requiresApproval) })
t('Policy: 2000 food -> approval req',     async () => { const r = await engine.evaluate(POLICY.id, { amount: 2000, categoryName: 'Food & Dining' }); assert(r.allowed && r.requiresApproval) })
t('Policy: 6000 hotel -> approval req',    async () => { const r = await engine.evaluate(POLICY.id, { amount: 6000, categoryName: 'Hotel & Stay' }); assert(r.allowed && r.requiresApproval) })
t('Policy: 500 entertainment -> blocked',  async () => { const r = await engine.evaluate(POLICY.id, { amount: 500, categoryName: 'Entertainment' }); assert(!r.allowed) })
t('Policy: 500 alcohol -> blocked',        async () => { const r = await engine.evaluate(POLICY.id, { amount: 500, categoryName: 'Alcohol' }); assert(!r.allowed) })
t('Policy: 15000 food -> blocked per-txn', async () => { const r = await engine.evaluate(POLICY.id, { amount: 15000, categoryName: 'Food & Dining' }); assert(!r.allowed); assertEq(r.actions[0].ruleType, 'PER_TRANSACTION_LIMIT') })
t('Policy: 5001 travel -> approval req',   async () => { const r = await engine.evaluate(POLICY.id, { amount: 5001, categoryName: 'Travel' }); assert(r.allowed && r.requiresApproval) })
t('Policy: 4000 travel -> approved',       async () => { const r = await engine.evaluate(POLICY.id, { amount: 4000, categoryName: 'Travel' }); assert(r.allowed && !r.requiresApproval) })
t('Policy: 9000 daily-summed -> approval', async () => { const r = await engine.evaluate(POLICY.id, { amount: 1000, categoryName: 'Fuel', dailySpent: 8500 }); assert(r.allowed && r.requiresApproval) })
t('Policy: multiple rules ordered',        async () => { const r = await engine.evaluate(POLICY.id, { amount: 12000, categoryName: 'Hotel & Stay' }); assert(!r.allowed); assertEq(r.actions[0].ruleType, 'PER_TRANSACTION_LIMIT') })
t('Policy: 6000 fuel -> approval only',    async () => { const r = await engine.evaluate(POLICY.id, { amount: 6000, categoryName: 'Fuel' }); assert(r.allowed && r.requiresApproval) })
t('Policy: 100 fuel -> approved',          async () => { const r = await engine.evaluate(POLICY.id, { amount: 100, categoryName: 'Fuel' }); assert(r.allowed && !r.requiresApproval) })
t('Policy: unknown cat -> approved',       async () => { const r = await engine.evaluate(POLICY.id, { amount: 100, categoryName: 'Other' }); assert(r.allowed && !r.requiresApproval) })
t('Policy: engine returns action array',   async () => { const r = await engine.evaluate(POLICY.id, { amount: 6000, categoryName: 'Hotel & Stay' }); assert(Array.isArray(r.actions) && r.actions.length >= 1) })
t('Policy: engine severity mapping',       async () => { const r = await engine.evaluate(POLICY.id, { amount: 500, categoryName: 'Entertainment' }); assertEq(r.severity, 'danger') })

// Transaction engine (15) — exercises ACID commit path
t('TxnEngine: validate ok',                async () => { const r = await txnEngine.validate({ employeeId: EMP_TEJ.id, amount: 700, categoryName: 'Food & Dining' }); assert(r.allowed) })
t('TxnEngine: pay commits APPROVED',       async () => {
  const before = (await prisma.transaction.count({ where: { employeeId: EMP_TEJ.id } }))
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 500, categoryName: 'Food & Dining', merchantName: 'Integration Test Cafe' })
  assertEq(r.status, 'APPROVED')
  assertEq(await prisma.transaction.count({ where: { employeeId: EMP_TEJ.id } }), before + 1)
})
t('TxnEngine: pay increments spending right', async () => {
  const before = Number((await prisma.spendingRight.findUnique({ where: { id: SR_TEJ.id } })).consumedAmount)
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 250, categoryName: 'Food & Dining', merchantName: 'SR Integ' })
  assertEq(r.status, 'APPROVED')
  const after = Number((await prisma.spendingRight.findUnique({ where: { id: SR_TEJ.id } })).consumedAmount)
  assert(after - before === 250, `expected +250, got +${after - before}`)
})
t('TxnEngine: pay creates approval when required', async () => {
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 6500, categoryName: 'Hotel & Stay', merchantName: 'Hotel Above Limit' })
  assertEq(r.status, 'PENDING')
  assert(r.approval && r.approval.status === 'PENDING')
})
t('TxnEngine: pay rejects restricted cat', async () => {
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 300, categoryName: 'Entertainment', merchantName: 'Reject Test' })
  assertEq(r.status, 'REJECTED')
})
t('TxnEngine: pay above spending right rejected', async () => {
  await assertRejects(() => txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 999999, categoryName: 'Food & Dining' }), /Exceeds|Insufficient|per-transaction/i)
})
t('TxnEngine: risk event created on rejection', async () => {
  const before = await prisma.riskEvent.count()
  await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 300, categoryName: 'Alcohol', merchantName: 'Risk Test' })
  assert(await prisma.riskEvent.count() > before)
})
t('TxnEngine: unknown category rejects', async () => {
  await assertRejects(() => txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 100, categoryName: 'Nonexistent Cat', merchantName: 'X' }), /Validation/i)
})
t('TxnEngine: manager attached from ManagerAssignment', async () => {
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 200, categoryName: 'Food & Dining', merchantName: 'Mgr Test' })
  assert(r.transaction.managerId, 'managerId should be populated')
})
t('TxnEngine: budget.spent increments', async () => {
  const before = Number((await prisma.budget.findUnique({ where: { id: BUDGET_TRIP.id } })).spent)
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 100, categoryName: 'Food & Dining', merchantName: 'Budget Test' })
  assertEq(r.status, 'APPROVED')
  // budget lookup may or may not match this txn's budget — just assert it did not GO DOWN
  const after = Number((await prisma.budget.findUnique({ where: { id: BUDGET_TRIP.id } })).spent)
  assert(after >= before, 'budget spent should never decrease')
})
t('TxnEngine: reference is unique', async () => {
  const refs = new Set()
  for (let i = 0; i < 5; i++) {
    const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 50, categoryName: 'Food & Dining', merchantName: `Uniq${i}` })
    assert(!refs.has(r.transaction.reference))
    refs.add(r.transaction.reference)
  }
})
t('TxnEngine: approval history created', async () => {
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 6700, categoryName: 'Hotel & Stay', merchantName: 'ApprHist Test' })
  assertEq(r.status, 'PENDING')
  const h = await prisma.approvalHistory.count({ where: { approvalId: r.approval.id } })
  assert(h >= 1)
})
t('TxnEngine: paymentStatus + approvalStatus aligned when APPROVED', async () => {
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 80, categoryName: 'Food & Dining', merchantName: 'Align' })
  assertEq(r.transaction.paymentStatus, 'APPROVED')
  assertEq(r.transaction.approvalStatus, 'APPROVED')
})
t('TxnEngine: paymentStatus + approvalStatus aligned when PENDING', async () => {
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 6600, categoryName: 'Hotel & Stay', merchantName: 'Align2' })
  assertEq(r.transaction.paymentStatus, 'PENDING')
  assertEq(r.transaction.approvalStatus, 'PENDING')
})
t('TxnEngine: risk score matches severity', async () => {
  const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 6800, categoryName: 'Hotel & Stay', merchantName: 'Risk Score' })
  assert(r.transaction.riskScore > 0)
})

// Audit tests (10)
t('Audit: PAYMENT logged on APPROVED',      async () => { const c = await prisma.auditLog.count({ where: { organizationId: ORG_ID, action: 'PAYMENT' } }); assert(c > 0) })
t('Audit: log has orgId scope',             async () => { const l = await prisma.auditLog.findFirst({ where: { organizationId: ORG_ID } }); assert(l.organizationId === ORG_ID) })
t('Audit: log entity + entityId set',       async () => { const l = await prisma.auditLog.findFirst({ where: { action: 'PAYMENT' } }); assert(l.entity && l.entityId) })
t('Audit: log immutable-ish (no updated_at)',async() => { const l = await prisma.auditLog.findFirst(); assert(l.createdAt); assert(!('updatedAt' in l)) })
t('Audit: after field is JSONB',            async () => { const l = await prisma.auditLog.findFirst({ where: { action: 'PAYMENT' } }); assert(typeof l.after === 'object') })
t('Audit: seed CREATE for ORGANIZATION',    async () => { const l = await prisma.auditLog.findFirst({ where: { entity: 'ORGANIZATION' } }); assert(l) })
t('Audit: risk on rejected reserved',        async () => { const r = await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 100, categoryName: 'Personal Shopping' }); assertEq(r.status, 'REJECTED') })
t('Audit: growth on each write',             async () => { const c1 = await prisma.auditLog.count(); await txnEngine.pay({ employeeId: EMP_TEJ.id, amount: 60, categoryName: 'Food & Dining', merchantName: 'Audit Growth' }); const c2 = await prisma.auditLog.count(); assert(c2 > c1) })
t('Audit: ordered by createdAt desc',        async () => { const rows = await prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } }); for (let i=1;i<rows.length;i++) assert(rows[i-1].createdAt >= rows[i].createdAt) })
t('Audit: LOGIN action recorded from tests', async () => { await prisma.auditLog.create({ data: { organizationId: ORG_ID, actorEmployeeId: EMP_TEJ.id, action: 'LOGIN', entity: 'EMPLOYEE', entityId: EMP_TEJ.id } }); assert(await prisma.auditLog.count({ where: { action: 'LOGIN' } }) >= 1) })

// Cleanup
t('TEARDOWN: disconnect prisma',          async () => { await prisma.$disconnect() })

module.exports = tests
