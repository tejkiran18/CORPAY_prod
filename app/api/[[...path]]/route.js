import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME && process.env.DB_NAME !== 'your_database_name'
  ? process.env.DB_NAME
  : 'corpay'

let cached = global._mongo
if (!cached) cached = global._mongo = { client: null, db: null }

async function getDb() {
  if (cached.db) return cached.db
  const client = new MongoClient(MONGO_URL)
  await client.connect()
  cached.client = client
  cached.db = client.db(DB_NAME)
  return cached.db
}

const ok = (data, status = 200) => NextResponse.json(data, { status })
const err = (message, status = 400) => NextResponse.json({ error: message }, { status })

function stripId(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

// ---------- SEED ----------
async function seed() {
  const db = await getDb()
  const cols = ['organizations','departments','projects','employees','budgets','policies','transactions','approvals']
  for (const c of cols) await db.collection(c).deleteMany({})

  const orgId = uuidv4()
  await db.collection('organizations').insertOne({
    id: orgId, name: 'EPPS Infotech', gst: '36AABCE1234F1Z5', currency: 'INR',
    address: 'Hyderabad, Telangana, India', createdAt: new Date()
  })

  const departments = [
    { id: uuidv4(), orgId, name: 'Finance', head: 'Finance Manager', costCenter: 'CC-FIN-001' },
    { id: uuidv4(), orgId, name: 'Operations', head: 'Tej Kiran', costCenter: 'CC-OPS-001' },
    { id: uuidv4(), orgId, name: 'Projects', head: 'Project Manager', costCenter: 'CC-PRJ-001' },
  ]
  await db.collection('departments').insertMany(departments)

  const projects = [
    { id: uuidv4(), orgId, name: 'NDV ERP', code: 'NDV-001', client: 'NDV Industries', status: 'Active', budgetCap: 1500000 },
    { id: uuidv4(), orgId, name: 'Yard ERP', code: 'YARD-002', client: 'Yard Logistics', status: 'Active', budgetCap: 900000 },
  ]
  await db.collection('projects').insertMany(projects)

  const employees = [
    { id: uuidv4(), orgId, name: 'Tej Kiran', email: 'tej@eppsinfotech.com', role: 'Employee', designation: 'Senior Engineer', departmentId: departments[1].id, projectId: projects[0].id, phone: '+91 98765 43210' },
    { id: uuidv4(), orgId, name: 'Anika Reddy', email: 'anika@eppsinfotech.com', role: 'Finance Head', designation: 'Finance Manager', departmentId: departments[0].id, projectId: null, phone: '+91 98765 11122' },
    { id: uuidv4(), orgId, name: 'Rohit Sharma', email: 'rohit@eppsinfotech.com', role: 'Department Manager', designation: 'Project Manager', departmentId: departments[2].id, projectId: projects[1].id, phone: '+91 98765 22233' },
    { id: uuidv4(), orgId, name: 'Priya Nair', email: 'priya@eppsinfotech.com', role: 'Finance Executive', designation: 'Finance Executive', departmentId: departments[0].id, projectId: null, phone: '+91 98765 33344' },
    { id: uuidv4(), orgId, name: 'Vikram Singh', email: 'vikram@eppsinfotech.com', role: 'Employee', designation: 'Field Engineer', departmentId: departments[1].id, projectId: projects[1].id, phone: '+91 98765 55566' },
  ]
  await db.collection('employees').insertMany(employees)

  const tej = employees[0]
  const vikram = employees[4]

  const budgets = [
    {
      id: uuidv4(), orgId, name: 'Hyderabad Client Visit', type: 'Travel',
      amount: 25000, spent: 0, startDate: '2025-06-01', endDate: '2025-06-15',
      costCenter: 'CC-OPS-001', projectId: projects[0].id, employeeId: tej.id,
      breakdown: { food: 3000, hotel: 10000, travel: 12000 },
      approvalRequired: false, status: 'Active', createdAt: new Date()
    },
    {
      id: uuidv4(), orgId, name: 'NDV ERP Implementation', type: 'Project',
      amount: 250000, spent: 84500, startDate: '2025-05-01', endDate: '2025-09-30',
      costCenter: 'CC-PRJ-001', projectId: projects[0].id, employeeId: null,
      breakdown: { food: 30000, hotel: 80000, travel: 90000, misc: 50000 },
      approvalRequired: true, status: 'Active', createdAt: new Date()
    },
    {
      id: uuidv4(), orgId, name: 'Operations Monthly', type: 'Department',
      amount: 180000, spent: 67200, startDate: '2025-06-01', endDate: '2025-06-30',
      costCenter: 'CC-OPS-001', projectId: null, employeeId: null,
      breakdown: { food: 40000, hotel: 60000, travel: 80000 },
      approvalRequired: false, status: 'Active', createdAt: new Date()
    },
    {
      id: uuidv4(), orgId, name: 'Vikram Field Allowance', type: 'Employee',
      amount: 15000, spent: 4200, startDate: '2025-06-01', endDate: '2025-06-30',
      costCenter: 'CC-OPS-001', projectId: projects[1].id, employeeId: vikram.id,
      breakdown: { food: 5000, travel: 10000 },
      approvalRequired: false, status: 'Active', createdAt: new Date()
    },
  ]
  await db.collection('budgets').insertMany(budgets)

  const policies = [{
    id: uuidv4(), orgId, name: 'Default Spending Policy', isDefault: true,
    foodLimit: 1500, hotelLimit: 5000, travelLimit: 4000,
    dailyLimit: 8000, perTransactionLimit: 10000,
    allowedCategories: ['Food & Dining','Hotel & Stay','Travel','Fuel','Office Supplies','Client Meeting'],
    restrictedCategories: ['Entertainment','Alcohol','Personal Shopping'],
    approvalThreshold: 5000, createdAt: new Date()
  }]
  await db.collection('policies').insertMany(policies)

  // Sample historical transactions
  const txns = [
    { merchant: 'Taj Krishna Hyderabad', category: 'Hotel & Stay', amount: 8500, employeeId: tej.id, projectId: projects[0].id, budgetId: budgets[0].id, status: 'Approved', daysAgo: 2 },
    { merchant: 'Paradise Biryani', category: 'Food & Dining', amount: 1240, employeeId: tej.id, projectId: projects[0].id, budgetId: budgets[0].id, status: 'Approved', daysAgo: 2 },
    { merchant: 'Ola Cabs', category: 'Travel', amount: 480, employeeId: tej.id, projectId: projects[0].id, budgetId: budgets[0].id, status: 'Approved', daysAgo: 2 },
    { merchant: 'IndianOil Petrol', category: 'Fuel', amount: 2100, employeeId: vikram.id, projectId: projects[1].id, budgetId: budgets[3].id, status: 'Approved', daysAgo: 1 },
    { merchant: 'Cafe Coffee Day', category: 'Food & Dining', amount: 620, employeeId: vikram.id, projectId: projects[1].id, budgetId: budgets[3].id, status: 'Approved', daysAgo: 1 },
    { merchant: 'OYO Rooms Vizag', category: 'Hotel & Stay', amount: 4200, employeeId: tej.id, projectId: projects[0].id, budgetId: budgets[1].id, status: 'Approved', daysAgo: 5 },
    { merchant: 'Uber India', category: 'Travel', amount: 1450, employeeId: tej.id, projectId: projects[0].id, budgetId: budgets[1].id, status: 'Approved', daysAgo: 5 },
    { merchant: 'Reliance Smart', category: 'Office Supplies', amount: 3200, employeeId: vikram.id, projectId: projects[1].id, budgetId: budgets[2].id, status: 'Approved', daysAgo: 7 },
    { merchant: 'Hard Rock Cafe', category: 'Entertainment', amount: 2800, employeeId: tej.id, projectId: projects[0].id, budgetId: budgets[1].id, status: 'Rejected', daysAgo: 3, reason: 'Restricted category' },
    { merchant: 'ITC Kakatiya', category: 'Hotel & Stay', amount: 12500, employeeId: tej.id, projectId: projects[0].id, budgetId: budgets[1].id, status: 'Pending', daysAgo: 1, reason: 'Exceeds hotel limit, approval required' },
  ]
  const txnDocs = txns.map(t => ({
    id: uuidv4(), orgId,
    merchant: t.merchant, category: t.category, amount: t.amount,
    employeeId: t.employeeId, projectId: t.projectId, budgetId: t.budgetId,
    departmentId: employees.find(e => e.id === t.employeeId)?.departmentId,
    costCenter: departments.find(d => d.id === employees.find(e => e.id === t.employeeId)?.departmentId)?.costCenter,
    status: t.status, approverId: t.status === 'Approved' ? employees[1].id : null,
    reason: t.reason || null,
    date: new Date(Date.now() - t.daysAgo * 86400000),
    method: 'UPI'
  }))
  await db.collection('transactions').insertMany(txnDocs)

  // approvals for pending
  const pending = txnDocs.filter(t => t.status === 'Pending')
  const approvals = pending.map(t => ({
    id: uuidv4(), orgId, transactionId: t.id, requesterId: t.employeeId,
    approverId: employees[2].id, status: 'Pending',
    timeline: [{ at: new Date(), by: 'system', action: 'Requested' }],
    createdAt: new Date()
  }))
  if (approvals.length) await db.collection('approvals').insertMany(approvals)

  return { orgId, employees: employees.length, budgets: budgets.length, transactions: txnDocs.length }
}

// ---------- VALIDATION ENGINE ----------
async function validateSpend({ db, employeeId, amount, category, budgetId }) {
  const employee = await db.collection('employees').findOne({ id: employeeId })
  if (!employee) return { allowed: false, reason: 'Employee not found', severity: 'danger' }

  const policy = await db.collection('policies').findOne({ isDefault: true })
  if (!policy) return { allowed: false, reason: 'No active policy', severity: 'danger' }

  // Restricted category
  if (policy.restrictedCategories?.includes(category)) {
    return { allowed: false, reason: `Category '${category}' is restricted by company policy`, severity: 'danger' }
  }
  if (!policy.allowedCategories?.includes(category)) {
    return { allowed: false, reason: `Category '${category}' not in allowed list`, severity: 'danger' }
  }
  // Per-transaction
  if (amount > policy.perTransactionLimit) {
    return { allowed: false, reason: `Exceeds per-transaction limit \u20B9${policy.perTransactionLimit}`, severity: 'danger' }
  }

  // Budget (resolve first so it's always attached to validation result)
  let budget = null
  if (budgetId) budget = await db.collection('budgets').findOne({ id: budgetId })
  if (!budget) {
    budget = await db.collection('budgets').findOne({ employeeId })
    if (!budget) budget = await db.collection('budgets').findOne({ projectId: employee.projectId })
  }
  if (!budget) return { allowed: false, reason: 'No matching budget allocation found', severity: 'danger' }

  // Category limits
  const catLimits = { 'Food & Dining': policy.foodLimit, 'Hotel & Stay': policy.hotelLimit, 'Travel': policy.travelLimit }
  const catLimit = catLimits[category]
  if (catLimit && amount > catLimit) {
    return { allowed: true, requiresApproval: true, reason: `Exceeds ${category} limit \u20B9${catLimit} \u2014 manager approval required`, severity: 'warning', budget }
  }

  const available = budget.amount - (budget.spent || 0)
  if (amount > available) {
    return { allowed: false, reason: `Insufficient budget. Available \u20B9${available.toLocaleString('en-IN')}`, severity: 'danger', budget }
  }

  // Daily limit
  const since = new Date(); since.setHours(0,0,0,0)
  const todayTxns = await db.collection('transactions').find({ employeeId, status: { $in: ['Approved','Pending'] }, date: { $gte: since } }).toArray()
  const todaySpent = todayTxns.reduce((s,t)=>s+t.amount, 0)
  if (todaySpent + amount > policy.dailyLimit) {
    return { allowed: true, requiresApproval: true, reason: `Exceeds daily limit \u20B9${policy.dailyLimit} \u2014 approval required`, severity: 'warning', budget }
  }

  // Approval threshold
  if (amount > policy.approvalThreshold) {
    return { allowed: true, requiresApproval: true, reason: `Amount exceeds \u20B9${policy.approvalThreshold} threshold \u2014 manager approval required`, severity: 'warning', budget }
  }

  return { allowed: true, requiresApproval: false, reason: 'Within policy and budget', severity: 'success', budget }
}

// ---------- ROUTER ----------
async function handle(req, ctx) {
  try {
    const params = await ctx.params
    const segments = params?.path || []
    const path = segments.join('/')
    const method = req.method
    const db = await getDb()
    const url = new URL(req.url)
    const qp = Object.fromEntries(url.searchParams.entries())

    if (path === '' || path === 'health') return ok({ status: 'ok', service: 'CORPAY', time: new Date() })

    if (path === 'seed' && method === 'POST') { const r = await seed(); return ok({ seeded: true, ...r }) }

    // ----- GET collections -----
    const collectionsMap = {
      'organizations': 'organizations',
      'departments': 'departments',
      'projects': 'projects',
      'employees': 'employees',
      'budgets': 'budgets',
      'policies': 'policies',
      'transactions': 'transactions',
      'approvals': 'approvals',
    }
    if (collectionsMap[path] && method === 'GET') {
      const docs = await db.collection(collectionsMap[path]).find({}).sort({ createdAt: -1, date: -1 }).toArray()
      return ok(docs.map(stripId))
    }
    if (collectionsMap[path] && method === 'POST') {
      const body = await req.json()
      const doc = { id: uuidv4(), createdAt: new Date(), ...body }
      await db.collection(collectionsMap[path]).insertOne(doc)
      return ok(stripId(doc), 201)
    }

    // Single doc by id (excluding action-words like 'export')
    const segIdMatch = segments.length === 2 && collectionsMap[segments[0]] && !['export'].includes(segments[1])
    if (segIdMatch && method === 'GET') {
      const doc = await db.collection(collectionsMap[segments[0]]).findOne({ id: segments[1] })
      if (!doc) return err('Not found', 404)
      return ok(stripId(doc))
    }
    if (segIdMatch && method === 'PUT') {
      const body = await req.json()
      await db.collection(collectionsMap[segments[0]]).updateOne({ id: segments[1] }, { $set: body })
      const doc = await db.collection(collectionsMap[segments[0]]).findOne({ id: segments[1] })
      return ok(stripId(doc))
    }
    if (segIdMatch && method === 'DELETE') {
      await db.collection(collectionsMap[segments[0]]).deleteOne({ id: segments[1] })
      return ok({ deleted: true })
    }

    // ---- Validate ----
    if (path === 'validate-spend' && method === 'POST') {
      const body = await req.json()
      const r = await validateSpend({ db, ...body })
      if (r.budget) r.budget = stripId(r.budget)
      return ok(r)
    }

    // ---- Pay (commit transaction) ----
    if (path === 'pay' && method === 'POST') {
      const body = await req.json()
      const { employeeId, amount, category, merchant, projectId, budgetId } = body
      const v = await validateSpend({ db, employeeId, amount, category, budgetId })
      if (v.budget) v.budget = stripId(v.budget)
      if (!v.allowed) return ok({ success: false, status: 'Rejected', validation: v })

      const employee = await db.collection('employees').findOne({ id: employeeId })
      const department = await db.collection('departments').findOne({ id: employee?.departmentId })
      const budget = v.budget
      const status = v.requiresApproval ? 'Pending' : 'Approved'

      const txn = {
        id: uuidv4(), orgId: employee?.orgId,
        merchant, category, amount,
        employeeId, projectId: projectId || employee?.projectId,
        budgetId: budget?.id,
        departmentId: employee?.departmentId,
        costCenter: department?.costCenter,
        status, approverId: null,
        reason: v.reason, date: new Date(), method: 'UPI'
      }
      await db.collection('transactions').insertOne(txn)

      if (status === 'Approved' && budget) {
        await db.collection('budgets').updateOne({ id: budget.id }, { $inc: { spent: amount } })
      }
      if (status === 'Pending') {
        // create approval
        const managers = await db.collection('employees').find({ orgId: employee?.orgId, role: { $in: ['Department Manager','Finance Head'] } }).toArray()
        const approver = managers[0]
        await db.collection('approvals').insertOne({
          id: uuidv4(), orgId: employee?.orgId, transactionId: txn.id, requesterId: employeeId,
          approverId: approver?.id, status: 'Pending',
          timeline: [{ at: new Date(), by: 'system', action: 'Auto-routed for approval', note: v.reason }],
          createdAt: new Date()
        })
      }
      return ok({ success: true, status, validation: v, transaction: stripId(txn) })
    }

    // ---- Approve / Reject ----
    if (segments[0] === 'approvals' && segments[2] && method === 'POST') {
      const aid = segments[1], action = segments[2] // approve | reject
      const body = await req.json().catch(()=>({}))
      const appr = await db.collection('approvals').findOne({ id: aid })
      if (!appr) return err('Approval not found', 404)
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected'
      await db.collection('approvals').updateOne({ id: aid }, {
        $set: { status: newStatus },
        $push: { timeline: { at: new Date(), by: body.by || 'Manager', action: newStatus, note: body.note || '' } }
      })
      await db.collection('transactions').updateOne({ id: appr.transactionId }, { $set: { status: newStatus, approverId: body.approverId || null } })
      if (newStatus === 'Approved') {
        const txn = await db.collection('transactions').findOne({ id: appr.transactionId })
        if (txn?.budgetId) await db.collection('budgets').updateOne({ id: txn.budgetId }, { $inc: { spent: txn.amount } })
      }
      return ok({ updated: true, status: newStatus })
    }

    // ---- KPIs ----
    if (path === 'kpis' && method === 'GET') {
      const [budgets, txns, approvals, departments, projects] = await Promise.all([
        db.collection('budgets').find({}).toArray(),
        db.collection('transactions').find({}).toArray(),
        db.collection('approvals').find({ status: 'Pending' }).toArray(),
        db.collection('departments').find({}).toArray(),
        db.collection('projects').find({}).toArray(),
      ])
      const totalAllocated = budgets.reduce((s,b)=>s+b.amount,0)
      const totalSpent = txns.filter(t=>t.status==='Approved').reduce((s,t)=>s+t.amount,0)
      const pendingCount = approvals.length
      const violations = txns.filter(t=>t.status==='Rejected').length
      const remaining = totalAllocated - totalSpent

      const byDept = departments.map(d => {
        const spent = txns.filter(t => t.status==='Approved' && t.departmentId === d.id).reduce((s,t)=>s+t.amount,0)
        return { name: d.name, spent }
      }).sort((a,b)=>b.spent-a.spent)
      const byProject = projects.map(p => {
        const spent = txns.filter(t => t.status==='Approved' && t.projectId === p.id).reduce((s,t)=>s+t.amount,0)
        return { name: p.name, spent, budget: p.budgetCap }
      }).sort((a,b)=>b.spent-a.spent)
      const byCategory = {}
      txns.filter(t=>t.status==='Approved').forEach(t => { byCategory[t.category] = (byCategory[t.category]||0) + t.amount })
      const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

      // monthly trend (last 6 months)
      const months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const label = d.toLocaleString('en-US', { month: 'short' })
        const monthSpent = txns.filter(t=>t.status==='Approved' && new Date(t.date) >= d && new Date(t.date) < next).reduce((s,t)=>s+t.amount,0)
        const monthAllocated = Math.round(totalAllocated/6)
        months.push({ month: label, spent: monthSpent, allocated: monthAllocated })
      }

      return ok({
        totalAllocated, totalSpent, remaining, pendingCount, violations,
        utilization: totalAllocated ? Math.round((totalSpent/totalAllocated)*100) : 0,
        byDept, byProject, categoryData, monthly: months
      })
    }

    // ---- LLM: Spend Forecast ----
    if (path === 'llm/forecast' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const kpis = body.kpis || null
      const sys = `You are a senior CFO finance analyst. Given the spending KPI JSON, respond ONLY with valid JSON: { "headline": "1 punchy sentence", "forecast": "2 sentence forecast for next month based on burn rate", "risks": ["risk 1","risk 2","risk 3"], "actions": ["recommended action 1","action 2","action 3"] }. No prose outside JSON. Currency is INR. Be specific with numbers when possible.`
      const userMsg = `KPIs JSON:\n${JSON.stringify(kpis, null, 2)}`
      const r = await fetch('https://integrations.emergentagent.com/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EMERGENT_LLM_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      })
      if (!r.ok) return err('LLM error: ' + await r.text(), 500)
      const data = await r.json()
      let parsed = null
      try { parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}') } catch { parsed = { headline: data?.choices?.[0]?.message?.content || 'No insight' } }
      return ok({ insight: parsed, model: data?.model })
    }

    // ---- LLM: Policy Coach ----
    if (path === 'llm/coach' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const { question, history = [], context = null } = body
      let policyContext = context
      if (!policyContext) {
        const policy = await db.collection('policies').findOne({ isDefault: true })
        const budgets = await db.collection('budgets').find({}).toArray()
        policyContext = {
          policy: stripId(policy),
          activeBudgets: budgets.map(b => ({ name: b.name, type: b.type, amount: b.amount, spent: b.spent, available: b.amount - b.spent }))
        }
      }
      const sys = `You are CORPAY Policy Coach, an AI assistant for employees and finance managers at the company. You answer using ONLY the active company policy and budgets provided in context. If asked about something not in policy, say so clearly and suggest the right approver. Keep answers short (max 3 sentences), practical, and use INR (\u20B9). Quote exact limits where relevant.\n\nPOLICY & BUDGETS CONTEXT:\n${JSON.stringify(policyContext, null, 2)}`
      const messages = [
        { role: 'system', content: sys },
        ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: question }
      ]
      const r = await fetch('https://integrations.emergentagent.com/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EMERGENT_LLM_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.4 })
      })
      if (!r.ok) return err('LLM error: ' + await r.text(), 500)
      const data = await r.json()
      const answer = data?.choices?.[0]?.message?.content || ''
      return ok({ answer, model: data?.model })
    }

    // ---- Transactions CSV export ----
    if (path === 'transactions/export' && method === 'GET') {
      const [txns, employees, projects, departments] = await Promise.all([
        db.collection('transactions').find({}).sort({ date: -1 }).toArray(),
        db.collection('employees').find({}).toArray(),
        db.collection('projects').find({}).toArray(),
        db.collection('departments').find({}).toArray(),
      ])
      const empMap = Object.fromEntries(employees.map(e => [e.id, e]))
      const projMap = Object.fromEntries(projects.map(p => [p.id, p]))
      const deptMap = Object.fromEntries(departments.map(d => [d.id, d]))
      const headers = ['TxnID','Date','Merchant','Category','Amount (INR)','Method','Status','Employee','Designation','Department','Cost Center','Project','Reason']
      const escape = (v) => {
        if (v === null || v === undefined) return ''
        const s = String(v).replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      }
      const lines = [headers.join(',')]
      for (const t of txns) {
        const emp = empMap[t.employeeId]
        const proj = projMap[t.projectId]
        const dept = deptMap[t.departmentId]
        lines.push([
          t.id, new Date(t.date).toISOString(), t.merchant, t.category, t.amount, t.method || 'UPI', t.status,
          emp?.name || '', emp?.designation || '', dept?.name || '', t.costCenter || '', proj?.name || '', t.reason || ''
        ].map(escape).join(','))
      }
      const csv = lines.join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="corpay-transactions-${new Date().toISOString().slice(0,10)}.csv"`
        }
      })
    }

    // ---- Cost Center Drilldown ----
    if (path === 'kpis/cost-centers' && method === 'GET') {
      const [budgets, txns, departments] = await Promise.all([
        db.collection('budgets').find({}).toArray(),
        db.collection('transactions').find({}).toArray(),
        db.collection('departments').find({}).toArray(),
      ])
      const ccs = {}
      departments.forEach(d => { ccs[d.costCenter] = { code: d.costCenter, department: d.name, allocated: 0, spent: 0, pending: 0, txnCount: 0, violations: 0 } })
      budgets.forEach(b => {
        const cc = b.costCenter || 'UNASSIGNED'
        if (!ccs[cc]) ccs[cc] = { code: cc, department: '-', allocated: 0, spent: 0, pending: 0, txnCount: 0, violations: 0 }
        ccs[cc].allocated += b.amount
      })
      txns.forEach(t => {
        const cc = t.costCenter || 'UNASSIGNED'
        if (!ccs[cc]) ccs[cc] = { code: cc, department: '-', allocated: 0, spent: 0, pending: 0, txnCount: 0, violations: 0 }
        ccs[cc].txnCount += 1
        if (t.status === 'Approved') ccs[cc].spent += t.amount
        if (t.status === 'Pending') ccs[cc].pending += t.amount
        if (t.status === 'Rejected') ccs[cc].violations += 1
      })
      return ok(Object.values(ccs).map(c => ({ ...c, utilization: c.allocated ? Math.round((c.spent / c.allocated) * 100) : 0, remaining: c.allocated - c.spent })))
    }

    // ---- Monthly Closure ----
    if (path === 'kpis/monthly-closure' && method === 'GET') {
      const month = url.searchParams.get('month') // YYYY-MM
      const ref = month ? new Date(month + '-01') : new Date()
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
      const [txns, departments, projects, budgets] = await Promise.all([
        db.collection('transactions').find({ date: { $gte: start, $lt: end } }).toArray(),
        db.collection('departments').find({}).toArray(),
        db.collection('projects').find({}).toArray(),
        db.collection('budgets').find({}).toArray(),
      ])
      const approved = txns.filter(t => t.status === 'Approved')
      const totalSpent = approved.reduce((s,t)=>s+t.amount,0)
      const totalAllocated = budgets.reduce((s,b)=>s+b.amount,0)
      const byDept = departments.map(d => ({ name: d.name, spent: approved.filter(t => t.departmentId === d.id).reduce((s,t)=>s+t.amount,0) }))
      const byProject = projects.map(p => ({ name: p.name, spent: approved.filter(t => t.projectId === p.id).reduce((s,t)=>s+t.amount,0) }))
      const byCategory = {}
      approved.forEach(t => { byCategory[t.category] = (byCategory[t.category]||0) + t.amount })
      const violations = txns.filter(t => t.status === 'Rejected').length
      const pending = txns.filter(t => t.status === 'Pending').length
      return ok({
        month: `${ref.toLocaleString('en-US', { month: 'long' })} ${ref.getFullYear()}`,
        period: { start, end },
        txnCount: txns.length, approvedCount: approved.length, pending, violations,
        totalSpent, totalAllocated, byDept, byProject,
        byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
        topMerchants: Object.entries(approved.reduce((acc,t)=>{acc[t.merchant]=(acc[t.merchant]||0)+t.amount;return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,amount])=>({name,amount})),
        closureStatus: end < new Date() ? 'Closed' : 'Open'
      })
    }

    // ---- Login (demo) ----
    if (path === 'login' && method === 'POST') {
      const body = await req.json()
      const { email } = body
      const employee = await db.collection('employees').findOne({ email: email?.toLowerCase() })
      if (!employee) return err('No such user. Try tej@eppsinfotech.com / anika@eppsinfotech.com / rohit@eppsinfotech.com', 404)
      return ok({ user: stripId(employee), token: 'demo-jwt-' + employee.id })
    }

    return err(`Unknown route: /${path}`, 404)
  } catch (e) {
    console.error('API error', e)
    return err(e.message || 'Server error', 500)
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
