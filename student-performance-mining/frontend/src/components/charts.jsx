import { classColor } from '../context.jsx'

/** Box plot drawn with plain SVG: one box per class for the chosen attribute. */
export function BoxPlot({ rows, unit = '' }) {
  if (!rows?.length) return null
  const W = 560, H = 260, m = { l: 44, r: 12, t: 12, b: 34 }
  const lo = Math.min(...rows.map((r) => r.min)), hi = Math.max(...rows.map((r) => r.max))
  const pad = (hi - lo) * 0.08 || 1
  const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - (lo - pad)) / (hi - lo + 2 * pad))
  const band = (W - m.l - m.r) / rows.length
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Box plot by performance class">
      {ticks.map((t) => <g key={t}><line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#E4EAF1" /><text x={m.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5B6B80">{t.toFixed(0)}</text></g>)}
      {rows.map((r, i) => {
        const cx = m.l + band * (i + 0.5), w = Math.min(54, band * 0.55), c = classColor(r.label, i)
        return (
          <g key={r.label}>
            <line x1={cx} x2={cx} y1={y(r.max)} y2={y(r.min)} stroke={c} strokeWidth="1.5" />
            <line x1={cx - w / 4} x2={cx + w / 4} y1={y(r.max)} y2={y(r.max)} stroke={c} strokeWidth="1.5" />
            <line x1={cx - w / 4} x2={cx + w / 4} y1={y(r.min)} y2={y(r.min)} stroke={c} strokeWidth="1.5" />
            <rect x={cx - w / 2} y={y(r.q3)} width={w} height={Math.max(2, y(r.q1) - y(r.q3))} fill={c} fillOpacity="0.22" stroke={c} strokeWidth="1.5" rx="2">
              <title>{`${r.label}: min ${r.min.toFixed(1)}, Q1 ${r.q1.toFixed(1)}, median ${r.median.toFixed(1)}, Q3 ${r.q3.toFixed(1)}, max ${r.max.toFixed(1)}${unit} (${r.outliers} outliers)`}</title>
            </rect>
            <line x1={cx - w / 2} x2={cx + w / 2} y1={y(r.median)} y2={y(r.median)} stroke={c} strokeWidth="3" />
            <text x={cx} y={H - 12} textAnchor="middle" fontSize="12" fill="#0E1B2C">{r.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** Correlation heat-map: blue = positive, red = negative. */
export function Heatmap({ labels, matrix }) {
  const color = (v) => {
    if (v == null) return '#f1f5f9'
    const a = Math.min(1, Math.abs(v))
    return v >= 0 ? `rgba(47,75,208,${0.12 + a * 0.88})` : `rgba(204,68,88,${0.12 + a * 0.88})`
  }
  const short = (s) => s.replace('Performance (rank)', 'Performance').replaceAll('_', ' ')
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px] text-xs">
        <thead><tr><th />{labels.map((l) => <th key={l} className="max-w-[72px] px-1 pb-1 align-bottom font-medium text-muted"><div className="-rotate-45 origin-bottom-left whitespace-nowrap pl-3" style={{ height: 70, width: 40 }}>{short(l)}</div></th>)}</tr></thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th className="whitespace-nowrap pr-2 text-right font-medium text-muted">{short(labels[i])}</th>
              {row.map((v, j) => (
                <td key={j} title={`${short(labels[i])} vs ${short(labels[j])}: ${v}`} className="h-10 w-12 rounded-sm text-center font-medium"
                  style={{ background: color(v), color: v != null && Math.abs(v) > 0.55 ? 'white' : '#0E1B2C' }}>{v == null ? '–' : v.toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
