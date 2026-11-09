const { z } = require('zod')
const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')
const { validate } = require('../../middleware/validate')
const { NotFoundError } = require('../../lib/errors')
const audit = require('../audit/audit.service')

const ActionSchema = z.object({ note: z.string().max(1000).optional() })

module.exports = [
  ['GET', 'approvals', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('APPROVAL:READ')(ctx)
    const status = ctx.query.status?.toUpperCase()
    const rows = await prisma.approval.findMany({
      where: { ...(status ? { status } : {}), requester: { organizationId: ctx.orgId } },
      include: { requester: { select: { id: true, name: true, designation: true } }, currentStep: { include: { role: true } }, history: { include: { actor: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    // Enrich with subject data (polymorphic)
    for (const a of rows) {
      if (a.subjectType === 'TRANSACTION') {
        a.subject = await prisma.transaction.findUnique({ where: { id: a.subjectId }, include: { merchant: true, transactionCategory: true } })
      }
    }
    return ok(rows)
  }],

  ['POST', 'approvals/:id/approve', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('APPROVAL:ACT')(ctx)
    const body = validate(ActionSchema.optional(), await req.json().catch(()=>({}))) || {}
    const app = await prisma.approval.findUnique({ where: { id: ctx.params.id } })
    if (!app || app.status !== 'PENDING') throw new NotFoundError('Approval')

    await prisma.$transaction(async tx => {
      await tx.approval.update({ where: { id: app.id }, data: { status: 'APPROVED', decidedAt: new Date() } })
      await tx.approvalHistory.create({ data: { approvalId: app.id, stepId: app.currentStepId, actorEmployeeId: ctx.employeeId, action: 'APPROVED', note: body?.note || '' } })
      if (app.subjectType === 'TRANSACTION') {
        const txn = await tx.transaction.update({ where: { id: app.subjectId }, data: { paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', upiReference: `UPI/${Date.now()}/APPROVED` } })
        if (txn.budgetId)         await tx.budget.update({ where: { id: txn.budgetId }, data: { spent: { increment: txn.amount } } })
        if (txn.spendingRightId)  await tx.spendingRight.update({ where: { id: txn.spendingRightId }, data: { consumedAmount: { increment: txn.amount } } })
      }
    })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'APPROVE', entity: 'APPROVAL', entityId: app.id, after: { status: 'APPROVED' } })
    return ok({ status: 'APPROVED' })
  }],

  ['POST', 'approvals/:id/reject', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('APPROVAL:ACT')(ctx)
    const body = await req.json().catch(()=>({}))
    const app = await prisma.approval.findUnique({ where: { id: ctx.params.id } })
    if (!app || app.status !== 'PENDING') throw new NotFoundError('Approval')
    await prisma.$transaction(async tx => {
      await tx.approval.update({ where: { id: app.id }, data: { status: 'REJECTED', decidedAt: new Date() } })
      await tx.approvalHistory.create({ data: { approvalId: app.id, stepId: app.currentStepId, actorEmployeeId: ctx.employeeId, action: 'REJECTED', note: body?.note || '' } })
      if (app.subjectType === 'TRANSACTION') {
        await tx.transaction.update({ where: { id: app.subjectId }, data: { paymentStatus: 'REJECTED', approvalStatus: 'REJECTED' } })
      }
    })
    audit.log({ orgId: ctx.orgId, actorEmployeeId: ctx.employeeId, action: 'REJECT', entity: 'APPROVAL', entityId: app.id, after: { status: 'REJECTED' } })
    return ok({ status: 'REJECTED' })
  }],

  ['GET', 'approval-workflows', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('APPROVAL:READ')(ctx)
    return ok(await prisma.approvalWorkflow.findMany({ where: withTenant(ctx), include: { steps: { orderBy: { sortOrder: 'asc' }, include: { role: true } } } }))
  }],
]
