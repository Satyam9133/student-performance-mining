import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Play, Zap } from 'lucide-react'
import { api } from '../api.js'
import { useApp } from '../context.jsx'
import { Badge, Card, ErrorBox, PageHeader, ProgressBar, WhatIs, pct } from '../components/ui.jsx'

const MODELS = [['decision_tree', 'decision_tree'], ['naive_bayes', 'naive_bayes'], ['random_forest', 'random_forest'], ['knn', 'knn']]
const STAGES = ['Preparing data', 'Splitting train / test', 'Fitting the model', 'Evaluating on test set', 'Cross-validating']

export default function Training() {
  const { status, refresh, setModel } = useApp()
  const [sel, setSel] = useState('decision_tree')
  const [testSize, setTestSize] = useState(0.2)
  const [cv, setCv] = useState(true)
  const [folds, setFolds] = useState(10)
  const [depth, setDepth] = useState(4)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [err, setErr] = useState(null)
  const [results, setResults] = useState(null)

  // The server reports real step timings afterwards; while waiting we just cycle stage names.
  useEffect(() => { if (!busy) return; setStage(0); const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 700); return () => clearInterval(t) }, [busy])

  const run = async (model) => {
    setBusy(true); setErr(null); setResults(null)
    try {
      const r = await api.train({ model, test_size: testSize, cross_validation: cv, cv_folds: folds, max_depth: depth })
      setResults(r.results)
      if (model !== 'all') setModel(model)
      await refresh()
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const info = status.models
  const trained = status.trained

  return (
    <>
      <PageHeader title="Model Training" subtitle="Pick an algorithm and an evaluation setup. The model is really trained on the cleaned data, then tested on records it has never seen." />
      {!status.preprocessed && (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Preprocessing has not been applied. Missing values will be filled inside the model pipeline, but <Link className="font-medium underline" to="/preprocessing">cleaning the data first</Link> is recommended.</div>
      )}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card title="1. Algorithm">
            <div role="radiogroup" className="space-y-2">
              {MODELS.map(([k]) => (
                <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${sel === k ? 'border-cobalt bg-cobalt-soft/50' : 'border-line hover:bg-paper'}`}>
                  <input type="radio" name="model" className="mt-1 accent-cobalt" checked={sel === k} onChange={() => setSel(k)} />
                  <span className="flex-1"><b>{info[k].label}</b>{trained[k] && <Badge tone="green" className="ml-2"><CheckCircle2 size={12} />trained</Badge>}<br /><span className="text-muted">{info[k].description}</span></span>
                </label>
              ))}
            </div>
            {sel === 'decision_tree' && (
              <div className="mt-3"><label className="text-sm font-medium" htmlFor="depth">Maximum tree depth: {depth}</label>
                <input id="depth" type="range" min="2" max="8" value={depth} onChange={(e) => setDepth(+e.target.value)} className="w-full accent-cobalt" />
                <p className="text-xs text-muted">Shallow trees are easy to read; deeper trees fit the data more closely but may over-fit. (WEKA J48 limits this with pruning.)</p></div>
            )}
          </Card>
          <Card title="2. Evaluation setup">
            <WhatIs term="split" />
            <div className="flex gap-2">
              {[[0.2, '80 / 20'], [0.3, '70 / 30']].map(([v, l]) => (
                <button key={v} onClick={() => setTestSize(v)} aria-pressed={testSize === v} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${testSize === v ? 'border-cobalt bg-cobalt text-white' : 'border-line hover:bg-paper'}`}>{l}<span className="block text-[11px] font-normal opacity-80">train / test</span></button>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-cobalt" checked={cv} onChange={(e) => setCv(e.target.checked)} /> Run cross-validation</label>
            {cv && <div className="mt-2"><label className="text-sm" htmlFor="folds">Folds: {folds}</label><input id="folds" type="range" min="3" max="10" value={folds} onChange={(e) => setFolds(+e.target.value)} className="w-full accent-cobalt" /></div>}
            <div className="mt-4 flex gap-2">
              <button className="btn-primary flex-1" disabled={busy} onClick={() => run(sel)}><Play size={16} />Train {info[sel].label.split(' (')[0]}</button>
              <button className="btn-ghost" disabled={busy} onClick={() => run('all')} title="Train all four algorithms with the same settings"><Zap size={16} />Train all</button>
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-3">
          {busy && (
            <Card title="Training in progress">
              <div className="relative mb-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="indeterminate h-full rounded-full bg-cobalt" /></div>
              <ul className="space-y-1 text-sm">{STAGES.filter((_, i) => cv || i < 4).map((s, i) => <li key={s} className={i < stage ? 'text-emerald-700' : i === stage ? 'font-medium' : 'text-muted'}>{i < stage ? '✓' : i === stage ? '●' : '○'} {s}</li>)}</ul>
            </Card>
          )}
          {err && <ErrorBox error={err} />}
          {!busy && !results && !err && (
            <Card title="Results"><p className="text-sm text-muted">Choose settings and press <b>Train</b>. Accuracy, precision, recall, F1 and the cross-validation score will appear here, calculated from the real predictions.</p>
              {Object.keys(trained).length > 0 && <p className="mt-2 text-sm">Already trained: {Object.values(trained).map((t) => `${t.label} (${pct(t.accuracy)})`).join(', ')}.</p>}</Card>
          )}
          {results?.map((r) => (
            <Card key={r.model} title={r.label} action={<Badge tone="blue">{r.split} split · {r.n_train} train / {r.n_test} test</Badge>}>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-5">
                {[['Accuracy', pct(r.accuracy)], ['Precision', pct(r.precision)], ['Recall', pct(r.recall)], ['F1 score', pct(r.f1)], [r.cv ? `${r.cv.folds}-fold CV` : 'Cross-validation', r.cv ? pct(r.cv.mean) : 'Not run']].map(([l, v]) => (
                  <div key={l} className="bg-white px-3 py-2.5"><p className="text-xs text-muted">{l}</p><p className="font-display text-xl font-semibold">{v}</p>{l.includes('CV') && r.cv && <p className="text-[11px] text-muted">± {pct(r.cv.std)}</p>}</div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Precision, recall and F1 are weighted averages over the classes.</p>
              {r.cv && <div className="mt-3"><p className="mb-1 text-xs font-medium">Accuracy in each fold</p><div className="flex items-end gap-1" style={{ height: 48 }}>{r.cv.scores.map((s, i) => <div key={i} className="flex-1 rounded-t bg-cobalt/70" style={{ height: `${s * 100}%` }} title={`Fold ${i + 1}: ${pct(s)}`} />)}</div></div>}
              {r.warnings.map((w) => <p key={w} className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">{w}</p>)}
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-cobalt-dark">Training log ({r.train_seconds}s)</summary>
                <ul className="mt-1 space-y-0.5 text-xs text-muted">{r.steps.map((s) => <li key={s.step}><b className="text-ink">{s.step}</b> - {s.detail} <i>({s.seconds}s)</i></li>)}</ul></details>
              <div className="mt-3 flex gap-2"><Link className="btn-ghost !py-1.5 text-xs" to="/evaluation" onClick={() => setModel(r.model)}>Confusion matrix</Link>
                {r.model === 'decision_tree' && <Link className="btn-ghost !py-1.5 text-xs" to="/tree">View tree</Link>}<Link className="btn-ghost !py-1.5 text-xs" to="/prediction" onClick={() => setModel(r.model)}>Predict a student</Link></div>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
