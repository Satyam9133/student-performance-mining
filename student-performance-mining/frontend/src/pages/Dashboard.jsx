import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Lightbulb } from 'lucide-react'
import { api } from '../api.js'
import { useApp, classColor } from '../context.jsx'
import { Badge, Card, ErrorBox, PageHeader, ProgressBar, Spinner, Stat, WhatIs, useFetch, Disclaimer } from '../components/ui.jsx'

const KPI = [['Attendance', 'Average attendance', (v) => `${v.toFixed(1)}%`], ['Internal_Marks', 'Average internal marks', (v) => v.toFixed(1)],
  ['Assignment_Marks', 'Average assignment marks', (v) => v.toFixed(1)], ['Study_Hours', 'Average study hours', (v) => `${v.toFixed(1)} hrs/day`]]

export default function Dashboard() {
  const { version } = useApp()
  const stats = useFetch(api.statistics, [version])
  const ins = useFetch(api.insights, [version])
  if (stats.loading) return <Spinner />
  if (stats.error) return <ErrorBox error={stats.error} onRetry={stats.reload} />
  const s = stats.data, q = s.quality, best = s.best_category
  const qTone = q.quality_score >= 95 ? 'green' : q.quality_score >= 90 ? 'amber' : 'red'

  return (
    <>
      <PageHeader title="Dashboard" subtitle="A live summary of the loaded dataset. Every number is calculated from the data - nothing here is typed in by hand." />

      {/* Hero: the class distribution of the real dataset */}
      <section className="panel mb-5 overflow-hidden">
        <div className="px-5 pb-4 pt-5">
          <p className="font-display text-3xl font-semibold">{s.total_students.toLocaleString()} students, {s.distribution.length} performance classes</p>
          <p className="mt-1 text-sm text-muted">Share of students in each class ({s.labelled_students.toLocaleString()} have a recorded Performance).</p>
          <div className="mt-4 flex h-12 w-full overflow-hidden rounded-md" role="img" aria-label="Performance class distribution">
            {s.distribution.map((d, i) => (
              <div key={d.label} className="grow-in flex min-w-0 items-center justify-center text-xs font-semibold text-white" title={`${d.label}: ${d.count}`}
                style={{ width: `${d.pct}%`, background: classColor(d.label, i), animationDelay: `${i * 90}ms` }}>
                {d.pct >= 8 && `${d.label} ${d.pct}%`}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-line border-t border-line md:grid-cols-4 lg:grid-cols-7 lg:divide-y-0">
          <Stat label="Total students" value={s.total_students.toLocaleString()} />
          {KPI.filter(([k]) => s.means[k] != null).map(([k, label, f]) => <Stat key={k} label={label} value={f(s.means[k])} />)}
          <Stat label="Best performing category" value={best.label} hint={`${best.count} students (${best.pct}%)`} />
          <Stat label="Dataset quality" value={`${q.quality_score}%`} hint={q.quality_label} />
        </div>
      </section>

      <WhatIs term="classification" />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Performance distribution" className="lg:col-span-3">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={s.distribution} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E4EAF1" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(v, n, p) => [`${v} students (${p.payload.pct}%)`, 'Count']} cursor={{ fill: '#EDF1F6' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {s.distribution.map((d, i) => <Cell key={d.label} fill={classColor(d.label, i)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Dataset quality" className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2"><span className="font-display text-3xl font-semibold">{q.quality_score}%</span><Badge tone={qTone}>{q.quality_label}</Badge></div>
          <ProgressBar value={q.quality_score / 100} color={qTone === 'green' ? '#1B7F5C' : qTone === 'amber' ? '#D99A00' : '#CC4458'} />
          <dl className="mt-4 space-y-1.5 text-sm">
            {[['Missing values', q.missing_total], ['Duplicate rows', q.duplicates], ['Impossible values', q.invalid_total], ['Inconsistent labels', q.inconsistent_labels]].map(([k, v]) => (
              <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className={v ? 'font-medium text-ink' : 'text-muted'}>{v}</dd></div>
            ))}
          </dl>
          <Link to="/preprocessing" className="btn-ghost mt-4 w-full">Open preprocessing</Link>
        </Card>

        <Card title="Which attributes tell most about performance?" className="lg:col-span-2">
          <WhatIs term="feature_selection" />
          <div className="space-y-2.5">
            {s.feature_ranking.slice(0, 7).map((f) => (
              <div key={f.feature}>
                <div className="mb-1 flex justify-between text-xs"><span>{f.feature.replaceAll('_', ' ')}</span><span className="text-muted">{f.mutual_info.toFixed(3)}</span></div>
                <ProgressBar value={f.score} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Data mining insights" className="lg:col-span-3">
          {ins.loading ? <Spinner /> : ins.error ? <ErrorBox error={ins.error} /> : (
            <ul className="space-y-2.5">
              {ins.data.insights.map((i, k) => (
                <li key={k} className={`flex gap-2.5 text-sm ${i.kind === 'caution' ? 'rounded-md bg-amber-50 p-2.5 text-amber-900' : ''}`}>
                  <Lightbulb size={16} className="mt-0.5 shrink-0 text-cobalt" /><span>{i.text}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Generated from the current dataset - the sentences change if the data changes.</p>
        </Card>
      </div>
      <Disclaimer />
    </>
  )
}
