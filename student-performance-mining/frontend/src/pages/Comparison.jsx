import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Trophy, Zap } from 'lucide-react'
import { api } from '../api.js'
import { useApp } from '../context.jsx'
import { Badge, Card, Empty, ErrorBox, PageHeader, Spinner, WhatIs, pct, useFetch } from '../components/ui.jsx'

export default function Comparison() {
  const { version, refresh } = useApp()
  const { data, loading, error, reload } = useFetch(api.comparison, [version])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [testSize, setTestSize] = useState(0.2)

  const runAll = async () => {
    setBusy(true); setErr(null)
    try { await api.train({ model: 'all', test_size: testSize, cross_validation: true, cv_folds: 10 }); await refresh() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  if (loading) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const rows = data.models

  return (
    <>
      <PageHeader title="Model Comparison" subtitle="All algorithms use the same cleaned data and the same train/test split, so the comparison is fair. Results are never adjusted by hand.">
        <select className="input !w-auto" value={testSize} onChange={(e) => setTestSize(+e.target.value)} aria-label="Train/test split"><option value={0.2}>80 / 20 split</option><option value={0.3}>70 / 30 split</option></select>
        <button className="btn-primary" onClick={runAll} disabled={busy}><Zap size={16} />{busy ? 'Training 4 models…' : rows.length ? 'Re-run comparison' : 'Train and compare all'}</button>
      </PageHeader>
      <WhatIs term="metrics" />
      {err && <ErrorBox error={err} />}
      {rows.length === 0 ? (
        <Empty title="Nothing to compare yet" action={<button className="btn-primary" onClick={runAll} disabled={busy}>{busy ? 'Training…' : 'Train all four models'}</button>}>
          Train at least two algorithms on the Model Training page, or train all four with one click.</Empty>
      ) : (
        <div className="space-y-5">
          <Card title="Results on the test set" pad={false}>
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr><th className="th">Algorithm</th><th className="th text-right">Accuracy</th><th className="th text-right">Precision</th><th className="th text-right">Recall</th><th className="th text-right">F1 score</th><th className="th text-right">Cross-validation</th></tr></thead>
              <tbody>{rows.map((r) => {
                const best = r.model === data.best
                return <tr key={r.model} className={best ? 'bg-emerald-50' : ''}>
                  <td className="td font-medium">{r.label}{best && <Badge tone="green" className="ml-2"><Trophy size={12} />best</Badge>}</td>
                  <td className="td text-right font-semibold">{pct(r.accuracy)}</td><td className="td text-right">{pct(r.precision)}</td><td className="td text-right">{pct(r.recall)}</td><td className="td text-right">{pct(r.f1)}</td>
                  <td className="td text-right">{r.cv ? `${pct(r.cv.mean)} ± ${pct(r.cv.std)}` : '–'}</td></tr>
              })}</tbody></table></div>
          </Card>
          <Card title="Accuracy by algorithm">
            <div className="h-64"><ResponsiveContainer><BarChart data={rows.map((r) => ({ name: r.label.split(' (')[0], Accuracy: +(r.accuracy * 100).toFixed(1), best: r.model === data.best }))} margin={{ top: 20, left: -10, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#E4EAF1" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: '#EDF1F6' }} />
              <Bar dataKey="Accuracy" radius={[4, 4, 0, 0]}>{rows.map((r) => <Cell key={r.model} fill={r.model === data.best ? '#1B7F5C' : '#9AA8BD'} />)}<LabelList dataKey="Accuracy" position="top" formatter={(v) => `${v}%`} fontSize={12} /></Bar>
            </BarChart></ResponsiveContainer></div>
          </Card>
          <Card title="Reading this comparison fairly">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>The best model by test accuracy is highlighted; ties are broken by F1 score.</li>
              <li>A single train/test split can be lucky or unlucky, so compare the cross-validation column too.</li>
              <li>A single decision tree is usually a little less accurate than Random Forest, but it is the only one that gives readable rules - see <Link className="text-cobalt-dark underline" to="/tree">Decision Tree</Link>.</li>
              <li>{rows.length < 4 && `Only ${rows.length} model(s) are trained so far. `}Retraining after changing preprocessing options can change these numbers.</li>
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}
