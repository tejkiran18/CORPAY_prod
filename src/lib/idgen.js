// Human-readable transaction reference: TXN-YYYYMMDD-XXXXXX (base32)
const BASE32 = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no I/L/O/0/1 confusables
function rand(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += BASE32[Math.floor(Math.random() * BASE32.length)]
  return s
}
function txnRef(now = new Date()) {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `TXN-${y}${m}${d}-${rand(6)}`
}
module.exports = { txnRef, rand }
