'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, LayoutDashboard, Building2, Users, Briefcase, FolderTree,
  Receipt, ShieldCheck, FileCheck2, ScanLine, QrCode, Sparkles, Bell,
  Search, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, ChevronRight, Settings, IndianRupee,
  Filter, Download, Crown, Banknote, Hotel, Plane, Utensils, Fuel,
  ShoppingBag, Coffee, ChevronDown, Database, Activity, Target, PieChart as PieIcon,
  CheckCheck, X, Loader2, Zap, BadgeCheck
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

const CATEGORY_ICONS = {
  'Food & Dining': Utensils,
  'Hotel & Stay': Hotel,
  'Travel': Plane,
  'Fuel': Fuel,
  'Office Supplies': ShoppingBag,
  'Client Meeting': Coffee,
  'Entertainment': Sparkles,
}

const ROLES = ['Super Admin', 'Finance Head', 'Finance Executive', 'Department Manager', 'Employee']

// ───────────────────────────────── App ─────────────────────────────────
function App() {
  const [role, setRole] = useState('Finance Head')
  const [view, setView] = useState('finance')
  const [data, setData] = useState({ org: null, departments: [], projects: [], employees: [], budgets: [], policies: [], transactions: [], approvals: [], kpis: null })
  const [loading, setLoading] = useState(true)
  const [bootError, setBootError] = useState(null)

  const refresh = async () => {
    try {
      const [org, departments, projects, employees, budgets, policies, transactions, approvals, kpis] = await Promise.all([
        fetch('/api/organizations').then(r => r.json()).then(d => d[0] || null),
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/budgets').then(r => r.json()),
        fetch('/api/policies').then(r => r.json()),
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/approvals').then(r => r.json()),
        fetch('/api/kpis').then(r => r.json()),
      ])
      setData({ org, departments, projects, employees, budgets, policies, transactions, approvals, kpis })
    } catch (e) {
      setBootError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const orgs = await fetch('/api/organizations').then(r => r.json())
        if (!orgs.length) {
          await fetch('/api/seed', { method: 'POST' })
        }
        await refresh()
      } catch (e) { setBootError(e.message); setLoading(false) }
    })()
  }, [])

  const currentEmployee = useMemo(() => {
    if (role === 'Employee') return data.employees.find(e => e.role === 'Employee') || data.employees[0]
    if (role === 'Finance Head') return data.employees.find(e => e.role === 'Finance Head') || data.employees[0]
    if (role === 'Finance Executive') return data.employees.find(e => e.role === 'Finance Executive') || data.employees[0]
    if (role === 'Department Manager') return data.employees.find(e => e.role === 'Department Manager') || data.employees[0]
    return data.employees[0]
  }, [role, data.employees])

  if (loading) return <BootScreen />
  if (bootError) return <div className="p-10 text-red-600">Failed to load: {bootError}</div>

  const ctx = { data, refresh, role, setRole, view, setView, currentEmployee }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar {...ctx} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar {...ctx} />
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-[1600px] mx-auto">
            {view === 'executive' && <ExecutiveDashboard {...ctx} />}
            {view === 'finance' && <FinanceDashboard {...ctx} />}
            {view === 'wallet' && <WalletDashboard {...ctx} />}
            {view === 'scan' && <ScanPay {...ctx} />}
            {view === 'budgets' && <BudgetsView {...ctx} />}
            {view === 'policies' && <PoliciesView {...ctx} />}
            {view === 'approvals' && <ApprovalsView {...ctx} />}
            {view === 'transactions' && <TransactionsView {...ctx} />}
            {view === 'organization' && <OrganizationView {...ctx} />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ───────────────────────────────── Boot ─────────────────────────────────
function BootScreen() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/30 mb-6 animate-pulse">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <div className="text-white text-2xl font-bold tracking-tight">CORPAY</div>
        <div className="text-slate-400 text-sm mt-2">Initialising spending governance layer…</div>
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto mt-6" />
      </div>
    </div>
  )
}

// ───────────────────────────────── Sidebar ─────────────────────────────────
function Sidebar({ view, setView, role }) {
  const nav = [
    { group: 'OVERVIEW', items: [
      { id: 'executive', label: 'Executive', icon: Crown, roles: ['Super Admin','Finance Head'] },
      { id: 'finance', label: 'Finance Dashboard', icon: LayoutDashboard, roles: ['Super Admin','Finance Head','Finance Executive'] },
      { id: 'wallet', label: 'My Wallet', icon: Wallet, roles: ['Employee','Department Manager'] },
    ]},
    { group: 'SPEND', items: [
      { id: 'scan', label: 'Scan & Pay', icon: ScanLine, roles: ROLES, highlight: true },
      { id: 'transactions', label: 'Transactions', icon: Receipt, roles: ROLES },
      { id: 'approvals', label: 'Approvals', icon: FileCheck2, roles: ROLES },
    ]},
    { group: 'GOVERNANCE', items: [
      { id: 'budgets', label: 'Budgets', icon: Banknote, roles: ['Super Admin','Finance Head','Finance Executive','Department Manager'] },
      { id: 'policies', label: 'Policies', icon: ShieldCheck, roles: ['Super Admin','Finance Head'] },
      { id: 'organization', label: 'Organization', icon: Building2, roles: ['Super Admin','Finance Head'] },
    ]},
  ]
  return (
    <aside className="w-64 bg-[#0F172A] text-slate-200 flex flex-col sticky top-0 h-screen">
      <div className="px-6 py-6 flex items-center gap-2.5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-white tracking-tight text-lg leading-none">CORPAY</div>
          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Spend Governance</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 no-scrollbar">
        {nav.map(g => (
          <div key={g.group} className="mb-6">
            <div className="px-3 mb-2 text-[10px] font-semibold text-slate-500 tracking-widest">{g.group}</div>
            {g.items.filter(i => i.roles.includes(role)).map(i => {
              const Icon = i.icon
              const active = view === i.id
              return (
                <button key={i.id} onClick={() => setView(i.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-sm mb-0.5 transition-all ${
                    active
                      ? 'bg-blue-600/20 text-white ring-1 ring-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}>
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="flex-1">{i.label}</span>
                  {i.highlight && !active && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">UPI</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="m-3 p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 ring-1 ring-blue-500/30">
        <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold mb-1.5">
          <Zap className="w-3.5 h-3.5" /> REAL-TIME GOVERNANCE
        </div>
        <div className="text-[11px] text-slate-300 leading-relaxed">
          Every UPI tap validates against budget, policy &amp; approval rules — before money moves.
        </div>
      </div>
    </aside>
  )
}

// ───────────────────────────────── Top Bar ─────────────────────────────────
function TopBar({ role, setRole, view, data, currentEmployee }) {
  const titles = {
    executive: 'Executive Dashboard',
    finance: 'Finance Dashboard',
    wallet: 'My Wallet',
    scan: 'Scan & Pay',
    budgets: 'Budget Allocation',
    policies: 'Spending Policies',
    approvals: 'Approvals',
    transactions: 'Transactions',
    organization: 'Organization',
  }
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="px-8 h-16 flex items-center gap-6">
        <div>
          <div className="text-[11px] text-slate-500 font-medium">{data.org?.name || 'Organization'}</div>
          <div className="text-base font-semibold text-slate-900 leading-none mt-0.5">{titles[view]}</div>
        </div>

        <div className="flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9 bg-slate-50 border-slate-200 h-9" placeholder="Search transactions, employees, budgets…" />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[180px] h-9 bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-slate-600" />
            {data.approvals?.filter(a => a.status === 'Pending').length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1.5">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-semibold">
                    {(currentEmployee?.name || '?').split(' ').map(s => s[0]).join('').slice(0,2)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">{currentEmployee?.name}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{currentEmployee?.designation}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
              <div className="px-2 pb-2 text-xs text-slate-500">{currentEmployee?.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Settings className="w-4 h-4 mr-2" />Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await fetch('/api/seed', { method: 'POST' }); toast.success('Demo data reset'); location.reload() }}>
                <Database className="w-4 h-4 mr-2" />Reset demo data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

// ───────────────────────────────── KPI Card ─────────────────────────────────
function KPI({ label, value, delta, deltaPositive, icon: Icon, accent = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[accent]}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          {delta !== undefined && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${deltaPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {deltaPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {delta}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
      </CardContent>
    </Card>
  )
}

// ───────────────────────────────── Finance Dashboard ─────────────────────────────────
function FinanceDashboard({ data, setView }) {
  const k = data.kpis || {}
  const COLORS = ['#2563EB','#16A34A','#F59E0B','#7C3AED','#DC2626','#0EA5E9']
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Spend Governance Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time visibility across budgets, departments and projects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4" />Export</Button>
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4" />New Budget</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Allocated" value={inr(k.totalAllocated)} icon={Target} accent="blue" delta="12%" deltaPositive />
        <KPI label="Total Spend" value={inr(k.totalSpent)} icon={TrendingUp} accent="green" delta={`${k.utilization}% util`} deltaPositive />
        <KPI label="Remaining Budget" value={inr(k.remaining)} icon={Banknote} accent="slate" />
        <KPI label="Pending Approvals" value={k.pendingCount || 0} icon={Clock} accent="amber" delta={`${k.violations} violations`} deltaPositive={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Spend vs Allocation</CardTitle>
              <Tabs defaultValue="6m" className="w-auto">
                <TabsList className="h-7"><TabsTrigger value="6m" className="text-xs h-6">6M</TabsTrigger><TabsTrigger value="1y" className="text-xs h-6">1Y</TabsTrigger></TabsList>
              </Tabs>
            </div>
            <CardDescription className="text-xs">Monthly trend across all budgets</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pr-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={k.monthly || []}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16A34A" stopOpacity={0.25}/><stop offset="95%" stopColor="#16A34A" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v/1000) + 'k'} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v) => inr(v)} />
                <Area type="monotone" dataKey="allocated" stroke="#2563EB" strokeWidth={2} fill="url(#g1)" name="Allocated" />
                <Area type="monotone" dataKey="spent" stroke="#16A34A" strokeWidth={2} fill="url(#g2)" name="Spent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Spend by Category</CardTitle><CardDescription className="text-xs">Where money is going</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={k.categoryData || []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(k.categoryData || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {(k.categoryData || []).slice(0,5).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }}/><span className="text-slate-700">{c.name}</span></div>
                  <span className="font-semibold text-slate-900">{inr(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Departments by Spend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={k.byDept || []} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + v/1000 + 'k'}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={90}/>
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}/>
                <Bar dataKey="spent" fill="#2563EB" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div><CardTitle className="text-base">Recent Transactions</CardTitle><CardDescription className="text-xs">Real-time UPI activity</CardDescription></div>
            <Button variant="ghost" size="sm" onClick={() => setView('transactions')} className="text-xs">View all <ChevronRight className="w-3 h-3 ml-0.5"/></Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              {(data.transactions || []).slice(0,5).map(t => <TxnRow key={t.id} txn={t} employees={data.employees} compact />)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ───────────────────────────────── Executive Dashboard ─────────────────────────────────
function ExecutiveDashboard({ data }) {
  const k = data.kpis || {}
  const utilization = k.utilization || 0
  return (
    <div className="space-y-6">
      <div className="rounded-2xl gradient-card p-8 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold mb-2"><Crown className="w-3.5 h-3.5"/>EXECUTIVE COMMAND CENTER</div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome back, CFO</h1>
          <p className="text-slate-300 mt-1.5">Here is your real-time view of <span className="font-semibold text-white">{data.org?.name}</span> spending posture.</p>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div><div className="text-blue-200 text-xs mb-1">Organization Spend</div><div className="text-3xl font-bold tracking-tight">{inr(k.totalSpent)}</div><div className="text-emerald-300 text-xs mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/>{utilization}% of budget</div></div>
            <div><div className="text-blue-200 text-xs mb-1">Allocated</div><div className="text-3xl font-bold tracking-tight">{inr(k.totalAllocated)}</div><div className="text-slate-300 text-xs mt-1">{data.budgets.length} active budgets</div></div>
            <div><div className="text-blue-200 text-xs mb-1">Pending Actions</div><div className="text-3xl font-bold tracking-tight">{k.pendingCount}</div><div className="text-amber-300 text-xs mt-1">requires CFO review</div></div>
            <div><div className="text-blue-200 text-xs mb-1">Policy Breaches</div><div className="text-3xl font-bold tracking-tight">{k.violations}</div><div className="text-red-300 text-xs mt-1">blocked at transaction</div></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Budget Utilization Forecast</CardTitle><CardDescription className="text-xs">Projected monthly burn vs allocated runway</CardDescription></CardHeader>
          <CardContent className="pl-2 pr-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={k.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => '₹'+v/1000+'k'}/>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v) => inr(v)}/>
                <Line dataKey="allocated" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Allocated"/>
                <Line dataKey="spent" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} name="Actual"/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Project ROI Health</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(k.byProject || []).map(p => {
              const u = pct(p.spent, p.budget)
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                    <div className="text-xs font-semibold text-slate-700">{u}%</div>
                  </div>
                  <Progress value={u} className="h-2"/>
                  <div className="flex justify-between mt-1 text-[11px] text-slate-500"><span>{inr(p.spent)} spent</span><span>{inr(p.budget)} cap</span></div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Department Spend Heatmap</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={k.byDept || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => '₹'+v/1000+'k'}/>
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}/>
                <Bar dataKey="spent" radius={[8,8,0,0]}>
                  {(k.byDept || []).map((_, i) => <Cell key={i} fill={['#2563EB','#7C3AED','#0EA5E9'][i % 3]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Governance Signals</CardTitle><CardDescription className="text-xs">CORPAY's automated checks this period</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <SignalRow icon={CheckCircle2} color="emerald" label="Approved within policy" value={data.transactions.filter(t=>t.status==='Approved').length}/>
            <SignalRow icon={Clock} color="amber" label="Awaiting approval" value={data.transactions.filter(t=>t.status==='Pending').length}/>
            <SignalRow icon={XCircle} color="red" label="Blocked by policy" value={data.transactions.filter(t=>t.status==='Rejected').length}/>
            <SignalRow icon={ShieldCheck} color="blue" label="Active policies" value={data.policies.length}/>
            <SignalRow icon={Activity} color="slate" label="Avg. validation latency" value="< 200ms"/>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SignalRow({ icon: Icon, color, label, value }) {
  const colorMap = { emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', blue: 'bg-blue-50 text-blue-600', slate: 'bg-slate-100 text-slate-600' }
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60 border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}><Icon className="w-4 h-4"/></div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
      </div>
      <div className="font-bold text-slate-900">{value}</div>
    </div>
  )
}

// ───────────────────────────────── Wallet Dashboard ─────────────────────────────────
function WalletDashboard({ data, currentEmployee, setView }) {
  const myBudgets = data.budgets.filter(b => b.employeeId === currentEmployee?.id || (b.projectId && b.projectId === currentEmployee?.projectId))
  const myTxns = data.transactions.filter(t => t.employeeId === currentEmployee?.id)
  const totalAllocated = myBudgets.reduce((s,b)=>s+b.amount,0)
  const totalSpent = myTxns.filter(t=>t.status==='Approved').reduce((s,t)=>s+t.amount,0)
  const pending = data.transactions.filter(t => t.employeeId === currentEmployee?.id && t.status === 'Pending').length
  const available = totalAllocated - totalSpent

  return (
    <div className="space-y-6">
      {/* Premium Wallet Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl gradient-card p-8 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl"/>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl"/>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-200 text-xs font-semibold tracking-widest uppercase">CORPAY Wallet</div>
                <div className="text-blue-100 text-sm mt-1">{currentEmployee?.name} · {currentEmployee?.designation}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20"><Wallet className="w-6 h-6 text-white"/></div>
            </div>
            <div className="mt-10">
              <div className="text-blue-200 text-xs">Available Balance</div>
              <div className="text-5xl font-bold tracking-tight mt-1">{inr(available)}</div>
              <div className="flex gap-6 mt-4 text-sm">
                <div><span className="text-blue-200">Allocated:</span> <span className="font-semibold">{inr(totalAllocated)}</span></div>
                <div><span className="text-blue-200">Spent:</span> <span className="font-semibold">{inr(totalSpent)}</span></div>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <Button size="lg" onClick={() => setView('scan')} className="bg-white text-slate-900 hover:bg-slate-100 font-semibold gap-2">
                <ScanLine className="w-5 h-5"/>Scan &amp; Pay
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white gap-2">
                <QrCode className="w-5 h-5"/>Show UPI ID
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <KPI label="Active Trips / Projects" value={myBudgets.length} icon={Briefcase} accent="blue"/>
          <KPI label="Pending Approvals" value={pending} icon={Clock} accent="amber"/>
          <KPI label="Utilization" value={`${pct(totalSpent, totalAllocated)}%`} icon={Target} accent="green"/>
        </div>
      </div>

      {/* Budgets allocated to me */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">My Allocated Budgets</CardTitle><CardDescription className="text-xs">Budgets you can spend against</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myBudgets.map(b => <BudgetCard key={b.id} b={b} project={data.projects.find(p=>p.id===b.projectId)}/>)}
          {!myBudgets.length && <div className="text-sm text-slate-500 col-span-2 py-8 text-center">No budgets allocated yet.</div>}
        </CardContent>
      </Card>

      {/* My recent transactions */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2.5">
          {myTxns.slice(0,8).map(t => <TxnRow key={t.id} txn={t} employees={data.employees}/>)}
          {!myTxns.length && <div className="text-sm text-slate-500 py-6 text-center">No transactions yet. Try Scan &amp; Pay to make one!</div>}
        </CardContent>
      </Card>
    </div>
  )
}

function BudgetCard({ b, project }) {
  const utilization = pct(b.spent, b.amount)
  const danger = utilization > 80
  return (
    <div className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all bg-white">
      <div className="flex items-start justify-between">
        <div>
          <Badge variant="outline" className="text-[10px] mb-2 border-blue-200 bg-blue-50 text-blue-700">{b.type}</Badge>
          <div className="font-semibold text-slate-900">{b.name}</div>
          {project && <div className="text-xs text-slate-500 mt-0.5">{project.name}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">{inr(b.amount - b.spent)}</div>
          <div className="text-[10px] text-slate-500">available</div>
        </div>
      </div>
      <div className="mt-3">
        <Progress value={utilization} className={`h-1.5 ${danger ? '[&>div]:bg-red-500' : ''}`}/>
        <div className="flex justify-between mt-1.5 text-[11px] text-slate-500"><span>{inr(b.spent)} spent</span><span>{utilization}% used</span></div>
      </div>
    </div>
  )
}

// ───────────────────────────────── SCAN & PAY  (the aha) ─────────────────────────────────
const SAMPLE_MERCHANTS = [
  { name: 'Taj Krishna Hyderabad', category: 'Hotel & Stay', amount: 7500 },
  { name: 'Paradise Biryani Banjara Hills', category: 'Food & Dining', amount: 1240 },
  { name: 'Ola Cabs', category: 'Travel', amount: 480 },
  { name: 'IndianOil Petrol Pump', category: 'Fuel', amount: 1800 },
  { name: 'Reliance Smart Bazaar', category: 'Office Supplies', amount: 2500 },
  { name: 'Hard Rock Cafe', category: 'Entertainment', amount: 3200 },
  { name: 'ITC Kakatiya Suite', category: 'Hotel & Stay', amount: 9800 },
  { name: 'IRCTC Flight Booking', category: 'Travel', amount: 5500 },
]

function ScanPay({ data, currentEmployee, refresh }) {
  const [step, setStep] = useState('scan') // scan -> confirm -> validating -> result
  const [merchant, setMerchant] = useState(null)
  const [amount, setAmount] = useState('')
  const [validation, setValidation] = useState(null)
  const [paymentResult, setPaymentResult] = useState(null)
  const [scanning, setScanning] = useState(false)

  const simulateScan = (m) => {
    setScanning(true)
    setTimeout(() => {
      setMerchant(m)
      setAmount(String(m.amount))
      setScanning(false)
      setStep('confirm')
    }, 1400)
  }

  const validate = async () => {
    setStep('validating')
    const r = await fetch('/api/validate-spend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: currentEmployee?.id, amount: Number(amount), category: merchant.category })
    }).then(r => r.json())
    setValidation(r)
    setTimeout(() => setStep('result'), 600)
  }

  const confirmPay = async () => {
    const r = await fetch('/api/pay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: currentEmployee?.id,
        amount: Number(amount), category: merchant.category, merchant: merchant.name
      })
    }).then(r => r.json())
    setPaymentResult(r)
    if (r.success) {
      toast.success(r.status === 'Approved' ? 'Payment Successful' : 'Sent for approval', {
        description: r.status === 'Approved' ? `${inr(amount)} paid to ${merchant.name}` : `${inr(amount)} pending manager approval`
      })
    } else {
      toast.error('Payment Blocked', { description: r.validation?.reason })
    }
    await refresh()
  }

  const reset = () => { setStep('scan'); setMerchant(null); setAmount(''); setValidation(null); setPaymentResult(null) }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 mb-3"><Zap className="w-3 h-3 mr-1"/>Real-time Governance Engine</Badge>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Scan &amp; Pay with UPI</h1>
        <p className="text-sm text-slate-500 mt-2">Every transaction is validated against budget, policy and approval rules — before money moves.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Scanner / payment */}
        <div className="lg:col-span-3">
          <Card className="border-slate-200/80 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {/* SCAN */}
              {step === 'scan' && (
                <div className="bg-slate-900 p-8">
                  <div className="text-center text-white mb-4">
                    <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">Point your camera at a UPI QR</div>
                    <div className="text-sm text-slate-300">Tap a merchant below to simulate</div>
                  </div>
                  <div className="relative w-72 h-72 mx-auto rounded-2xl bg-black scan-frame flex items-center justify-center overflow-hidden">
                    {scanning ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900"></div>
                        <Loader2 className="w-12 h-12 text-blue-400 animate-spin relative"/>
                        <div className="absolute left-2 right-2 h-0.5 bg-blue-500 scan-line shadow-[0_0_20px_rgba(37,99,235,0.8)]"></div>
                      </>
                    ) : (
                      <QrCode className="w-32 h-32 text-slate-700"/>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-6">
                    {SAMPLE_MERCHANTS.map(m => {
                      const Ico = CATEGORY_ICONS[m.category] || ShoppingBag
                      return (
                        <button key={m.name} onClick={() => simulateScan(m)} disabled={scanning}
                          className="text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 transition-all disabled:opacity-50">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center"><Ico className="w-4 h-4 text-blue-400"/></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white truncate">{m.name}</div>
                              <div className="text-[10px] text-slate-400">{m.category} · {inr(m.amount)}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* CONFIRM */}
              {step === 'confirm' && merchant && (
                <div className="p-8 bg-white">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-3">
                      <BadgeCheck className="w-8 h-8 text-blue-600"/>
                    </div>
                    <div className="text-xs uppercase tracking-widest text-slate-500">Verified Merchant</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{merchant.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{merchant.category}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <Label className="text-xs uppercase tracking-widest text-slate-500">Amount (₹)</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="text-3xl font-bold border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto mt-1 text-slate-900"/>
                    <div className="text-xs text-slate-500 mt-1">Tap to edit · transaction will be validated before commit</div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" className="flex-1" onClick={reset}>Cancel</Button>
                    <Button onClick={validate} className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
                      <ShieldCheck className="w-4 h-4"/>Validate &amp; Pay
                    </Button>
                  </div>
                </div>
              )}

              {/* VALIDATING */}
              {step === 'validating' && (
                <div className="p-12 text-center bg-white">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto"/>
                  <div className="font-semibold text-slate-900 mt-4">Running governance checks…</div>
                  <div className="text-xs text-slate-500 mt-1">Budget · Policy · Category · Daily Limit · Approval</div>
                </div>
              )}

              {/* RESULT */}
              {step === 'result' && validation && (
                <div className="p-8 bg-white">
                  {paymentResult ? (
                    <PaymentReceipt result={paymentResult} merchant={merchant} amount={amount} onDone={reset}/>
                  ) : (
                    <ValidationResult v={validation} merchant={merchant} amount={amount}
                      onConfirm={confirmPay} onCancel={reset}/>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — Context */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Paying As</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm">{(currentEmployee?.name||'').split(' ').map(s=>s[0]).join('').slice(0,2)}</AvatarFallback></Avatar>
                <div>
                  <div className="font-semibold text-sm">{currentEmployee?.name}</div>
                  <div className="text-xs text-slate-500">{currentEmployee?.designation}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Active Policy</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs pt-0">
              {data.policies[0] && Object.entries({
                'Food limit': inr(data.policies[0].foodLimit),
                'Hotel limit': inr(data.policies[0].hotelLimit),
                'Travel limit': inr(data.policies[0].travelLimit),
                'Daily limit': inr(data.policies[0].dailyLimit),
                'Per-txn cap': inr(data.policies[0].perTransactionLimit),
                'Approval threshold': inr(data.policies[0].approvalThreshold),
              }).map(([k,v]) => (
                <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-900">{v}</span></div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm">How it works</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              {[
                { i: '1', t: 'Scan UPI QR', d: 'Merchant + amount captured' },
                { i: '2', t: 'Real-time validation', d: 'Budget · category · policy · daily limit' },
                { i: '3', t: 'Auto-route or settle', d: 'Approved instantly or sent to manager' },
              ].map(s => (
                <div key={s.i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{s.i}</div>
                  <div><div className="font-semibold text-xs text-slate-900">{s.t}</div><div className="text-xs text-slate-500">{s.d}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ValidationResult({ v, merchant, amount, onConfirm, onCancel }) {
  const isOk = v.allowed && !v.requiresApproval
  const needsApproval = v.allowed && v.requiresApproval
  const blocked = !v.allowed
  return (
    <div>
      <div className="text-center mb-6">
        {isOk && <><CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto"/><div className="text-xl font-bold text-slate-900 mt-3">Approved — within policy</div></>}
        {needsApproval && <><AlertTriangle className="w-16 h-16 text-amber-500 mx-auto"/><div className="text-xl font-bold text-slate-900 mt-3">Approval Required</div></>}
        {blocked && <><XCircle className="w-16 h-16 text-red-600 mx-auto"/><div className="text-xl font-bold text-slate-900 mt-3">Payment Blocked</div></>}
        <div className="text-sm text-slate-600 mt-1.5 max-w-md mx-auto">{v.reason}</div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
        <Row label="Merchant" value={merchant.name}/>
        <Row label="Category" value={merchant.category}/>
        <Row label="Amount" value={inr(amount)} bold/>
        {v.budget && <Row label="Budget" value={`${v.budget.name} · ${inr(v.budget.amount - v.budget.spent)} avail`}/>}
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        {!blocked && (
          <Button onClick={onConfirm} className={`flex-1 gap-2 ${needsApproval ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {needsApproval ? <><FileCheck2 className="w-4 h-4"/>Request Approval</> : <><CheckCheck className="w-4 h-4"/>Confirm Payment</>}
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, bold }) {
  return <div className="flex justify-between items-center text-sm"><span className="text-slate-500">{label}</span><span className={bold ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}>{value}</span></div>
}

function PaymentReceipt({ result, merchant, amount, onDone }) {
  const success = result.success
  const status = result.status
  return (
    <div className="text-center">
      <div className={`inline-flex w-20 h-20 rounded-full items-center justify-center mb-4 ${success && status === 'Approved' ? 'bg-emerald-100' : status === 'Pending' ? 'bg-amber-100' : 'bg-red-100'}`}>
        {success && status === 'Approved' && <CheckCircle2 className="w-10 h-10 text-emerald-600"/>}
        {status === 'Pending' && <Clock className="w-10 h-10 text-amber-600"/>}
        {!success && <XCircle className="w-10 h-10 text-red-600"/>}
      </div>
      <div className="text-2xl font-bold text-slate-900">
        {success && status === 'Approved' && 'Payment Successful'}
        {status === 'Pending' && 'Sent for Approval'}
        {!success && 'Payment Blocked'}
      </div>
      <div className="text-3xl font-bold text-slate-900 mt-3">{inr(amount)}</div>
      <div className="text-sm text-slate-500 mt-1">to {merchant.name}</div>
      <div className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">{result.validation?.reason}</div>
      {result.transaction && <div className="text-[10px] text-slate-400 mt-2 font-mono">TXN: {result.transaction.id.slice(0,16).toUpperCase()}</div>}
      <Button onClick={onDone} className="mt-6 w-full">Done</Button>
    </div>
  )
}

// ───────────────────────────────── BUDGETS ─────────────────────────────────
function BudgetsView({ data, refresh }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Budgets</h1><p className="text-sm text-slate-500 mt-1">Allocate spending limits to projects, departments and employees.</p></div>
        <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-1.5"><Plus className="w-4 h-4"/>New Budget</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.budgets.map(b => {
          const u = pct(b.spent, b.amount)
          const project = data.projects.find(p => p.id === b.projectId)
          const employee = data.employees.find(e => e.id === b.employeeId)
          return (
            <Card key={b.id} className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700">{b.type}</Badge>
                  <Badge variant={b.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{b.status}</Badge>
                </div>
                <div className="font-semibold text-slate-900 text-lg">{b.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{b.costCenter}{project && ` · ${project.name}`}{employee && ` · ${employee.name}`}</div>
                <div className="mt-5">
                  <div className="flex items-end justify-between mb-1">
                    <div><div className="text-2xl font-bold text-slate-900">{inr(b.amount - b.spent)}</div><div className="text-[10px] text-slate-500 uppercase tracking-widest">available of {inr(b.amount)}</div></div>
                    <div className="text-right"><div className="text-sm font-bold text-slate-700">{u}%</div><div className="text-[10px] text-slate-500">used</div></div>
                  </div>
                  <Progress value={u} className={`h-1.5 ${u > 80 ? '[&>div]:bg-red-500' : ''}`}/>
                </div>
                {b.breakdown && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    {Object.entries(b.breakdown).map(([k,v]) => (
                      <div key={k}><div className="text-xs font-bold text-slate-900">{inr(v)}</div><div className="text-[10px] text-slate-500 capitalize">{k}</div></div>
                    ))}
                  </div>
                )}
                <div className="mt-4 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>{b.startDate} → {b.endDate}</span>
                  {b.approvalRequired && <Badge variant="outline" className="text-[9px] h-4">Approval required</Badge>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <NewBudgetDialog open={open} onOpenChange={setOpen} data={data} onCreated={refresh}/>
    </div>
  )
}

function NewBudgetDialog({ open, onOpenChange, data, onCreated }) {
  const [f, setF] = useState({ name: '', type: 'Travel', amount: '', startDate: '', endDate: '', costCenter: '', projectId: '', employeeId: '' })
  const submit = async () => {
    if (!f.name || !f.amount) return toast.error('Name & amount are required')
    await fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, amount: Number(f.amount), spent: 0, status: 'Active', orgId: data.org?.id, breakdown: {}, approvalRequired: false }) })
    toast.success('Budget created'); onOpenChange(false); onCreated()
    setF({ name: '', type: 'Travel', amount: '', startDate: '', endDate: '', costCenter: '', projectId: '', employeeId: '' })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Budget</DialogTitle><DialogDescription>Allocate spending limits before money moves.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label className="text-xs">Budget Name</Label><Input value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="e.g. Q3 Travel Allowance"/></div>
          <div><Label className="text-xs">Type</Label>
            <Select value={f.type} onValueChange={v => setF({...f, type: v})}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{['Travel','Project','Department','Employee'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={f.amount} onChange={e => setF({...f, amount: e.target.value})}/></div>
          <div><Label className="text-xs">Start Date</Label><Input type="date" value={f.startDate} onChange={e => setF({...f, startDate: e.target.value})}/></div>
          <div><Label className="text-xs">End Date</Label><Input type="date" value={f.endDate} onChange={e => setF({...f, endDate: e.target.value})}/></div>
          <div><Label className="text-xs">Cost Center</Label><Input value={f.costCenter} onChange={e => setF({...f, costCenter: e.target.value})} placeholder="CC-OPS-001"/></div>
          <div><Label className="text-xs">Project</Label>
            <Select value={f.projectId} onValueChange={v => setF({...f, projectId: v})}>
              <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
              <SelectContent>{data.projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label className="text-xs">Employee (optional)</Label>
            <Select value={f.employeeId} onValueChange={v => setF({...f, employeeId: v})}>
              <SelectTrigger><SelectValue placeholder="Whole project"/></SelectTrigger>
              <SelectContent>{data.employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.designation}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} className="bg-blue-600 hover:bg-blue-700">Create Budget</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────── POLICIES ─────────────────────────────────
function PoliciesView({ data, refresh }) {
  const policy = data.policies[0]
  const [f, setF] = useState(null)
  useEffect(() => { if (policy && !f) setF(policy) }, [policy])
  if (!f) return null
  const save = async () => {
    await fetch(`/api/policies/${policy.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    toast.success('Policy updated'); refresh()
  }
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Spending Policies</h1><p className="text-sm text-slate-500 mt-1">Govern every UPI transaction with category-level limits and approval thresholds.</p></div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600"/>{f.name}</CardTitle><CardDescription>Applied to every transaction system-wide</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { k: 'foodLimit', l: 'Food Limit (per txn)', i: Utensils },
              { k: 'hotelLimit', l: 'Hotel Limit (per night)', i: Hotel },
              { k: 'travelLimit', l: 'Travel Limit (per txn)', i: Plane },
              { k: 'dailyLimit', l: 'Daily Limit (total)', i: Activity },
              { k: 'perTransactionLimit', l: 'Per Transaction Cap', i: IndianRupee },
              { k: 'approvalThreshold', l: 'Approval Threshold', i: FileCheck2 },
            ].map(p => {
              const Ico = p.i
              return (
                <div key={p.k} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Ico className="w-3.5 h-3.5"/>{p.l}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">₹</span>
                    <Input type="number" value={f[p.k]} onChange={e => setF({...f, [p.k]: Number(e.target.value)})} className="text-xl font-bold border-0 px-0 h-8 shadow-none focus-visible:ring-0"/>
                  </div>
                </div>
              )
            })}
          </div>

          <Separator/>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-widest">Allowed Categories</div>
              <div className="flex flex-wrap gap-1.5">{f.allowedCategories.map(c => <Badge key={c} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{c}</Badge>)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-widest">Restricted Categories</div>
              <div className="flex flex-wrap gap-1.5">{f.restrictedCategories.map(c => <Badge key={c} className="bg-red-100 text-red-700 hover:bg-red-100">{c}</Badge>)}</div>
            </div>
          </div>

          <div className="flex justify-end"><Button onClick={save} className="bg-blue-600 hover:bg-blue-700">Save Policy</Button></div>
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────────────── APPROVALS ─────────────────────────────────
function ApprovalsView({ data, refresh, currentEmployee }) {
  const pending = data.approvals.filter(a => a.status === 'Pending')
  const handled = data.approvals.filter(a => a.status !== 'Pending')

  const act = async (id, action) => {
    await fetch(`/api/approvals/${id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ by: currentEmployee?.name, approverId: currentEmployee?.id }) })
    toast.success(`Approval ${action === 'approve' ? 'approved' : 'rejected'}`); refresh()
  }

  const findTxn = (id) => data.transactions.find(t => t.id === id)
  const findEmp = (id) => data.employees.find(e => e.id === id)

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Approvals</h1><p className="text-sm text-slate-500 mt-1">Review and action transactions that triggered policy thresholds.</p></div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending <Badge className="ml-2 h-4 bg-amber-100 text-amber-700">{pending.length}</Badge></TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-3">
          {!pending.length && <div className="text-sm text-slate-500 py-12 text-center bg-white rounded-xl border border-slate-200">No pending approvals</div>}
          {pending.map(a => {
            const t = findTxn(a.transactionId); if (!t) return null
            const emp = findEmp(t.employeeId)
            return (
              <Card key={a.id} className="border-slate-200/80 shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <Avatar className="w-12 h-12"><AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">{(emp?.name||'').split(' ').map(s=>s[0]).join('').slice(0,2)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900">{emp?.name}</div>
                      <span className="text-slate-400">·</span>
                      <span className="text-sm text-slate-600">{t.merchant}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.category} · {emp?.designation} · {new Date(t.date).toLocaleDateString('en-IN')}</div>
                    <div className="text-xs text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{t.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{inr(t.amount)}</div>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] mt-1">Pending</Badge>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => act(a.id, 'reject')} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"><X className="w-4 h-4 mr-1"/>Reject</Button>
                    <Button size="sm" onClick={() => act(a.id, 'approve')} className="bg-emerald-600 hover:bg-emerald-700"><CheckCheck className="w-4 h-4 mr-1"/>Approve</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Merchant</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Decided By</TableHead></TableRow></TableHeader>
              <TableBody>
                {handled.map(a => {
                  const t = findTxn(a.transactionId); if (!t) return null
                  const emp = findEmp(t.employeeId)
                  return <TableRow key={a.id}><TableCell className="font-medium">{emp?.name}</TableCell><TableCell>{t.merchant}</TableCell><TableCell>{inr(t.amount)}</TableCell><TableCell><StatusBadge status={a.status}/></TableCell><TableCell className="text-xs text-slate-500">{a.timeline?.[a.timeline.length-1]?.by}</TableCell></TableRow>
                })}
                {!handled.length && <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No approval history</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    'Approved': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    'Pending': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    'Rejected': 'bg-red-100 text-red-700 hover:bg-red-100',
  }
  return <Badge className={`${map[status]} text-[10px]`}>{status}</Badge>
}

// ───────────────────────────────── TRANSACTIONS ─────────────────────────────────
function TxnRow({ txn, employees, compact }) {
  const emp = employees.find(e => e.id === txn.employeeId)
  const Ico = CATEGORY_ICONS[txn.category] || ShoppingBag
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${txn.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : txn.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}><Ico className="w-4.5 h-4.5"/></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2"><div className="font-semibold text-sm text-slate-900 truncate">{txn.merchant}</div><StatusBadge status={txn.status}/></div>
        <div className="text-[11px] text-slate-500 mt-0.5">{txn.category}{!compact && emp && ` · ${emp.name}`} · {new Date(txn.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-slate-900">{inr(txn.amount)}</div>
        <div className="text-[10px] text-slate-500 uppercase">UPI</div>
      </div>
    </div>
  )
}

function TransactionsView({ data }) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all')
  const rows = data.transactions
    .filter(t => status === 'all' || t.status.toLowerCase() === status)
    .filter(t => !q || t.merchant.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1><p className="text-sm text-slate-500 mt-1">Every UPI tap, fully attributed to employee, project, cost center and budget.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="w-4 h-4"/>Filter</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4"/>Export CSV</Button>
        </div>
      </div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 flex items-center gap-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><Input value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-9" placeholder="Search merchant or category…"/></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[140px] h-9"><SelectValue/></SelectTrigger><SelectContent>
              <SelectItem value="all">All status</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent></Select>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Merchant</TableHead><TableHead>Employee</TableHead><TableHead>Project</TableHead><TableHead>Category</TableHead>
              <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(t => {
                const emp = data.employees.find(e => e.id === t.employeeId)
                const proj = data.projects.find(p => p.id === t.projectId)
                const Ico = CATEGORY_ICONS[t.category] || ShoppingBag
                return (
                  <TableRow key={t.id} className="hover:bg-slate-50">
                    <TableCell><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Ico className="w-4 h-4 text-slate-600"/></div><div><div className="font-semibold text-sm">{t.merchant}</div><div className="text-[10px] text-slate-500">{t.costCenter}</div></div></div></TableCell>
                    <TableCell className="text-sm">{emp?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{proj?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{t.category}</TableCell>
                    <TableCell className="font-semibold">{inr(t.amount)}</TableCell>
                    <TableCell><StatusBadge status={t.status}/></TableCell>
                    <TableCell className="text-sm text-slate-500">{new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                  </TableRow>
                )
              })}
              {!rows.length && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No transactions match</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────────────── ORGANIZATION ─────────────────────────────────
function OrganizationView({ data }) {
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization</h1><p className="text-sm text-slate-500 mt-1">Company profile, departments, projects and employees.</p></div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-600"/>Company Profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Name" value={data.org?.name}/>
          <Field label="GSTIN" value={data.org?.gst}/>
          <Field label="Currency" value={data.org?.currency}/>
          <Field label="Address" value={data.org?.address}/>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><FolderTree className="w-4 h-4 text-blue-600"/>Departments &amp; Cost Centers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.departments.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div><div className="font-semibold text-sm">{d.name}</div><div className="text-xs text-slate-500">Head: {d.head}</div></div>
                <Badge variant="outline" className="font-mono text-[10px]">{d.costCenter}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-600"/>Projects</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.projects.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div><div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-slate-500">{p.client} · {p.code}</div></div>
                <div className="text-right"><div className="font-bold text-sm">{inr(p.budgetCap)}</div><div className="text-[10px] text-slate-500">budget cap</div></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-blue-600"/>Employee Master</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Project</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.employees.map(e => {
                const dept = data.departments.find(d => d.id === e.departmentId)
                const proj = data.projects.find(p => p.id === e.projectId)
                return (
                  <TableRow key={e.id}>
                    <TableCell><div className="flex items-center gap-2.5"><Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[10px]">{e.name.split(' ').map(s=>s[0]).join('').slice(0,2)}</AvatarFallback></Avatar><div><div className="font-semibold text-sm">{e.name}</div><div className="text-[10px] text-slate-500">{e.designation}</div></div></div></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.role}</Badge></TableCell>
                    <TableCell className="text-sm">{dept?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{proj?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-500">{e.email}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }) {
  return <div><div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div><div className="font-semibold text-sm text-slate-900 mt-1">{value || '—'}</div></div>
}

export default App
