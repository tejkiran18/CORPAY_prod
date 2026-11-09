const { prisma } = require('../../db/client')
const { ok } = require('../../lib/response')
const { requireAuthWithEmployee } = require('../../middleware/auth')
const { requirePermission } = require('../../middleware/rbac')
const { AppError } = require('../../lib/errors')

const LLM_URL = 'https://integrations.emergentagent.com/llm/chat/completions'
const LLM_KEY = process.env.EMERGENT_LLM_KEY

async function callLLM(messages, opts = {}) {
  const r = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ model: opts.model || 'gpt-4o-mini', messages, temperature: opts.temperature ?? 0.3, ...(opts.response_format ? { response_format: opts.response_format } : {}) })
  })
  if (!r.ok) throw new AppError(`LLM error: ${await r.text()}`, { status: 502 })
  return r.json()
}

module.exports = [
  ['POST', 'ai/forecast', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('AI:USE')(ctx)
    const body = await req.json()
    const sys = 'You are a senior CFO finance analyst. Respond ONLY with valid JSON: { "headline": "1 punchy sentence", "forecast": "2 sentence forecast for next month", "risks": ["risk 1","risk 2","risk 3"], "actions": ["action 1","action 2","action 3"] }. Currency INR.'
    const data = await callLLM([{ role: 'system', content: sys }, { role: 'user', content: `KPIs JSON:\n${JSON.stringify(body.kpis || {}, null, 2)}` }], { response_format: { type: 'json_object' } })
    let parsed = null; try { parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}') } catch { parsed = { headline: 'No insight' } }
    return ok({ insight: parsed, model: data?.model })
  }],
  ['POST', 'ai/coach', async (req, ctx) => {
    await requireAuthWithEmployee(req, ctx)
    requirePermission('AI:USE')(ctx)
    const { question, history = [] } = await req.json()
    const policy = await prisma.policy.findFirst({ where: { organizationId: ctx.orgId, isDefault: true }, include: { rules: true } })
    const budgets = await prisma.budget.findMany({ where: { organizationId: ctx.orgId, status: 'ACTIVE' } })
    const context = {
      policy: { name: policy?.name, rules: policy?.rules?.map(r => ({ type: r.ruleType, field: r.field, op: r.operator, value: r.valueNumeric || r.valueText, action: r.actionOnViolation, message: r.message })) || [] },
      budgets: budgets.map(b => ({ name: b.name, type: b.type, allocated: b.amount, spent: b.spent, remaining: Number(b.amount) - Number(b.spent) })),
    }
    const sys = `You are CORPAY Policy Coach. Answer using ONLY the policy rules & budgets in context. Cite exact limits. Keep answers to 3 sentences. Currency INR.\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`
    const messages = [{ role: 'system', content: sys }, ...history.slice(-6), { role: 'user', content: question }]
    const data = await callLLM(messages, { temperature: 0.4 })
    return ok({ answer: data?.choices?.[0]?.message?.content || '', model: data?.model })
  }],
]
