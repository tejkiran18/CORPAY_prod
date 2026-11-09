// Token bucket per IP+route. In-memory (per-instance). Good enough for MVP.
const { RateLimitError } = require('../lib/errors')
const buckets = new Map()
function consume(key, { max = 60, windowMs = 60_000 } = {}) {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now - b.start > windowMs) { b = { start: now, count: 0 }; buckets.set(key, b) }
  b.count++
  if (b.count > max) throw new RateLimitError()
}
function ipOf(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
module.exports = { consume, ipOf }
