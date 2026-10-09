import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Play, Plus } from 'lucide-react'
import { api } from '../api.js'
import { useApp, classColor } from '../context.jsx'
import { Card, ClassBadge, Empty, ErrorBox, PageHeader, ProgressBar, Spinner, WhatIs, pct, useFetch, Badge } from '../components/ui.jsx'
import TreeView from '../components/TreeView.jsx'

export default function DecisionTree() {
  const { status, version, refresh } = useApp()
  const has = !!status.trained.decision_tree
  const { data, loading, error, reload } = useFetch(() => (has ? api.tree() : Promise.resolve(null)), [has, version])
  const [zoom, setZoom] = useState(0.85)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const box = useRef(null)
  // start with the root of the tree in view (it sits in the middle of a wide diagram)
  useEffect(() => { const el = box.current; if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2 }, [data])

  const train = async () => { setBusy(true); setErr(null); try { await api.train({ model: 'decision_tree', test_size: 0.2, cross_validation: true, cv_folds: 10, max_depth: 4 }); await refresh() } catch (e) { setErr(e) } finally { setBusy(false) } }

  if (!has) return (<><PageHeader title="Decision Tree" /><Empty title="The decision tree is not trained yet" action={<div className="flex gap-2"><button className="btn-primary" onClick={train} disabled={busy}><Play size={16} />{busy ? 'Training…' : 'Train with default settings'}</button><Link to="/training" className="btn-ghost">Choose settings</Link></div>}>
    The tree below is drawn from the trained model, so it appears after training.{err && <span className="mt-2 block text-rose-700">{err.message}</span>}</Empty></>)
  if (loading || !data) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  return (
    <>
      <PageHeader title="Decision Tree" subtitle="Decision trees classify records by repeatedly splitting the data using useful attributes. Everything on this page comes from the trained model.">
        <Badge tone="blue">Depth {data.depth}</Badge><Badge tone="blue">{data.leaves} leaves</Badge><Badge tone="green">Test accuracy {pct(data.accuracy)}</Badge>
      </PageHeader>
      <WhatIs term="decision_tree" />
      <div className="space-y-5">
        <Card title="Tree diagram" action={<div className="flex items-center gap-1">
          <button className="btn-ghost !p-1.5" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))} aria-label="Zoom out"><Minus size={15} /></button>
          <span className="w-12 text-center text-xs text-muted">{Math.round(zoom * 100)}%</span>
          <button className="btn-ghost !p-1.5" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="Zoom in"><Plus size={15} /></button></div>}>
          <div ref={box} className="overflow-auto rounded-md bg-paper/60 p-2" style={{ maxHeight: 620 }}><TreeView tree={data.tree} classes={data.classes} zoom={zoom} /></div>
          <p className="mt-2 text-xs text-muted">Follow <b className="text-emerald-700">yes</b> when the student satisfies the condition, <b className="text-rose-700">no</b> otherwise, until you reach a coloured leaf - the predicted Performance. Hover a node for details.</p>
        </Card>

        <div className="grid gap-5 lg:grid-cols-5">
          <Card title={`Decision rules (${data.rules.length})`} className="lg:col-span-3">
            <p className="mb-3 text-sm text-muted">Each path from the top to a leaf is one IF-THEN rule. Thresholds were learned from the data, not typed in. Sorted by the number of students covered.</p>
            <ol className="max-h-[520px] space-y-2 overflow-auto pr-1 text-sm">
              {data.rules.map((r, i) => (
                <li key={i} className="rounded-md border border-line p-3" style={{ borderLeft: `4px solid ${classColor(r.class, data.classes.indexOf(r.class))}` }}>
                  {r.conditions.map((c, k) => <p key={k}><span className="inline-block w-10 font-mono text-xs font-semibold text-cobalt-dark">{k === 0 ? 'IF' : 'AND'}</span>{c.replaceAll('_', ' ')}</p>)}
                  <p className="mt-1 flex flex-wrap items-center gap-2"><span className="inline-block w-10 font-mono text-xs font-semibold text-cobalt-dark">THEN</span>Performance = <ClassBadge label={r.class} index={data.classes.indexOf(r.class)} />
                    <span className="text-xs text-muted">{r.samples} students · {pct(r.confidence, 0)} of them are {r.class}</span></p>
                </li>
              ))}
            </ol>
          </Card>
          <div className="space-y-5 lg:col-span-2">
            <Card title="Attributes used by the tree">
              <div className="space-y-2.5">{data.feature_importance.map((f) => (
                <div key={f.feature}><div className="mb-1 flex justify-between text-xs"><span>{f.feature.replaceAll('_', ' ')}</span><span className="text-muted">{pct(f.importance, 0)}</span></div><ProgressBar value={f.importance} /></div>))}</div>
              <p className="mt-3 text-xs text-muted">Attributes near the top of the tree separate the classes best (highest information gain).</p>
            </Card>
            <Card title="WEKA-style text output"><details><summary className="cursor-pointer text-sm text-cobalt-dark">Show tree as text</summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-navy p-3 text-[11px] leading-snug text-slate-200">{data.text}</pre></details>
              <p className="mt-2 text-xs text-muted">Similar to the textual tree printed by J48 in WEKA&apos;s Classify tab. This model uses scikit-learn, not WEKA itself.</p></Card>
          </div>
        </div>
      </div>
    </>
  )
}
