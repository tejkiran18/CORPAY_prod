function parse({ page, limit, sort, dir }) {
  const p = Math.max(1, parseInt(page) || 1)
  const l = Math.min(500, Math.max(1, parseInt(limit) || 50))
  return { page: p, limit: l, skip: (p - 1) * l, sort: sort || 'createdAt', dir: dir === 'asc' ? 'asc' : 'desc' }
}
function envelope(rows, total, { page, limit }) {
  return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}
module.exports = { parse, envelope }
