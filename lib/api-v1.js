// Frontend v1 API client. Attaches JWT + unwraps {data} envelope.
// Kept intentionally tiny to avoid ceremony.
export function getToken() { if (typeof window === 'undefined') return null; return localStorage.getItem('corpay_token') }
export function getUser()  { try { return JSON.parse(localStorage.getItem('corpay_user') || 'null') } catch { return null } }
export function logout()   { localStorage.removeItem('corpay_token'); localStorage.removeItem('corpay_user'); window.location.href = '/login' }

export async function api(path, { method = 'GET', body, raw = false, headers = {} } = {}) {
  const token = getToken()
  const h = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }
  const res = await fetch(`/api/v1/${path.replace(/^\/+/, '')}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  if (raw) return res
  if (res.status === 401) { logout(); throw new Error('Session expired') }
  const json = await res.json().catch(() => ({ error: { message: 'Bad response' } }))
  if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`)
  return json.data
}

export const api_v1 = {
  auth: {
    me:    ()      => api('auth/me'),
    login: (email, password) => api('auth/login', { method: 'POST', body: { email, password } }),
  },
  org:          () => api('organizations'),
  departments:  () => api('departments'),
  projects:     () => api('projects'),
  employees:    () => api('employees'),
  budgets:      () => api('budgets'),
  policies:     () => api('policies'),
  transactions: (q = '') => api('transactions' + (q ? `?${q}` : '')),
  approvals:    () => api('approvals'),
  kpis:         () => api('analytics/kpis'),
  costCenters:  () => api('analytics/cost-centers'),
  monthlyClosure: (month) => api('analytics/monthly-closure' + (month ? `?month=${month}` : '')),
  validate: (payload) => api('transactions/validate', { method: 'POST', body: payload }),
  pay:      (payload) => api('transactions/pay',      { method: 'POST', body: payload }),
  approve:  (id, note) => api(`approvals/${id}/approve`, { method: 'POST', body: { note } }),
  reject:   (id, note) => api(`approvals/${id}/reject`,  { method: 'POST', body: { note } }),
  ai: {
    forecast: (kpis) => api('ai/forecast', { method: 'POST', body: { kpis } }),
    coach: (question, history = []) => api('ai/coach', { method: 'POST', body: { question, history } }),
  },
  admin: {
    seed: () => api('admin/seed', { method: 'POST' }),
    stats: () => api('admin/stats'),
  },
}
