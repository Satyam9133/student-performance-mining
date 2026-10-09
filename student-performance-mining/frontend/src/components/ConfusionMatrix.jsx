import { classColor } from '../context.jsx'

/** Rows = actual class, columns = predicted class. Diagonal (correct) cells are green. */
export default function ConfusionMatrix({ labels, matrix, highlight }) {
  const max = Math.max(...matrix.flat(), 1)
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-sm">
        <thead>
          <tr><th /><th colSpan={labels.length} className="pb-1 text-center text-xs font-medium text-muted">Predicted class</th></tr>
          <tr><th />{labels.map((l, i) => <th key={l} className={`px-2 pb-1 text-xs font-semibold ${highlight === i ? 'text-cobalt-dark' : ''}`} style={{ color: highlight === i ? undefined : classColor(l, i) }}>{l}</th>)}</tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th className="whitespace-nowrap pr-2 text-right text-xs font-semibold" style={{ color: classColor(labels[i], i) }}>
                {i === 0 && <span className="mr-2 text-[11px] font-medium text-muted">Actual</span>}{labels[i]}</th>
              {row.map((v, j) => {
                const correct = i === j
                const a = 0.08 + 0.92 * (v / max)
                return <td key={j} title={`${v} students whose real class is ${labels[i]} were predicted as ${labels[j]}`}
                  className={`h-16 w-20 rounded-md text-center font-display text-xl font-semibold ${highlight === i || highlight === j ? 'ring-2 ring-cobalt' : ''}`}
                  style={{ background: correct ? `rgba(27,127,92,${a})` : `rgba(204,68,88,${v ? a * 0.8 : 0.04})`, color: a > 0.55 ? 'white' : '#0E1B2C' }}>{v}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
