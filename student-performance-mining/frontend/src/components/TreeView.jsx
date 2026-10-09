import { classColor } from '../context.jsx'

const NODE_W = 176, SLOT = 196, LEVEL = 116, NODE_H = 50
const nice = (s) => s.replaceAll('_', ' ')

// Assign x (by leaf order) and depth to each node, then flatten into arrays for drawing.
function layout(node, depth, counter) {
  const n = { ...node, depth }
  if (node.leaf) { n.x = counter.i++; return n }
  n.left = layout(node.left, depth + 1, counter)
  n.right = layout(node.right, depth + 1, counter)
  n.x = (n.left.x + n.right.x) / 2
  return n
}
function flatten(n, nodes = [], edges = []) {
  nodes.push(n)
  if (!n.leaf) {
    edges.push({ from: n, to: n.left, yes: true }, { from: n, to: n.right, yes: false })
    flatten(n.left, nodes, edges); flatten(n.right, nodes, edges)
  }
  return { nodes, edges }
}

/** Draws the REAL trained tree: decision nodes with conditions, yes/no branches, coloured leaf classes. */
export default function TreeView({ tree, classes, zoom = 1 }) {
  const counter = { i: 0 }
  const root = layout(tree, 0, counter)
  const { nodes, edges } = flatten(root)
  const maxDepth = Math.max(...nodes.map((n) => n.depth))
  const W = counter.i * SLOT + 20, H = (maxDepth + 1) * LEVEL + 10
  const px = (n) => n.x * SLOT + SLOT / 2 + 10, py = (n) => n.depth * LEVEL + 8

  return (
    <svg width={W * zoom} height={H * zoom} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Decision tree diagram" className="font-sans">
      {edges.map((e, i) => {
        const x1 = px(e.from), y1 = py(e.from) + NODE_H, x2 = px(e.to), y2 = py(e.to), my = (y1 + y2) / 2
        return (
          <g key={i}>
            <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} fill="none" stroke="#9AA8BD" strokeWidth="1.5" />
            <text x={(x1 + x2) / 2 + (e.yes ? -10 : 10)} y={my - 3} textAnchor="middle" fontSize="11" fontWeight="600" fill={e.yes ? '#1B7F5C' : '#CC4458'}>{e.yes ? 'yes' : 'no'}</text>
          </g>
        )
      })}
      {nodes.map((n, i) => {
        const x = px(n) - NODE_W / 2, y = py(n)
        if (n.leaf) {
          const c = classColor(n.class, classes.indexOf(n.class))
          return (
            <g key={i}><title>{Object.entries(n.distribution).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).join(', ')}</title>
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx="8" fill={c} />
              <text x={px(n)} y={y + 21} textAnchor="middle" fontSize="14" fontWeight="700" fill="white">{n.class}</text>
              <text x={px(n)} y={y + 38} textAnchor="middle" fontSize="11" fill="white" fillOpacity="0.9">{n.samples} students · {(n.purity * 100).toFixed(0)}% pure</text></g>
          )
        }
        return (
          <g key={i}><title>{`${n.samples} students reach this node`}</title>
            <rect x={x} y={y} width={NODE_W} height={NODE_H} rx="8" fill="white" stroke="#2F4BD0" strokeWidth="1.5" />
            <text x={px(n)} y={y + 21} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#0E1B2C">{nice(n.condition)}?</text>
            <text x={px(n)} y={y + 38} textAnchor="middle" fontSize="11" fill="#5B6B80">{n.samples} students</text></g>
        )
      })}
    </svg>
  )
}
