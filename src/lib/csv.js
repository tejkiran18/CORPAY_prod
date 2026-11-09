function escape(v) {
  if (v === null || v === undefined) return ''
  const s = String(v).replace(/"/g, '""')
  return /[",\n]/.test(s) ? `"${s}"` : s
}
function toCsv(rows, columns) {
  const header = columns.map(c => c.header || c.key).join(',')
  const body = rows.map(r => columns.map(c => escape(typeof c.map === 'function' ? c.map(r) : r[c.key])).join(',')).join('\n')
  return `${header}\n${body}`
}
module.exports = { toCsv, escape }
