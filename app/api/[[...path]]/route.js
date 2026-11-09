import { NextResponse } from 'next/server'

// Legacy /api/* endpoints have been REPLACED by /api/v1/*.
// This shim redirects (307) all legacy calls to the versioned equivalents
// so any stale client is guided to the new URLs without silently 404-ing.
// All backend logic now lives in /app/src/modules and hits PostgreSQL via Prisma.

const MAP = new Map([
  ['seed',                       'admin/seed'],
  ['health',                     'health'],
  ['organizations',              'organizations'],
  ['departments',                'departments'],
  ['projects',                   'projects'],
  ['employees',                  'employees'],
  ['budgets',                    'budgets'],
  ['policies',                   'policies'],
  ['transactions',               'transactions'],
  ['approvals',                  'approvals'],
  ['kpis',                       'analytics/kpis'],
  ['kpis/cost-centers',          'analytics/cost-centers'],
  ['kpis/monthly-closure',       'analytics/monthly-closure'],
  ['validate-spend',             'transactions/validate'],
  ['pay',                        'transactions/pay'],
  ['login',                      'auth/login'],
  ['transactions/export',        'transactions/export/csv'],
  ['llm/forecast',               'ai/forecast'],
  ['llm/coach',                  'ai/coach'],
])

function resolve(pathParts) {
  const joined = pathParts.join('/')
  if (MAP.has(joined)) return `/api/v1/${MAP.get(joined)}`
  // /api/approvals/{id}/approve -> /api/v1/approvals/{id}/approve
  if (pathParts[0] === 'approvals' && pathParts[2]) return `/api/v1/approvals/${pathParts[1]}/${pathParts[2]}`
  // /api/{collection}/{id} passthrough
  const collections = ['organizations','departments','projects','employees','budgets','policies','transactions','approvals']
  if (collections.includes(pathParts[0])) return `/api/v1/${joined}`
  return null
}

async function handle(req, ctx) {
  const params = await ctx.params
  const parts = params?.path || []
  const target = resolve(parts)
  if (!target) return NextResponse.json({ error: `Legacy endpoint /${parts.join('/')} removed. Use /api/v1/*` }, { status: 410 })
  const url = new URL(req.url)
  const dest = `${url.origin}${target}${url.search}`
  return NextResponse.redirect(dest, 307)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
