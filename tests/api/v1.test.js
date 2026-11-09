// 55 API tests hitting /api/v1/*. Requires the Next.js server to be running on localhost:3000.
const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1'

const tests = []
const t = (n, fn) => tests.push({ name: n, fn })

async function req(path, opts = {}) {
  const r = await fetch(BASE + '/' + path.replace(/^\/+/, ''), { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } })
  const ct = r.headers.get('content-type') || ''
  const body = ct.includes('json') ? await r.json() : await r.text()
  return { status: r.status, body, headers: Object.fromEntries(r.headers.entries()) }
}

let TOK_ANIKA, TOK_TEJ, TOK_ROHIT, EMP_TEJ, EMP_VIKRAM

t('SETUP: seed via admin route', async () => {
  const r = await req('admin/seed', { method: 'POST' })
  assertEq(r.status, 200)
  assert(r.body.data.counts.employees >= 5)
})
t('SETUP: login Anika',   async () => { const r = await req('auth/login', { method: 'POST', body: JSON.stringify({ email: 'anika@eppsinfotech.com', password: 'corpay123' }) }); assertEq(r.status, 200); TOK_ANIKA = r.body.data.token; assert(TOK_ANIKA) })
t('SETUP: login Rohit',   async () => { const r = await req('auth/login', { method: 'POST', body: JSON.stringify({ email: 'rohit@eppsinfotech.com', password: 'corpay123' }) }); TOK_ROHIT = r.body.data.token; assert(TOK_ROHIT) })
t('SETUP: login Tej',     async () => { const r = await req('auth/login', { method: 'POST', body: JSON.stringify({ email: 'tej@eppsinfotech.com', password: 'corpay123' }) }); TOK_TEJ = r.body.data.token; assert(TOK_TEJ) })
t('SETUP: fetch employees', async () => {
  const r = await req('employees', { headers: { Authorization: `Bearer ${TOK_ANIKA}` } })
  EMP_TEJ = r.body.data.find(e => e.name === 'Tej Kiran')
  EMP_VIKRAM = r.body.data.find(e => e.name === 'Vikram Singh')
  assert(EMP_TEJ && EMP_VIKRAM)
})

// Health & auth
t('health returns ok',         async () => { const r = await req('health'); assertEq(r.status, 200); assertEq(r.body.data.status, 'ok') })
t('login invalid email 404',   async () => { const r = await req('auth/login', { method: 'POST', body: JSON.stringify({ email: 'nobody@x.com' }) }); assertEq(r.status, 404) })
t('login missing email 400',   async () => { const r = await req('auth/login', { method: 'POST', body: JSON.stringify({}) }); assertEq(r.status, 400) })
t('login wrong password 401',  async () => { const r = await req('auth/login', { method: 'POST', body: JSON.stringify({ email: 'tej@eppsinfotech.com', password: 'wrong' }) }); assertEq(r.status, 401) })
t('me requires auth',           async () => { const r = await req('auth/me'); assertEq(r.status, 401) })
t('me returns employee',        async () => { const r = await req('auth/me', { headers: { Authorization: `Bearer ${TOK_TEJ}` } }); assertEq(r.body.data.email, 'tej@eppsinfotech.com') })
t('me returns permissions',     async () => { const r = await req('auth/me', { headers: { Authorization: `Bearer ${TOK_TEJ}` } }); assert(Array.isArray(r.body.data.permissions) && r.body.data.permissions.includes('TXN:PAY')) })
t('bad token 401',              async () => { const r = await req('employees', { headers: { Authorization: 'Bearer garbage' } }); assertEq(r.status, 401) })

// Read endpoints (Anika)
const A = () => ({ Authorization: `Bearer ${TOK_ANIKA}` })
t('GET /organizations',         async () => { const r = await req('organizations', { headers: A() }); assertEq(r.status, 200); assertEq(r.body.data.displayName, 'EPPS Infotech') })
t('GET /departments count 3',   async () => { const r = await req('departments', { headers: A() }); assertEq(r.body.data.length, 3) })
t('GET /cost-centers count 3',  async () => { const r = await req('cost-centers', { headers: A() }); assertEq(r.body.data.length, 3) })
t('GET /business-units ≥1',    async () => { const r = await req('business-units', { headers: A() }); assert(r.body.data.length >= 1) })
t('GET /projects count 2',      async () => { const r = await req('projects', { headers: A() }); assertEq(r.body.data.length, 2) })
t('GET /project-types ≥1',      async () => { const r = await req('project-types', { headers: A() }); assert(r.body.data.length >= 1) })
t('GET /employees paginated',   async () => { const r = await req('employees?limit=3', { headers: A() }); assertEq(r.body.data.length, 3); assertEq(r.body.meta.limit, 3) })
t('GET /employees/:id',         async () => { const r = await req(`employees/${EMP_TEJ.id}`, { headers: A() }); assertEq(r.body.data.name, 'Tej Kiran') })
t('GET /budgets count 4',       async () => { const r = await req('budgets', { headers: A() }); assertEq(r.body.data.length, 4) })
t('GET /budgets filter type',   async () => { const r = await req('budgets?type=TRAVEL', { headers: A() }); r.body.data.forEach(b => assertEq(b.type, 'TRAVEL')) })
t('GET /policies has 1 default',async () => { const r = await req('policies', { headers: A() }); assert(r.body.data.some(p => p.isDefault)) })
t('GET /policies/:id rules',    async () => { const list = (await req('policies', { headers: A() })).body.data; const p = list[0]; const r = await req(`policies/${p.id}`, { headers: A() }); assert(r.body.data.rules.length >= 9) })
t('GET /merchants ≥10',        async () => { const r = await req('merchants', { headers: A() }); assert(r.body.data.length >= 10) })
t('GET /merchant-categories',   async () => { const r = await req('merchant-categories', { headers: A() }); assert(r.body.data.length >= 5) })
t('GET /transaction-categories',async () => { const r = await req('transaction-categories', { headers: A() }); assert(r.body.data.length >= 9) })
t('GET /spending-rights ≥2',   async () => { const r = await req('spending-rights', { headers: A() }); assert(r.body.data.length >= 2) })
t('GET /transactions paginated',async () => { const r = await req('transactions?limit=5', { headers: A() }); assertEq(r.body.data.length, 5); assert(r.body.meta.total >= 10) })
t('GET /transactions filter approved', async () => { const r = await req('transactions?status=approved', { headers: A() }); r.body.data.forEach(x => assertEq(x.paymentStatus, 'APPROVED')) })
t('GET /transactions search',   async () => { const r = await req('transactions?search=Paradise', { headers: A() }); r.body.data.forEach(x => assert(/paradise/i.test(x.merchantName))) })
t('GET /approvals ≥1 pending',  async () => { const r = await req('approvals?status=pending', { headers: A() }); assert(r.body.data.length >= 1) })
t('GET /approval-workflows',    async () => { const r = await req('approval-workflows', { headers: A() }); assert(r.body.data.length >= 1) })
t('GET /business-events',       async () => { const r = await req('business-events', { headers: A() }); assert(r.body.data.length >= 1) })

// Analytics
t('GET /analytics/kpis shape',  async () => { const r = await req('analytics/kpis', { headers: A() }); const d = r.body.data; assert('totalAllocated' in d && 'byDept' in d && 'monthly' in d) })
t('GET /analytics/cost-centers 3', async () => { const r = await req('analytics/cost-centers', { headers: A() }); assertEq(r.body.data.length, 3) })
t('GET /analytics/monthly-closure', async () => { const r = await req('analytics/monthly-closure', { headers: A() }); assert('totalSpent' in r.body.data) })
t('GET /analytics/monthly-closure with month', async () => { const r = await req('analytics/monthly-closure?month=2025-06', { headers: A() }); assertEq(typeof r.body.data.month, 'string') })

// RBAC
t('Employee cannot create budget',   async () => { const r = await req('budgets', { method: 'POST', headers: { Authorization: `Bearer ${TOK_TEJ}` }, body: JSON.stringify({ name: 'X', type: 'TRAVEL', amount: 100, startDate: '2025-06-01', endDate: '2025-06-30' }) }); assertEq(r.status, 403) })
t('Employee cannot read audit',      async () => { const r = await req('audit', { headers: { Authorization: `Bearer ${TOK_TEJ}` } }); assertEq(r.status, 403) })
t('Finance Head cannot pay',          async () => { const r = await req('transactions/validate', { method: 'POST', headers: A(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 100, categoryName: 'Food & Dining' }) }); assertEq(r.status, 403) })
t('Employee cannot approve',          async () => { const list = (await req('approvals?status=pending', { headers: A() })).body.data; if (!list.length) return; const r = await req(`approvals/${list[0].id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${TOK_TEJ}` }, body: '{}' }); assertEq(r.status, 403) })

// Validation & pay flow (Tej)
const T = () => ({ Authorization: `Bearer ${TOK_TEJ}` })
t('POST /transactions/validate 800 food = approved',       async () => { const r = await req('transactions/validate', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 800, categoryName: 'Food & Dining' }) }); assert(r.body.data.allowed && !r.body.data.requiresApproval) })
t('POST /transactions/validate 2000 food = approval',      async () => { const r = await req('transactions/validate', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 2000, categoryName: 'Food & Dining' }) }); assert(r.body.data.allowed && r.body.data.requiresApproval) })
t('POST /transactions/validate 500 restricted = blocked',  async () => { const r = await req('transactions/validate', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 500, categoryName: 'Entertainment' }) }); assert(!r.body.data.allowed) })
t('POST /transactions/validate 15000 = blocked per-txn',   async () => { const r = await req('transactions/validate', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 15000, categoryName: 'Food & Dining' }) }); assert(!r.body.data.allowed) })
t('POST /transactions/pay approved',                       async () => { const r = await req('transactions/pay', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 300, categoryName: 'Food & Dining', merchantName: 'API Test 1' }) }); assertEq(r.body.data.status, 'APPROVED'); assert(r.body.data.transaction.reference) })
t('POST /transactions/pay pending',                        async () => { const r = await req('transactions/pay', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 6900, categoryName: 'Hotel & Stay', merchantName: 'API Test Pending' }) }); assertEq(r.body.data.status, 'PENDING') })
t('POST /transactions/pay rejected',                       async () => { const r = await req('transactions/pay', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 200, categoryName: 'Entertainment', merchantName: 'Rejected Test' }) }); assertEq(r.body.data.status, 'REJECTED') })

// Approve/Reject flow (Rohit)
let PENDING_ID
t('Setup pending for approval flow', async () => { const r = await req('transactions/pay', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 6100, categoryName: 'Hotel & Stay', merchantName: 'Approve Flow' }) }); PENDING_ID = r.body.data.approval.id })
t('Rohit can approve',               async () => { const r = await req(`approvals/${PENDING_ID}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${TOK_ROHIT}` }, body: JSON.stringify({ note: 'ok' }) }); assertEq(r.status, 200); assertEq(r.body.data.status, 'APPROVED') })
t('Approved approval cannot be re-approved', async () => { const r = await req(`approvals/${PENDING_ID}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${TOK_ROHIT}` }, body: '{}' }); assertEq(r.status, 404) })

// Reject flow
let PENDING2
t('Setup another pending', async () => { const r = await req('transactions/pay', { method: 'POST', headers: T(), body: JSON.stringify({ employeeId: EMP_TEJ.id, amount: 6300, categoryName: 'Hotel & Stay', merchantName: 'Reject Flow' }) }); PENDING2 = r.body.data.approval.id })
t('Rohit can reject',                 async () => { const r = await req(`approvals/${PENDING2}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${TOK_ROHIT}` }, body: JSON.stringify({ note: 'no' }) }); assertEq(r.status, 200); assertEq(r.body.data.status, 'REJECTED') })

// CSV export
t('GET /transactions/export/csv content-type', async () => { const r = await req('transactions/export/csv', { headers: A() }); assert((r.headers['content-type']||'').includes('text/csv')); assert((r.headers['content-disposition']||'').includes('.csv')) })
t('GET /transactions/export/csv has header',   async () => { const r = await req('transactions/export/csv', { headers: A() }); assert(r.body.startsWith('TxnID,Date,')) })

// Audit read (Anika has permission)
t('GET /audit paginated',       async () => { const r = await req('audit?limit=5', { headers: A() }); assertEq(r.body.data.length, 5); assert(r.body.meta.total >= 1) })
t('GET /audit filter action',   async () => { const r = await req('audit?action=PAYMENT', { headers: A() }); r.body.data.forEach(x => assertEq(x.action, 'PAYMENT')) })

// Legacy shim
t('Legacy /api/kpis 307 -> v1', async () => {
  const r = await fetch('http://localhost:3000/api/kpis', { redirect: 'manual' })
  assertEq(r.status, 307)
  assert((r.headers.get('location')||'').includes('/api/v1/analytics/kpis'))
})
t('Legacy /api/pay 307',        async () => { const r = await fetch('http://localhost:3000/api/pay', { method: 'POST', redirect: 'manual' }); assertEq(r.status, 307); assert(r.headers.get('location').includes('/api/v1/transactions/pay')) })

module.exports = tests
