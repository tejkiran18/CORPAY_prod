const { logger } = require('../lib/logger')
const { ok, fail } = require('../lib/response')
const { consume, ipOf } = require('../middleware/rate-limit')

// Route table: { method: { pattern: handler } } where pattern is a string with :params
// Compiled to regex lazily.
const routes = {
  GET: [], POST: [], PUT: [], PATCH: [], DELETE: [],
}

function compile(pattern) {
  const keys = []
  const rx = new RegExp('^' + pattern.replace(/:[a-zA-Z_]+/g, m => { keys.push(m.slice(1)); return '([^/]+)' }) + '$')
  return { rx, keys }
}

function register(method, pattern, handler, opts = {}) {
  routes[method].push({ pattern, ...compile(pattern), handler, opts })
}

function match(method, path) {
  for (const r of (routes[method] || [])) {
    const m = path.match(r.rx)
    if (m) { const params = {}; r.keys.forEach((k, i) => (params[k] = m[i + 1])); return { ...r, params } }
  }
  return null
}

async function dispatch(req, path) {
  const startedAt = Date.now()
  const method = req.method
  const reqId = req.headers.get('x-request-id') || Math.random().toString(36).slice(2, 10)
  const log = logger.child({ req_id: reqId, method, path })

  try {
    consume(`ip:${ipOf(req)}:${path}`, { max: 120, windowMs: 60_000 })
    const r = match(method, path)
    if (!r) return fail(Object.assign(new Error(`Unknown route: ${method} /${path}`), { status: 404, code: 'NOT_FOUND' }), req)
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const ctx = { params: r.params, query, log, reqId }
    const res = await r.handler(req, ctx)
    log.info({ status: res.status || 200, ms: Date.now() - startedAt }, 'req_ok')
    return res
  } catch (err) {
    log.warn({ err: err.message, code: err.code, status: err.status, ms: Date.now() - startedAt }, 'req_err')
    return fail(err, req)
  }
}

// Bulk register from modules
function registerModule(defs) {
  defs.forEach(([method, pattern, handler, opts]) => register(method, pattern, handler, opts))
}

module.exports = { register, registerModule, dispatch, match, routes }
