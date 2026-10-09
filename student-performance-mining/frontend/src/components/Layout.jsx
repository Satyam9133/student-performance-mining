import { NavLink } from 'react-router-dom'
import { BarChart3, Boxes, Database, FlaskConical, GitBranch, Gauge, GraduationCap, Info, ListChecks, Sparkles, Table2, Target, Check, Circle } from 'lucide-react'
import { useApp } from '../context.jsx'

const NAV = [
  ['/', 'Dashboard', Gauge], ['/dataset', 'Dataset Explorer', Table2], ['/preprocessing', 'Data Preprocessing', FlaskConical],
  ['/visualization', 'Data Visualization', BarChart3], ['/training', 'Model Training', Boxes], ['/comparison', 'Model Comparison', ListChecks],
  ['/prediction', 'Student Prediction', Sparkles], ['/tree', 'Decision Tree', GitBranch], ['/evaluation', 'Evaluation', Target], ['/about', 'About Project', Info],
]

function Step({ done, label }) {
  return <li className="flex items-center gap-2 text-xs">{done ? <Check size={14} className="text-mint" /> : <Circle size={14} className="text-slate-500" />}<span className={done ? 'text-white' : 'text-slate-400'}>{label}</span></li>
}

export default function Layout({ children }) {
  const { status } = useApp()
  const trained = status ? Object.keys(status.trained).length : 0
  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-navy text-slate-300 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-cobalt text-white"><GraduationCap size={22} /></span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold text-white">Student Performance Analytics</p>
            <p className="text-[11px] text-slate-400">Data Mining & Machine Learning Dashboard</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto" aria-label="Main">
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_#5EEAD4]' : 'hover:bg-white/5 hover:text-white'}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 lg:block">
          <p className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Database size={13} />{status?.dataset || 'No dataset'}{status && ` · ${status.records} rows`}</p>
          <ul className="space-y-1.5">
            <Step done={!!status} label="Dataset loaded" />
            <Step done={status?.preprocessed} label="Preprocessing applied" />
            <Step done={trained > 0} label={trained ? `${trained} model${trained > 1 ? 's' : ''} trained` : 'Model trained'} />
          </ul>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
