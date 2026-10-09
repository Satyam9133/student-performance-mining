import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api.js'
import { useApp, classColor } from '../context.jsx'
import { Card, Empty, ErrorBox, PageHeader, Spinner, WhatIs, pct, useFetch } from '../components/ui.jsx'
import ConfusionMatrix from '../components/ConfusionMatrix.jsx'
import ModelPicker from '../components/ModelPicker.jsx'

export default function Evaluation() {
  const { status, model, setModel, version } = useApp()
  const keys = Object.keys(status.trained)
  const active = keys.includes(model) ? model : keys[0]
  useEffect(() => { if (active && active !== model) setModel(active) }, [active, model, setModel])
  const { data, loading, error, reload } = useFetch(() => (active ? api.confusion(active) : Promise.resolve(null)), [active, version])
  const [cls, setCls] = useState(0)

  if (!keys.length) return (<><PageHeader title="Evaluation" /><Empty title="No trained model" action={<Link to="/training" className="btn-primary">Go to Model Training</Link>}>Train a model to see its confusion matrix and per-class results.</Empty></>)
  if (loading || !data) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  const L = data.labels, M = data.matrix
  const total = M.flat().reduce((a, b) => a + b, 0)
  const i = Math.min(cls, L.length - 1)
  const TP = M[i][i], FN = M[i].reduce((a, b) => a + b, 0) - TP, FP = M.reduce((a, r) => a + r[i], 0) - TP, TN = total - TP - FN - FP
  const name = L[i]

  return (
    <>
      <PageHeader title="Evaluation" subtitle="How the selected model behaves on the test set - records it never saw while learning."><ModelPicker /></PageHeader>
      <WhatIs term="confusion" />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card title={`Confusion matrix - ${data.label}`} className="lg:col-span-3" action={<span className="text-xs text-muted">{data.n_test} test students · {data.split} split</span>}>
          <ConfusionMatrix labels={L} matrix={M} highlight={i} />
          <p className="mt-3 text-sm text-muted">Green diagonal = correct predictions ({M.reduce((a, r, k) => a + r[k], 0)} of {total}, accuracy {pct(data.accuracy)}). Red cells are mistakes - most are between neighbouring classes such as Good and Average.</p>
        </Card>

        <Card title="Per-class results" className="lg:col-span-2" pad={false}>
          <table className="w-full"><thead><tr><th className="th">Class</th><th className="th text-right">Precision</th><th className="th text-right">Recall</th><th className="th text-right">F1</th><th className="th text-right">Support</th></tr></thead>
            <tbody>{data.per_class.map((p, k) => <tr key={p.label}><td className="td font-medium" style={{ color: classColor(p.label, k) }}>{p.label}</td><td className="td text-right">{pct(p.precision)}</td><td className="td text-right">{pct(p.recall)}</td><td className="td text-right">{pct(p.f1)}</td><td className="td text-right text-muted">{p.support}</td></tr>)}</tbody></table>
          {data.cv && <p className="border-t border-line px-4 py-3 text-sm text-muted">{data.cv.folds}-fold cross-validation accuracy: <b className="text-ink">{pct(data.cv.mean)}</b> (± {pct(data.cv.std)})</p>}
        </Card>

        <Card title="TP, FP, FN and TN in plain language" className="lg:col-span-3" action={
          <select className="input !w-auto !py-1" value={i} onChange={(e) => setCls(+e.target.value)} aria-label="Class to explain">{L.map((l, k) => <option key={l} value={k}>{l}</option>)}</select>}>
          <p className="mb-3 text-sm text-muted">Treating <b className="text-ink">{name}</b> as the class of interest, using this model&apos;s real numbers:</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[['True Positive', TP, `Real ${name} students correctly predicted as ${name}.`, '#1B7F5C'], ['False Positive', FP, `Students predicted as ${name} who actually belong to another class (false alarms).`, '#D99A00'],
              ['False Negative', FN, `Real ${name} students the model missed by predicting another class.`, '#CC4458'], ['True Negative', TN, `Students who are not ${name} and were correctly not predicted as ${name}.`, '#5B6B80']].map(([t, v, d, c]) => (
              <div key={t} className="rounded-md border border-line p-3" style={{ borderLeft: `4px solid ${c}` }}><dt className="flex items-baseline justify-between"><b>{t}</b><span className="font-display text-xl font-semibold">{v}</span></dt><dd className="mt-1 text-muted">{d}</dd></div>))}
          </dl>
          <p className="mt-3 text-xs text-muted">Precision = TP / (TP + FP) = {pct(TP / (TP + FP || 1))} · Recall = TP / (TP + FN) = {pct(TP / (TP + FN || 1))}</p>
        </Card>

        <Card title="Which attributes does the model rely on?" className="lg:col-span-2">
          <WhatIs term="importance" />
          <div className="h-60"><ResponsiveContainer><BarChart layout="vertical" data={data.feature_importance.slice(0, 8).map((f) => ({ name: f.feature.replaceAll('_', ' '), value: +(f.importance * 100).toFixed(1) }))} margin={{ left: 20, right: 12 }}>
            <CartesianGrid horizontal={false} stroke="#E4EAF1" /><XAxis type="number" unit="%" tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: '#EDF1F6' }} /><Bar dataKey="value" name="Share of importance" fill="#2F4BD0" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>
    </>
  )
}
