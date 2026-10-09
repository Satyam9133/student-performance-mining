import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Lock, Play } from 'lucide-react'
import { api } from '../api.js'
import { useApp } from '../context.jsx'
import { Badge, Card, ErrorBox, PageHeader, ProgressBar, Spinner, WhatIs, useFetch } from '../components/ui.jsx'

function Row({ label, before, after }) {
  const better = after < before
  return (
    <tr>
      <td className="td text-muted">{label}</td>
      <td className="td text-right font-medium">{before.toLocaleString()}</td>
      <td className="td text-center text-muted"><ArrowRight size={14} className="inline" /></td>
      <td className={`td text-right font-medium ${better ? 'text-emerald-700' : ''}`}>{after.toLocaleString()}</td>
    </tr>
  )
}

export default function Preprocessing() {
  const { version, refresh } = useApp()
  const { data, error, loading, reload } = useFetch(api.preprocessStatus, [version])
  const [cfg, setCfg] = useState({ remove_duplicates: true, missing_strategy: 'median', fix_invalid: true, scale: true })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => { if (data?.config) setCfg(data.config) }, [data])

  const apply = async () => {
    setBusy(true); setErr(null)
    try { await api.preprocess(cfg); await refresh() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  if (loading && !data) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const { before, after, log, ranking } = data
  const colData = Object.keys(before.missing_by_column).filter((c) => c !== before.target_column && c !== before.id_column)
    .map((c) => ({ column: c.replaceAll('_', ' '), Before: before.missing_by_column[c], After: after.missing_by_column[c] ?? 0 }))

  return (
    <>
      <PageHeader title="Data Preprocessing" subtitle="Clean the raw data, then see exactly how the dataset changed. The cleaned data is what the models are trained on." />
      <WhatIs term="preprocessing" />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Choose operations" className="lg:col-span-2">
          <div className="space-y-4 text-sm">
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-cobalt" checked={cfg.remove_duplicates} onChange={(e) => setCfg({ ...cfg, remove_duplicates: e.target.checked })} />
              <span><b>Remove duplicates</b><br /><span className="text-muted">Keeps the first copy of identical rows.</span></span></label>
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-cobalt" checked={cfg.fix_invalid} onChange={(e) => setCfg({ ...cfg, fix_invalid: e.target.checked })} />
              <span><b>Fix impossible values</b><br /><span className="text-muted">Attendance above 100, negative marks, 24 study hours… become missing and are then handled below.</span></span></label>
            <div>
              <label className="font-semibold" htmlFor="miss">Handle missing values</label>
              <select id="miss" className="input mt-1" value={cfg.missing_strategy} onChange={(e) => setCfg({ ...cfg, missing_strategy: e.target.value })}>
                <option value="median">Fill with median (recommended)</option><option value="mean">Fill with mean</option>
                <option value="drop">Drop rows with missing values</option><option value="none">Do nothing</option>
              </select>
            </div>
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-cobalt" checked={cfg.scale} onChange={(e) => setCfg({ ...cfg, scale: e.target.checked })} />
              <span><b>Normalise numbers (KNN only)</b><br /><span className="text-muted">KNN compares distances, so attributes need the same scale. Trees and Naive Bayes do not, so rules stay in real units such as “Attendance &gt; 74.5”.</span></span></label>
            <div className="space-y-2 rounded-md bg-paper p-3 text-xs text-muted">
              <p className="flex items-center gap-2"><Lock size={13} /> Student_ID is always excluded from model features.</p>
              <p className="flex items-center gap-2"><Lock size={13} /> Categorical attributes are one-hot encoded automatically.</p>
              <p className="flex items-center gap-2"><Lock size={13} /> Rows with no Performance label are always removed.</p>
            </div>
            {err && <ErrorBox error={err} />}
            <button className="btn-primary w-full" onClick={apply} disabled={busy}><Play size={16} />{busy ? 'Applying…' : 'Apply preprocessing'}</button>
            <p className="text-xs text-muted">Applying always starts from the original data and resets trained models, because they were built on older data.</p>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-3">
          <Card title="Before and after" action={<Badge tone={data.preprocessed ? 'green' : 'amber'}>{data.preprocessed ? 'Preprocessing applied' : 'Not applied yet'}</Badge>}>
            <table className="w-full"><thead><tr><th className="th">Measure</th><th className="th text-right">Before</th><th className="th" /><th className="th text-right">After</th></tr></thead>
              <tbody>
                <Row label="Records" before={before.records} after={after.records} />
                <Row label="Missing values" before={before.missing_total} after={after.missing_total} />
                <Row label="Duplicate rows" before={before.duplicates} after={after.duplicates} />
                <Row label="Impossible values" before={before.invalid_total} after={after.invalid_total} />
                <Row label="Inconsistent labels" before={before.inconsistent_labels} after={after.inconsistent_labels} />
                <Row label="Rows without a class" before={before.missing_target} after={after.missing_target} />
              </tbody></table>
            <div className="mt-3 flex items-center gap-3 text-sm"><span className="text-muted">Data quality</span><div className="flex-1"><ProgressBar value={after.quality_score / 100} color="#1B7F5C" /></div><b>{before.quality_score}% → {after.quality_score}%</b></div>
          </Card>

          <Card title="Attribute types">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div><p className="mb-1 font-medium">Numerical ({after.numeric_columns.length})</p><div className="flex flex-wrap gap-1.5">{after.numeric_columns.map((c) => <Badge key={c} tone="blue">{c}</Badge>)}</div></div>
              <div><p className="mb-1 font-medium">Categorical ({after.categorical_columns.length})</p><div className="flex flex-wrap gap-1.5">{after.categorical_columns.length ? after.categorical_columns.map((c) => <Badge key={c}>{c}</Badge>) : <span className="text-muted">None</span>}</div></div>
              <div><p className="mb-1 font-medium">Class attribute</p><Badge tone="green">{after.target_column}</Badge></div>
              <div><p className="mb-1 font-medium">Identifier (not a feature)</p>{after.id_column ? <Badge>{after.id_column}</Badge> : <span className="text-muted">None</span>}</div>
            </div>
          </Card>
        </div>

        <Card title="Missing values per attribute" className="lg:col-span-3">
          <div className="h-64"><ResponsiveContainer><BarChart data={colData} margin={{ left: -15, right: 8 }}>
            <CartesianGrid vertical={false} stroke="#E4EAF1" /><XAxis dataKey="column" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} tickLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#EDF1F6' }} /><Legend verticalAlign="top" height={28} />
            <Bar dataKey="Before" fill="#D99A00" radius={[3, 3, 0, 0]} /><Bar dataKey="After" fill="#1B7F5C" radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Card>

        <Card title="What happened, step by step" className="lg:col-span-2">
          {log.length === 0 ? <p className="text-sm text-muted">No operations applied yet. Choose options and press <b>Apply preprocessing</b>.</p> : (
            <ol className="space-y-2.5 text-sm">{log.map((l) => (
              <li key={l.step} className="border-l-2 border-cobalt pl-3"><p className="font-medium">{l.step}</p><p className="text-muted">{l.detail}</p><p className="text-xs text-muted">{l.rows.toLocaleString()} rows after this step</p></li>
            ))}</ol>
          )}
        </Card>

        <Card title="Feature selection: information about Performance" className="lg:col-span-5">
          <WhatIs term="feature_selection" />
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {ranking.map((f) => (
              <div key={f.feature}>
                <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{f.feature.replaceAll('_', ' ')}</span>
                  <span className="text-muted">info {f.mutual_info.toFixed(3)}{f.correlation != null && ` · correlation ${f.correlation.toFixed(2)}`}</span></div>
                <ProgressBar value={f.score} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
