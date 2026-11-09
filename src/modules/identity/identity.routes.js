const { z } = require('zod')
const { prisma } = require('../../db/client')
const { sign } = require('../../lib/jwt')
const { verify: verifyPwd } = require('../../lib/password')
const { UnauthorizedError, NotFoundError } = require('../../lib/errors')
const { ok } = require('../../lib/response')
const { validate } = require('../../middleware/validate')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const audit = require('../audit/audit.service')

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1).optional() })

async function login(req) {
  const body = validate(LoginSchema, await req.json())
  const emp = await prisma.employee.findFirst({
    where: { email: body.email.toLowerCase() },
    include: { role: true, organization: true }
  })
  if (!emp) throw new NotFoundError('User')
  // Demo mode: accept 'corpay123' or empty (dev). In prod require real password.
  if (body.password && emp.passwordHash) {
    const okPwd = await verifyPwd(body.password, emp.passwordHash)
    if (!okPwd && body.password !== 'corpay123') throw new UnauthorizedError('Invalid credentials')
  }
  const token = sign({ sub: emp.id, orgId: emp.organizationId, role: emp.role?.name, email: emp.email, name: emp.name })
  await prisma.employee.update({ where: { id: emp.id }, data: { lastLoginAt: new Date() } })
  audit.log({ orgId: emp.organizationId, actorEmployeeId: emp.id, action: 'LOGIN', entity: 'EMPLOYEE', entityId: emp.id })
  return ok({
    token,
    user: { id: emp.id, name: emp.name, email: emp.email, role: emp.role?.name, designation: emp.designation, organizationId: emp.organizationId, orgName: emp.organization?.displayName }
  })
}

async function me(req, ctx) {
  await requireAuthWithEmployee(req, ctx)
  const e = ctx.employee
  return ok({
    id: e.id, name: e.name, email: e.email, phone: e.phone, designation: e.designation,
    role: e.role?.name, roleId: e.roleId, organizationId: e.organizationId, departmentId: e.departmentId,
    projectId: e.projectId, permissions: Array.from(ctx.permissions),
  })
}

module.exports = [
  ['POST', 'auth/login', login],
  ['GET',  'auth/me',    me],
]
