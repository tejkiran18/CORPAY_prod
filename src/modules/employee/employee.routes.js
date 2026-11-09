const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')
const { parse, envelope } = require('../../lib/pagination')

async function list(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('EMPLOYEE:READ')(ctx)
  const p = parse(ctx.query)
  const where = withTenant(ctx, ctx.query.status ? { status: ctx.query.status } : {})
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({
      where, orderBy: { name: 'asc' }, skip: p.skip, take: p.limit,
      include: { role: { select: { name: true } }, department: { select: { name: true } }, project: { select: { name: true, code: true } }, grade: { select: { name: true, level: true } } }
    }),
    prisma.employee.count({ where })
  ])
  return ok(...Object.values(envelope(rows, total, p)))
}

async function get(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('EMPLOYEE:READ')(ctx)
  const emp = await prisma.employee.findFirst({
    where: { id: ctx.params.id, organizationId: ctx.orgId },
    include: { role: true, department: true, project: true, grade: true, managersOf: { include: { manager: { select: { id: true, name: true } } } } }
  })
  return ok(emp)
}

module.exports = [
  ['GET', 'employees',      list],
  ['GET', 'employees/:id',  get],
]
