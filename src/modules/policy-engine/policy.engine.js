// Data-driven Policy Engine.
// Interprets rows from `policy_rules` table against a SpendContext and returns a decision.
//   Context: { amount, categoryName, merchantMcc, employeeId, occurredAt, dailySpent, weeklySpent, monthlySpent }
//   Decision: { allowed: bool, requiresApproval: bool, severity, actions: [{ ruleId, message, action }] }
// No hardcoded business rules; every branch is driven by a PolicyRule row.

const { prisma } = require('../../db/client')

const OPS = {
  EQ:       (a, b) => a === b,
  NEQ:      (a, b) => a !== b,
  GT:       (a, b) => Number(a) >   Number(b),
  GTE:      (a, b) => Number(a) >=  Number(b),
  LT:       (a, b) => Number(a) <   Number(b),
  LTE:      (a, b) => Number(a) <=  Number(b),
  IN:       (a, list) => (Array.isArray(list) ? list : String(list).split(',')).includes(a),
  NOT_IN:   (a, list) => !(Array.isArray(list) ? list : String(list).split(',')).includes(a),
  CONTAINS: (a, needle) => String(a || '').toLowerCase().includes(String(needle).toLowerCase()),
  BETWEEN:  (a, pair) => { const [lo, hi] = Array.isArray(pair) ? pair : String(pair).split(','); return Number(a) >= Number(lo) && Number(a) <= Number(hi) },
}

// Map a rule + context to the actual left-hand and right-hand values.
function extract(rule, ctx) {
  const right = rule.valueNumeric !== null && rule.valueNumeric !== undefined ? Number(rule.valueNumeric)
              : rule.valueJson ?? rule.valueText
  switch (rule.ruleType) {
    case 'PER_TRANSACTION_LIMIT': return { left: ctx.amount, right }
    case 'DAILY_LIMIT':           return { left: (ctx.dailySpent || 0) + ctx.amount, right }
    case 'WEEKLY_LIMIT':          return { left: (ctx.weeklySpent || 0) + ctx.amount, right }
    case 'MONTHLY_LIMIT':         return { left: (ctx.monthlySpent || 0) + ctx.amount, right }
    case 'APPROVAL_THRESHOLD':    return { left: ctx.amount, right }
    case 'CATEGORY_LIMIT':        return rule.field === ctx.categoryName ? { left: ctx.amount, right } : null
    case 'ALLOWED_CATEGORY':      return { left: ctx.categoryName, right }
    case 'RESTRICTED_CATEGORY':   return { left: ctx.categoryName, right: rule.valueText || rule.field }
    case 'MERCHANT_RULE':         return { left: ctx.merchantMcc || '', right: rule.valueText }
    case 'TIME_RULE':             return { left: ctx.occurredAt ? new Date(ctx.occurredAt).getUTCHours() : new Date().getUTCHours(), right }
    case 'VELOCITY_RULE':         return { left: ctx.recentTxnCount || 0, right }
    default: return null
  }
}

function ruleTriggers(rule, ctx) {
  const parts = extract(rule, ctx)
  if (!parts) return false                    // rule not applicable to this ctx
  const fn = OPS[rule.operator]
  if (!fn) return false
  const holds = fn(parts.left, parts.right)
  // LTE-style rule is a "limit": we FIRE the action when the value EXCEEDS the limit — i.e. NOT holds.
  // For explicit list rules (RESTRICTED_CATEGORY EQ, MERCHANT_RULE EQ), holding == violation.
  if (['PER_TRANSACTION_LIMIT','DAILY_LIMIT','WEEKLY_LIMIT','MONTHLY_LIMIT','APPROVAL_THRESHOLD','CATEGORY_LIMIT'].includes(rule.ruleType) && ['LTE','LT','GTE','GT'].includes(rule.operator)) {
    return !holds
  }
  return holds
}

async function evaluate(policyId, ctx) {
  const rules = await prisma.policyRule.findMany({ where: { policyId, active: true }, orderBy: { sortOrder: 'asc' } })
  const actions = []
  for (const r of rules) {
    if (!ruleTriggers(r, ctx)) continue
    actions.push({ ruleId: r.id, ruleType: r.ruleType, action: r.actionOnViolation, message: r.message || r.ruleType })
    if (r.actionOnViolation === 'BLOCK') break                          // hard stop
  }
  const blocked = actions.find(a => a.action === 'BLOCK')
  const needsApproval = actions.find(a => a.action === 'REQUIRE_APPROVAL')
  return {
    allowed: !blocked,
    requiresApproval: !blocked && !!needsApproval,
    severity: blocked ? 'danger' : (needsApproval ? 'warning' : 'success'),
    reason: (blocked || needsApproval || actions[0])?.message || 'Within policy',
    actions,
  }
}

module.exports = { evaluate, OPS, ruleTriggers }
