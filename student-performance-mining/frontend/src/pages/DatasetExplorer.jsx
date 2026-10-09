import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, RotateCcw, Search, Upload } from 'lucide-react'
import { api } from '../api.js'
import { useApp } from '../context.jsx'
import { Badge, Card, ClassBadge, Empty, ErrorBox, Modal, PageHeader, Spinner, WhatIs } from '../components/ui.jsx'

export default function DatasetExplorer() {
  const { version, refresh } = useApp()
  const [q, setQ] = useState({ page: 1, page_size: 25, search: '', sort: '', order: 'asc', performance: '', flag: 'all', source: 'working' })
  const [searchText, setSearchText] = useState('')
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [showCols, setShowCols] = useState(false)
  const fileRef = useRef()

  const load = () => { setBusy(true); api.dataset(q).then((d) => { setRes(d); setError(null) }).catch(setError).finally(() => setBusy(false)) }
  useEffect(load, [q, version])
  useEffect(() => { const t = setTimeout(() => setQ((p) => ({ ...p, search: searchText, page: 1 })), 300); return () => clearTimeout(t) }, [searchText])

  const set = (patch) => setQ((p) => ({ ...p, page: 1, ...patch }))
  const sortBy = (col) => set({ sort: col, order: q.sort === col && q.order === 'asc' ? 'desc' : 'asc' })

  const upload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setNotice(null)
    try { const r = await api.upload(file); setNotice({ ok: true, text: r.message }); setSearchText(''); setQ((p) => ({ ...p, page: 1, search: '', sort: '', source: 'working', flag: 'all', performance: '' })); await refresh() }
    catch (err) { setNotice({ ok: false, text: err.message }) }
  }
  const reset = async () => { await api.reset(); setNotice({ ok: true, text: 'Default dataset restored.' }); await refresh() }

  const cols = res?.columns || []
  const info = res?.info

  return (
    <>
      <PageHeader title="Dataset Explorer" subtitle="Browse, search, sort and filter the records. Upload your own CSV and the whole application re-analyses it.">
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={upload} />
        <button className="btn-ghost" onClick={reset}><RotateCcw size={16} />Use default data</button>
        <button className="btn-primary" onClick={() => fileRef.current.click()}><Upload size={16} />Upload CSV</button>
      </PageHeader>
      {notice && <div role="status" className={`mb-4 rounded-md px-3 py-2 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>{notice.text}</div>}
      <p className="mb-4 text-xs text-muted">A valid CSV needs a <b>Performance</b> column (class labels) and at least two numeric attribute columns. <b>Student_ID</b> is optional.</p>

      {error && <ErrorBox error={error} onRetry={load} />}
      {info && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="blue">{info.records.toLocaleString()} records</Badge>
          <Badge tone="blue">{info.attributes} attributes</Badge>
          <Badge tone={info.missing_total ? 'amber' : 'green'}>{info.missing_total} missing values</Badge>
          <Badge tone={info.duplicates ? 'amber' : 'green'}>{info.duplicates} duplicate rows</Badge>
          <Badge tone={info.invalid_total ? 'red' : 'green'}>{info.invalid_total} impossible values</Badge>
          <button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setShowCols(true)}><Columns3 size={14} />Data types</button>
        </div>
      )}

      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Search any value, e.g. STU0102 or Good" value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search records" />
          </div>
          <select className="input !w-auto" value={q.source} onChange={(e) => set({ source: e.target.value })} aria-label="Data version">
            <option value="working">Current (used for training)</option><option value="raw">Original upload</option>
          </select>
          <select className="input !w-auto" value={q.performance} onChange={(e) => set({ performance: e.target.value })} aria-label="Filter by performance">
            <option value="">All classes</option>{(res?.classes || []).map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="input !w-auto" value={q.flag} onChange={(e) => set({ flag: e.target.value })} aria-label="Filter by data quality">
            <option value="all">All rows</option><option value="missing">Rows with missing values</option><option value="duplicates">Duplicate rows</option>
          </select>
        </div>

        {!res ? <Spinner /> : res.total === 0 ? (
          <div className="p-6"><Empty title="No records match">Try clearing the search text or choosing “All rows”.</Empty></div>
        ) : (
          <div className={`overflow-x-auto ${busy ? 'opacity-60' : ''}`}>
            <table className="w-full border-collapse">
              <thead><tr>
                <th className="th">#</th>
                {cols.map((c) => (
                  <th key={c.name} className="th">
                    <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => sortBy(c.name)}>
                      {c.name.replaceAll('_', ' ')}
                      {q.sort === c.name && (q.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r._row} className="hover:bg-paper/60">
                    <td className="td text-muted">{r._row}</td>
                    {cols.map((c) => {
                      const v = r[c.name]
                      return <td key={c.name} className={`td ${v == null ? 'bg-amber-50' : ''}`}>
                        {v == null ? <span className="text-xs italic text-amber-700">missing</span> : c.role === 'Class' ? <ClassBadge label={String(v)} /> : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1) : String(v)}
                      </td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {res && (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-sm">
            <span className="text-muted">Showing {res.rows.length} of {res.total.toLocaleString()} matching records</span>
            <div className="flex items-center gap-2">
              <select className="input !w-auto !py-1" value={q.page_size} onChange={(e) => set({ page_size: Number(e.target.value) })} aria-label="Rows per page">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button className="btn-ghost !p-1.5" disabled={res.page <= 1} onClick={() => setQ({ ...q, page: res.page - 1 })} aria-label="Previous page"><ChevronLeft size={16} /></button>
              <span>Page {res.page} of {res.pages}</span>
              <button className="btn-ghost !p-1.5" disabled={res.page >= res.pages} onClick={() => setQ({ ...q, page: res.page + 1 })} aria-label="Next page"><ChevronRight size={16} /></button>
            </div>
          </footer>
        )}
      </Card>

      {showCols && (
        <Modal title="Attributes and data types" onClose={() => setShowCols(false)}>
          <table className="w-full"><thead><tr><th className="th">Attribute</th><th className="th">Role</th><th className="th">Data type</th><th className="th">Missing</th><th className="th">Unique</th></tr></thead>
            <tbody>{cols.map((c) => <tr key={c.name}><td className="td font-medium">{c.name}</td><td className="td"><Badge tone={c.role === 'Class' ? 'blue' : 'slate'}>{c.role}</Badge></td><td className="td text-muted">{c.dtype}</td><td className="td">{c.missing}</td><td className="td">{c.unique}</td></tr>)}</tbody></table>
        </Modal>
      )}
    </>
  )
}
