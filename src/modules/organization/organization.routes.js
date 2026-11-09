const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { withTenant } = require('../../middleware/tenant')

async function get(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('ORG:READ')(ctx)
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    include: { country: true, currency: true }
  })
  return ok(org)
}

async function listDepartments(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('ORG:READ')(ctx)
  const rows = await prisma.department.findMany({ where: withTenant(ctx), include: { businessUnit: true, head: { select: { id: true, name: true } }, costCenters: true } })
  return ok(rows)
}

async function listBusinessUnits(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('ORG:READ')(ctx)
  const rows = await prisma.businessUnit.findMany({ where: withTenant(ctx), include: { head: { select: { id: true, name: true } }, departments: true } })
  return ok(rows)
}

async function listCostCenters(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  requirePermission('ORG:READ')(ctx)
  const rows = await prisma.costCenter.findMany({ where: withTenant(ctx), include: { department: { select: { id: true, name: true } } } })
  return ok(rows)
}

module.exports = [
  ['GET', 'organizations',        get],
  ['GET', 'organizations/current', get],
  ['GET', 'departments',          listDepartments],
  ['GET', 'business-units',       listBusinessUnits],
  ['GET', 'cost-centers',         listCostCenters],
]
