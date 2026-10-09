import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CircleHelp, Inbox, Loader2, X } from 'lucide-react'
import { GLOSSARY } from '../glossary.js'
import { classColor } from '../context.jsx'

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Card({ title, action, children, className = '', pad = true }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

/** "What is this?" toggle with a plain-language definition. */
export function WhatIs({ term }) {
  const [open, setOpen] = useState(false)
  const [title, text] = GLOSSARY[term]
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md bg-cobalt-soft px-2.5 py-1 text-xs font-medium text-cobalt-dark hover:bg-[#d8e0fa]">
        <CircleHelp size={14} /> What is {title.toLowerCase()}?
      </button>
      {open && <p className="mt-2 max-w-3xl rounded-md border-l-4 border-cobalt bg-cobalt-soft/60 px-3 py-2 text-sm text-ink">{text}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'slate', className = '' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-50 text-emerald-800', red: 'bg-rose-50 text-rose-800',
    amber: 'bg-amber-50 text-amber-800', blue: 'bg-cobalt-soft text-cobalt-dark',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>{children}</span>
}

export function ClassBadge({ label, index = 0 }) {
  const c = classColor(label, index)
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: c + '1A', color: c }}>
    <i className="h-2 w-2 rounded-full" style={{ background: c }} />{label}</span>
}

export function Spinner({ label = 'Loading…' }) {
  return <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted"><Loader2 className="animate-spin" size={18} />{label}</div>
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{error?.message || String(error)}</p>
        {error?.details && Array.isArray(error.details) && <ul className="mt-1 list-disc pl-5">{error.details.map((d) => <li key={d}>{d}</li>)}</ul>}
      </div>
      {onRetry && <button className="btn-ghost !py-1" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line bg-white px-6 py-12 text-center">
      <Inbox className="text-muted" size={28} />
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted">{children}</p>
      {action}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-card bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-paper"><X size={18} /></button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function Stat({ label, value, hint }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold leading-tight">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function ProgressBar({ value, color = '#2F4BD0' }) {
  return <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color }} /></div>
}

export const pct = (v, d = 1) => (v == null ? '–' : `${(v * 100).toFixed(d)}%`)

export function Disclaimer() {
  return (
    <p className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-muted">
      This project is an educational data-mining system. Predictions are intended only as decision-support information and should not be used as the sole basis for academic decisions.
      Dataset quality affects prediction quality, correlation does not imply causation, student data should be anonymized, models can make errors, and predictions should be reviewed by humans.
    </p>
  )
}

/** Fetch helper hook: runs `fn` on mount and whenever `deps` change. */
export function useFetch(fn, deps = []) {
  const [state, set] = useState({ data: null, error: null, loading: true })
  const run = useCallback(() => {
    set((s) => ({ ...s, loading: true, error: null }))
    fn().then((data) => set({ data, error: null, loading: false }))
      .catch((error) => set({ data: null, error, loading: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { run() }, [run])
  return { ...state, reload: run }
}
