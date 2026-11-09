'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, Shield, BarChart3, ScanLine, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const SLIDES = [
  { icon: Wallet, badge: 'PROBLEM', title: 'Money loses governance the moment it leaves the company.', body: 'Advance → employee spending → bills → Excel → finance team. Visibility is reactive and reconciliation is painful.', accent: 'from-red-500 to-orange-500' },
  { icon: Shield, badge: 'CORPAY', title: 'A spending governance layer over UPI rails.', body: 'Allocate budgets, set policies and approval rules — BEFORE employees spend. Every UPI tap is validated in real-time.', accent: 'from-blue-500 to-indigo-600' },
  { icon: ScanLine, badge: 'SCAN · PAY', title: 'Employees scan QR. CORPAY validates instantly.', body: 'Budget available? Category allowed? Daily limit? Approval needed? All checked before money moves.', accent: 'from-emerald-500 to-teal-600' },
  { icon: BarChart3, badge: 'INTELLIGENCE', title: 'CFO-grade visibility, every transaction fully attributed.', body: 'Live dashboards across departments, projects, cost-centers. AI-powered forecasts and a Policy Coach.', accent: 'from-purple-500 to-fuchsia-600' },
]
const QUICK = [
  { email: 'anika@eppsinfotech.com', name: 'Anika Reddy', role: 'Finance Head' },
  { email: 'rohit@eppsinfotech.com', name: 'Rohit Sharma', role: 'Department Manager' },
  { email: 'tej@eppsinfotech.com',   name: 'Tej Kiran',   role: 'Employee' },
]

export default function LoginPage() {
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('corpay123')
  const [loading, setLoading] = useState(false)

  useEffect(() => { const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000); return () => clearInterval(t) }, [])

  const login = async (e, overrideEmail = null) => {
    e?.preventDefault?.()
    const useEmail = overrideEmail || email
    if (!useEmail) return toast.error('Enter an email to continue')
    setLoading(true)
    try {
      const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: useEmail, password }) })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error?.message || 'Login failed'); setLoading(false); return }
      localStorage.setItem('corpay_token', d.data.token)
      localStorage.setItem('corpay_user',  JSON.stringify(d.data.user))
      toast.success(`Welcome, ${d.data.user.name}`)
      window.location.href = '/'
    } catch (err) { toast.error('Network error') } finally { setLoading(false) }
  }

  const S = SLIDES[slide]; const Icon = S.icon

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] text-white relative overflow-hidden">
        <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br ${S.accent} opacity-20 blur-3xl transition-all duration-1000`}/>
        <div className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br ${S.accent} opacity-15 blur-3xl transition-all duration-1000`}/>
        <div className="relative flex flex-col w-full p-12">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30"><Wallet className="w-5 h-5 text-white"/></div>
            <div><div className="font-bold text-white tracking-tight text-xl leading-none">CORPAY</div><div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Spend Governance Platform</div></div>
          </div>
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className={`inline-flex w-fit items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest bg-gradient-to-r ${S.accent} text-white shadow-lg mb-6`}><Icon className="w-3 h-3"/> {S.badge}</div>
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1] mb-4">{S.title}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">{S.body}</p>
            <div className="flex gap-2 mt-10">{SLIDES.map((_, i) => (<button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-10 bg-white' : 'w-5 bg-white/30 hover:bg-white/50'}`}/>))}</div>
          </div>
          <div className="text-xs text-slate-500">© 2025 CORPAY · Built for India&apos;s UPI ecosystem · Powered by PostgreSQL</div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-10"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center"><Wallet className="w-5 h-5 text-white"/></div><div><div className="font-bold text-slate-900 tracking-tight text-xl leading-none">CORPAY</div><div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Spend Governance</div></div></div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1.5">Sign in to your CORPAY workspace</p>
          <form onSubmit={login} className="mt-8 space-y-4">
            <div><Label htmlFor="email" className="text-xs font-semibold text-slate-700">Work Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1.5 h-11" autoFocus/></div>
            <div><div className="flex items-center justify-between"><Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label></div><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 h-11"/></div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <>Sign in <ArrowRight className="w-4 h-4"/></>}</Button>
          </form>
          <div className="mt-8">
            <div className="flex items-center gap-3"><div className="flex-1 h-px bg-slate-200"/><span className="text-[10px] text-slate-400 font-semibold tracking-widest">QUICK DEMO ACCESS</span><div className="flex-1 h-px bg-slate-200"/></div>
            <div className="mt-4 space-y-2">
              {QUICK.map(q => (
                <button key={q.email} onClick={(e) => { setEmail(q.email); login(e, q.email) }} disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left disabled:opacity-50">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-bold">{q.name.split(' ').map(s=>s[0]).join('')}</div>
                  <div className="flex-1"><div className="text-sm font-semibold text-slate-900">{q.name}</div><div className="text-[11px] text-slate-500">{q.role} · {q.email}</div></div>
                  <ArrowRight className="w-4 h-4 text-slate-400"/>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-10 text-center text-xs text-slate-400">Now backed by PostgreSQL (Neon) · JWT auth · RBAC · immutable audit log</div>
        </div>
      </div>
    </div>
  )
}
