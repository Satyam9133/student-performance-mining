import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Legend } from 'recharts'
import { api } from '../api.js'
import { useApp, classColor } from '../context.jsx'
import { Card, ErrorBox, PageHeader, Spinner, WhatIs, useFetch } from '../components/ui.jsx'
import { BoxPlot, Heatmap } from '../components/charts.jsx'

const nice = (s) => s.replaceAll('_', ' ')

export default function Visualization() {
  const { version } = useApp()
  const { data, loading, error, reload } = useFetch(api.visualizations, [version])
  const [boxFeature, setBoxFeature] = useState(null)
  const [sx, setSx] = useState(null)
  const [sy, setSy] = useState(null)
  if (loading) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const d = data, num = d.numeric
  const bf = boxFeature || num[0], ax = sx || num[0], ay = sy || num[1] || num[0]

  return (
    <>
      <PageHeader title="Data Visualization" subtitle="Charts are built from the current dataset. Use them to see which attributes separate the performance classes." />
      <WhatIs term="correlation" />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Performance distribution" className="lg:col-span-1">
          <div className="h-56"><ResponsiveContainer><BarChart data={d.distribution} margin={{ left: -18, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} stroke="#E4EAF1" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#EDF1F6' }} /><Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>{d.distribution.map((r, i) => <Cell key={r.label} fill={classColor(r.label, i)} />)}</Bar>
          </BarChart></ResponsiveContainer></div>
        </Card>

        {num.map((f) => (
          <Card key={f} title={`${nice(f)} vs Performance`}>
            <p className="-mt-1 mb-2 text-xs text-muted">Average {nice(f).toLowerCase()} in each class</p>
            <div className="h-48"><ResponsiveContainer><BarChart data={d.class_stats[f]} margin={{ left: -14, right: 4, top: 4 }}>
              <CartesianGrid vertical={false} stroke="#E4EAF1" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [Number(v).toFixed(2), 'Average']} cursor={{ fill: '#EDF1F6' }} />
              <Bar dataKey="mean" radius={[4, 4, 0, 0]}>{d.class_stats[f].map((r, i) => <Cell key={r.label} fill={classColor(r.label, i)} />)}</Bar>
            </BarChart></ResponsiveContainer></div>
          </Card>
        ))}

        <Card title="Correlation heatmap" className="lg:col-span-3">
          <p className="mb-3 max-w-3xl text-sm text-muted">Blue cells mean two attributes rise together; red means one rises as the other falls. The last row shows each attribute&apos;s correlation with the performance level (Poor = 0 … Excellent = 3). Correlation is not causation.</p>
          <Heatmap labels={d.correlation.labels} matrix={d.correlation.matrix} />
        </Card>

        <Card title="Spread of values (box plot)" className="lg:col-span-2" action={
          <select className="input !w-auto !py-1" value={bf} onChange={(e) => setBoxFeature(e.target.value)} aria-label="Attribute for box plot">{num.map((n) => <option key={n} value={n}>{nice(n)}</option>)}</select>}>
          <BoxPlot rows={d.class_stats[bf]} />
          <p className="text-xs text-muted">Box = middle 50% of students, thick line = median, whiskers = typical range.</p>
        </Card>

        <Card title="Scatter explorer" className="lg:col-span-3" action={
          <div className="flex items-center gap-2 text-sm">
            <select className="input !w-auto !py-1" value={ax} onChange={(e) => setSx(e.target.value)} aria-label="X axis">{num.map((n) => <option key={n} value={n}>{nice(n)}</option>)}</select>
            <span className="text-muted">vs</span>
            <select className="input !w-auto !py-1" value={ay} onChange={(e) => setSy(e.target.value)} aria-label="Y axis">{num.map((n) => <option key={n} value={n}>{nice(n)}</option>)}</select>
          </div>}>
          <div className="h-80"><ResponsiveContainer><ScatterChart margin={{ left: 0, right: 12, top: 8, bottom: 16 }}>
            <CartesianGrid stroke="#E4EAF1" /><XAxis type="number" dataKey={ax} name={nice(ax)} tickLine={false} label={{ value: nice(ax), position: 'insideBottom', offset: -8, fontSize: 12 }} domain={['auto', 'auto']} />
            <YAxis type="number" dataKey={ay} name={nice(ay)} tickLine={false} label={{ value: nice(ay), angle: -90, position: 'insideLeft', fontSize: 12 }} domain={['auto', 'auto']} /><ZAxis range={[28, 28]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} /><Legend verticalAlign="top" height={28} />
            {d.classes.map((c, i) => <Scatter key={c} name={c} data={d.scatter.filter((p) => p.Performance === c && p[ax] != null && p[ay] != null)} fill={classColor(c, i)} fillOpacity={0.55} />)}
          </ScatterChart></ResponsiveContainer></div>
          <p className="text-xs text-muted">A random sample of up to 500 students. Overlap between colours is exactly why classification is not 100% accurate.</p>
        </Card>
      </div>
    </>
  )
}
