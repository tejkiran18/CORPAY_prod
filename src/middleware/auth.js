const { verify } = require('../lib/jwt')
const { UnauthorizedError } = require('../lib/errors')
const { prisma } = require('../db/client')

// Attaches ctx.user (raw JWT claims) + optional full employee fetch.
async function requireAuth(req, ctx) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw new UnauthorizedError('Missing bearer token')
  const claims = verify(token)
  ctx.user = claims
  ctx.orgId = claims.orgId
  ctx.employeeId = claims.sub
  return ctx
}

async function requireAuthWithEmployee(req, ctx) {
  await requireAuth(req, ctx)
  const emp = await prisma.employee.findUnique({
    where: { id: ctx.employeeId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  })
  if (!emp || emp.status !== 'ACTIVE') throw new UnauthorizedError('Employee inactive')
  ctx.employee = emp
  ctx.permissions = new Set((emp.role?.permissions || []).map(rp => rp.permission.code))
  return ctx
}

module.exports = { requireAuth, requireAuthWithEmployee }
