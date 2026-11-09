const jwt = require('jsonwebtoken')
const { UnauthorizedError } = require('./errors')

const SECRET = process.env.JWT_SECRET || 'dev-secret'
const EXPIRY = process.env.JWT_EXPIRY || '8h'

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY, algorithm: 'HS256' })
}
function verify(token) {
  try { return jwt.verify(token, SECRET, { algorithms: ['HS256'] }) }
  catch (e) { throw new UnauthorizedError('Invalid or expired token') }
}
module.exports = { sign, verify }
