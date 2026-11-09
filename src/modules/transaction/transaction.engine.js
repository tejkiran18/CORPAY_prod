// Transaction Engine — the ACID payment path.
// validate() = pure decision (no writes).
// pay()      = single prisma.$transaction:
//              1. re-run policy engine
//              2. lock spending right + budget rows
//              3. insert transaction (status derived from decision)
//              4. update spending_right.consumed and budget.spent when APPROVED
//              5. insert approval + approval_history when PENDING
//              6. record risk event when severity != success
//              7. audit log
const { prisma } = require('../../db/client')
const { NotFoundError, ConflictError, ValidationError } = require('../../lib/errors')
const { txnRef } = require('../../lib/idgen')
const policyEngine = require('../policy-engine/policy.engine')
const spendingRights = require('../spending-rights/spending-rights.service')
const audit = require('../audit/audit.service')

async function loadContext({ employeeId, amount, categoryName, merchantId, businessEventId }) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: { include: { costCenters: true } }, project: true, role: true }
  })
  if (!employee) throw new NotFoundError('Employee')

  const category = await prisma.transactionCategory.findFirst({ where: { organizationId: employee.organizationId, name: categoryName } })
  const merchant = merchantId ? await prisma.merchant.findUnique({ where: { id: merchantId }, include: { category: true } }) : null

  const sr = await spendingRights.resolveForEmployee({
    organizationId: employee.organizationId, employeeId: employee.id, businessEventId,
  })
  const policy = sr?.policy || await prisma.policy.findFirst({ where: { organizationId: employee.organizationId, isDefault: true, active: true } })

  return { employee, category, merchant, sr, policy }
}

async function validate({ employeeId, amount, categoryName, merchantId, businessEventId, occurredAt }) {
  const { employee, category, merchant, sr, policy } = await loadContext({ employeeId, amount, categoryName, merchantId, businessEventId })
  if (!policy) throw new ConflictError('No active policy configured')
  if (!category && categoryName) throw new ValidationError([{ path: 'categoryName', message: 'Unknown transaction category' }])

  // Spending right category check (blocked list)
  if (sr && category) {
    const catRule = sr.categories.find(c => c.transactionCategoryId === category.id)
    if (catRule?.mode === 'BLOCKED') {
      return { allowed: false, requiresApproval: false, severity: 'danger', reason: `Category '${categoryName}' is blocked for your spending right`, actions: [{ ruleId: catRule.id, action: 'BLOCK', message: 'Category blocked' }], spendingRightId: sr.id, policyId: policy.id }
    }
  }

  const velocity = sr ? await spendingRights.velocityFor(sr.id, employee.id, occurredAt) : {}
  const decision = await policyEngine.evaluate(policy.id, {
    amount: Number(amount), categoryName, merchantMcc: merchant?.mcc || null, occurredAt, ...velocity,
  })

  // Spending right allocation check
  let allocationIssue = null
  if (sr) {
    const remaining = Number(sr.allocatedAmount) - Number(sr.consumedAmount)
    if (Number(amount) > remaining) allocationIssue = `Insufficient spending right (available ₹${remaining.toFixed(2)})`
    if (sr.singleTransactionLimit && Number(amount) > Number(sr.singleTransactionLimit)) allocationIssue = `Exceeds single-txn limit ₹${sr.singleTransactionLimit}`
    if (allocationIssue) return { allowed: false, requiresApproval: false, severity: 'danger', reason: allocationIssue, actions: decision.actions, spendingRightId: sr.id, policyId: policy.id, budgetImpact: null, velocity }
  }

  // Enrich response
  return {
    ...decision,
    spendingRightId: sr?.id || null,
    policyId: policy.id,
    budgetImpact: sr ? { available: Number(sr.allocatedAmount) - Number(sr.consumedAmount), allocated: Number(sr.allocatedAmount) } : null,
    velocity,
  }
}

async function pay({ employeeId, amount, categoryName, merchantId, merchantName, businessEventId, occurredAt, ipAddress, userAgent, deviceId, latitude, longitude }) {
  const decision = await validate({ employeeId, amount, categoryName, merchantId, businessEventId, occurredAt })
  const { employee, category, merchant, sr, policy } = await loadContext({ employeeId, amount, categoryName, merchantId, businessEventId })

  const paymentStatus = decision.allowed ? (decision.requiresApproval ? 'PENDING' : 'APPROVED') : 'REJECTED'
  const approvalStatus = decision.allowed ? (decision.requiresApproval ? 'PENDING' : 'APPROVED') : 'REJECTED'

  // ACID commit
  const result = await prisma.$transaction(async (tx) => {
    const departmentId = employee.departmentId
    const costCenterId = employee.department?.costCenters?.[0]?.id || null
    const budget = sr?.businessEventId
      ? await tx.budget.findFirst({ where: { businessEventId: sr.businessEventId, status: 'ACTIVE' } })
      : await tx.budget.findFirst({ where: { OR: [{ employeeId: employee.id }, { projectId: employee.projectId }, { costCenterId }], status: 'ACTIVE' } })

    // Insert transaction
    const txn = await tx.transaction.create({ data: {
      reference: txnRef(),
      organizationId: employee.organizationId,
      employeeId: employee.id,
      managerId: (await tx.managerAssignment.findFirst({ where: { subordinateId: employee.id, primary: true } }))?.managerId,
      projectId: employee.projectId,
      businessEventId: businessEventId || sr?.businessEventId,
      spendingRightId: sr?.id,
      policyId: policy.id,
      merchantId: merchant?.id,
      merchantName: merchantName || merchant?.name || 'Unknown',
      merchantCategoryId: merchant?.categoryId,
      transactionCategoryId: category?.id,
      budgetId: budget?.id,
      costCenterId,
      amount: Number(amount),
      currencyCode: 'INR',
      upiReference: paymentStatus === 'APPROVED' ? `UPI/${Date.now()}/APPROVED` : null,
      paymentStatus, approvalStatus,
      riskScore: decision.severity === 'danger' ? 60 : (decision.severity === 'warning' ? 30 : 0),
      latitude, longitude, deviceId,
      reason: decision.reason,
      createdById: employee.id,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    } })

    // On APPROVED: increment budget.spent + spending_right.consumed
    if (paymentStatus === 'APPROVED') {
      if (budget) await tx.budget.update({ where: { id: budget.id }, data: { spent: { increment: Number(amount) } } })
      if (sr)     await tx.spendingRight.update({ where: { id: sr.id }, data: { consumedAmount: { increment: Number(amount) } } })
    }

    // On PENDING: open approval
    let approval = null
    if (paymentStatus === 'PENDING') {
      const wf = await tx.approvalWorkflow.findFirst({ where: { organizationId: employee.organizationId, entity: 'TRANSACTION', active: true }, include: { steps: { orderBy: { sortOrder: 'asc' }, take: 1 } } })
      const step = wf?.steps[0]
      approval = await tx.approval.create({ data: { workflowId: wf?.id, currentStepId: step?.id, subjectType: 'TRANSACTION', subjectId: txn.id, requesterId: employee.id, status: 'PENDING' } })
      await tx.approvalHistory.create({ data: { approvalId: approval.id, stepId: step?.id, actorEmployeeId: employee.id, action: 'REQUESTED', note: decision.reason } })
    }

    // Risk event
    if (decision.severity !== 'success') {
      await tx.riskEvent.create({ data: {
        organizationId: employee.organizationId, transactionId: txn.id, employeeId: employee.id,
        type: paymentStatus === 'REJECTED' ? 'OUT_OF_POLICY' : (Number(amount) > 5000 ? 'HIGH_AMOUNT' : 'VELOCITY'),
        severity: paymentStatus === 'REJECTED' ? 'HIGH' : 'MEDIUM',
        score: txn.riskScore, reason: decision.reason
      } })
    }

    return { txn, approval, budget }
  })

  audit.log({ orgId: employee.organizationId, actorEmployeeId: employee.id, action: 'PAYMENT', entity: 'TRANSACTION', entityId: result.txn.id, after: { amount, status: paymentStatus, merchantName: result.txn.merchantName } })

  return { success: paymentStatus !== 'REJECTED', status: paymentStatus, decision, transaction: result.txn, approval: result.approval }
}

module.exports = { validate, pay }
