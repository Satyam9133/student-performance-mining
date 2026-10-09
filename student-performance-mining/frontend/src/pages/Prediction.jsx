import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, Sparkles, Users } from 'lucide-react'
import { api } from '../api.js'
import { useApp, classColor } from '../context.jsx'
import { Badge, Card, ClassBadge, Empty, ErrorBox, PageHeader, ProgressBar, Spinner, pct, Disclaimer } from '../components/ui.jsx'
import ModelPicker from '../components/ModelPicker.jsx'

const nice = (s) => s.replaceAll('_', ' ')
const SUPPORT = { 'Performing Well': ['green', 'Performing well'], 'On Track': ['blue', 'On track'], 'Needs Attention': ['amber', 'Needs attention'] }
const phrase = (f) => f.value === f.typical ? 'At the typical value (no effect)' : f.direction === 'neutral' ? 'No clear influence' : `${f.strength} ${f.direction === 'supports' ? 'positive' : 'negative'} influence`

function SupportBadge({ category }) {
  const [tone, label] = SUPPORT[category] || ['slate', category]
  return <Badge tone={tone}>{label}</Badge>
}

export default function Prediction() {
  const { status, model, setModel } = useApp()
  const keys = Object.keys(status.trained)
  const active = keys.includes(model) ? model : keys[0]
  useEffect(() => { if (active && active !== model) setModel(active) }, [active, model, setModel])

  const defaults = useMemo(() => Object.fromEntries(status.schema.map((f) => [f.name, f.kind === 'numeric' ? f.median : f.default])), [status.schema])
  const [vals, setVals] = useState(defaults)
  useEffect(() => setVals(defaults), [defaults])
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sup, setSup] = useState(null)
  const [supBusy, setSupBusy] = useState(false)
  const [supErr, setSupErr] = useState(null)
  const [trainBusy, setTrainBusy] = useState(false)
  const { refresh } = useApp()

  const predict = async (e) => {
    e?.preventDefault(); setBusy(true); setErr(null)
    try { setRes(await api.predict({ model: active, features: vals })) } catch (x) { setErr(x); setRes(null) } finally { setBusy(false) }
  }
  const analyse = async () => { setSupBusy(true); setSupErr(null); try { setSup(await api.support(active)) } catch (x) { setSupErr(x) } finally { setSupBusy(false) } }
  const trainDefault = async () => { setTrainBusy(true); try { await api.train({ model: 'decision_tree', test_size: 0.2, cross_validation: true, cv_folds: 10, max_depth: 4 }); await refresh() } catch (x) { setErr(x) } finally { setTrainBusy(false) } }

  if (!keys.length) return (<><PageHeader title="Student Prediction" /><Empty title="Train a model first" action={<div className="flex gap-2"><button className="btn-primary" onClick={trainDefault} disabled={trainBusy}>{trainBusy ? 'Training…' : 'Train Decision Tree now'}</button><Link to="/training" className="btn-ghost">Choose a model</Link></div>}>Predictions come from a model trained on your dataset.{err && <span className="mt-2 block text-rose-700">{err.message}</span>}</Empty></>)

  const fieldErrors = err?.details || []
  const top = res && res.probabilities.slice().sort((a, b) => b.probability - a.probability)

  return (
    <>
      <PageHeader title="Student Prediction" subtitle="Enter a student's details. The trained model predicts the performance class and shows which inputs pushed the result."><ModelPicker /></PageHeader>
      <div className="grid gap-5 lg:grid-cols-5">
        <form className="lg:col-span-2" onSubmit={predict} noValidate>
          <Card title="Student details">
            <div className="space-y-4">
              {status.schema.map((f) => (
                <div key={f.name}>
                  <label htmlFor={f.name} className="mb-1 flex justify-between text-sm font-medium">{nice(f.name)}{f.kind === 'numeric' && <span className="font-normal text-muted">{f.min}–{f.max}</span>}</label>
                  {f.kind === 'numeric' ? (
                    <div className="flex items-center gap-3">
                      <input type="range" min={f.min} max={f.max} step={f.step} value={vals[f.name] ?? f.median} onChange={(e) => setVals({ ...vals, [f.name]: +e.target.value })} className="flex-1 accent-cobalt" aria-label={`${nice(f.name)} slider`} />
                      <input id={f.name} type="number" min={f.min} max={f.max} step="any" className="input !w-20" value={vals[f.name] ?? ''} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value === '' ? '' : +e.target.value })} />
                    </div>
                  ) : (
                    <select id={f.name} className="input" value={vals[f.name] ?? f.default} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                  )}
                </div>
              ))}
            </div>
            {err && <div className="mt-4"><ErrorBox error={err} /></div>}
            <div className="mt-5 flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={busy}><Sparkles size={16} />{busy ? 'Predicting…' : 'Predict performance'}</button>
              <button type="button" className="btn-ghost" onClick={() => { setVals(defaults); setRes(null); setErr(null) }}>Reset</button>
            </div>
            <p className="mt-2 text-xs text-muted">Sliders start at the dataset median. Use anonymised or example data only.</p>
          </Card>
        </form>

        <div className="space-y-5 lg:col-span-3">
          {!res && !busy && <Card title="Prediction"><p className="text-sm text-muted">Adjust the values and press <b>Predict performance</b>. The result, confidence and influencing factors will appear here.</p></Card>}
          {busy && <Spinner label="Running the model…" />}
          {res && (
            <>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted">Predicted performance ({res.model_label})</p>
                    <p className="font-display text-5xl font-bold" style={{ color: classColor(res.prediction, res.probabilities.findIndex((p) => p.label === res.prediction)) }}>{res.prediction.toUpperCase()}</p>
                    <div className="mt-2 flex items-center gap-2"><SupportBadge category={res.support_category} /><span className="text-xs text-muted">temporary decision-support group, not a label</span></div>
                  </div>
                  <div className="text-right"><p className="text-sm text-muted">Confidence</p><p className="font-display text-4xl font-semibold">{pct(res.confidence, 0)}</p><p className="text-xs text-muted">model test accuracy {pct(res.model_accuracy, 0)}</p></div>
                </div>
                <div className="mt-4 space-y-1.5">{top.map((p) => (
                  <div key={p.label} className="flex items-center gap-3 text-sm"><span className="w-20">{p.label}</span><div className="flex-1"><ProgressBar value={p.probability} color={classColor(p.label, res.probabilities.findIndex((x) => x.label === p.label))} /></div><span className="w-10 text-right text-muted">{pct(p.probability, 0)}</span></div>))}</div>
                {res.missing_inputs.length > 0 && <p className="mt-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">Not provided and filled with typical values: {res.missing_inputs.map(nice).join(', ')}.</p>}
              </Card>

              <Card title="Factors influencing this prediction">
                <ul className="divide-y divide-line">{res.factors.map((f) => (
                  <li key={f.feature} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-36 font-medium">{nice(f.feature)}</span>
                    <span className="flex-1"><span className={f.direction === 'supports' ? 'text-emerald-700' : f.direction === 'works against' ? 'text-rose-700' : 'text-muted'}>{phrase(f)}</span>
                      <span className="block text-xs text-muted">value {typeof f.value === 'number' ? f.value : f.value} · typical {typeof f.typical === 'number' ? f.typical : f.typical}</span></span>
                    <span className="flex w-24 items-center" aria-hidden><span className="flex h-2 flex-1 justify-end"><i className="block h-2 rounded-l bg-rose-500" style={{ width: `${f.effect < 0 ? Math.min(100, -f.effect * 250) : 0}%` }} /></span><span className="h-4 w-px bg-line" /><span className="flex h-2 flex-1"><i className="block h-2 rounded-r bg-emerald-600" style={{ width: `${f.effect > 0 ? Math.min(100, f.effect * 250) : 0}%` }} /></span></span>
                  </li>))}</ul>
                <p className="mt-3 text-xs text-muted">Each factor is tested by replacing that one value with the dataset&apos;s typical value and seeing how the model&apos;s confidence in <b>{res.prediction}</b> changes. This explains the model, not the real world, and is not an academic judgement.</p>
              </Card>

              <Card title="Academic support insights">
                {res.support_category === 'Performing Well' ? <p className="text-sm">The model places this profile in the top group. Keep the current habits going.</p> : res.suggestions.length ? (
                  <>
                    <p className="mb-2 text-sm text-muted">Compared with the typical Good/Excellent student in this dataset, these areas are lower:</p>
                    <ul className="space-y-2 text-sm">{res.suggestions.map((s) => <li key={s.feature} className="flex gap-2"><LifeBuoy size={16} className="mt-0.5 shrink-0 text-cobalt" /><span><b>{s.suggestion}</b> <span className="text-muted">- {nice(s.feature)} is {s.value}, typical top-group value is {s.benchmark}</span></span></li>)}</ul>
                  </>
                ) : <p className="text-sm text-muted">No attribute is clearly below the top-group average. Review the other factors above.</p>}
                <p className="mt-3 rounded bg-paper px-2 py-1.5 text-xs text-muted">This is decision support only. Predictions are not guaranteed outcomes and should be reviewed by a teacher or mentor.</p>
              </Card>
            </>
          )}
        </div>

        <Card title="Academic support insights for the whole dataset" className="lg:col-span-5" action={<button className="btn-ghost" onClick={analyse} disabled={supBusy}><Users size={16} />{supBusy ? 'Analysing…' : sup ? 'Refresh' : 'Analyse all students'}</button>}>
          <p className="text-sm text-muted">Each student is predicted by a model that never saw that student (5-fold out-of-fold predictions) and placed in a temporary support group. Groups are not permanent labels.</p>
          {supErr && <div className="mt-3"><ErrorBox error={supErr} /></div>}
          {sup && (
            <div className="mt-4">
              <div className="flex h-9 overflow-hidden rounded-md">{['Performing Well', 'On Track', 'Needs Attention'].map((k, i) => sup.counts[k] > 0 && <div key={k} className="flex items-center justify-center text-xs font-semibold text-white" style={{ width: `${(sup.counts[k] / sup.total) * 100}%`, background: ['#1B7F5C', '#2F6FDB', '#D99A00'][i] }}>{sup.counts[k]}</div>)}</div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">{['Performing Well', 'On Track', 'Needs Attention'].map((k) => <span key={k}>{k}: <b className="text-ink">{sup.counts[k]}</b> ({((sup.counts[k] / sup.total) * 100).toFixed(0)}%)</span>)}</div>
              <p className="mb-2 mt-5 text-sm font-medium">Students who may benefit from a conversation ({sup.students.length} of {sup.needs_total} shown, lowest predictions first)</p>
              <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Student</th><th className="th">Predicted</th><th className="th">Suggested focus</th></tr></thead>
                <tbody>{sup.students.map((s) => <tr key={s.student}><td className="td font-medium">{s.student}</td><td className="td"><ClassBadge label={s.predicted} /></td><td className="td whitespace-normal text-muted">{s.weak_areas.map((w) => w.suggestion).join(' · ') || '-'}</td></tr>)}</tbody></table></div>
            </div>
          )}
        </Card>
      </div>
      <Disclaimer />
    </>
  )
}
