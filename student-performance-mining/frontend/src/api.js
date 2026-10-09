// All backend calls go through this file. Vite proxies /api -> Flask (port 5000).
async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, options)
  } catch {
    throw new Error('Cannot reach the backend. Start it with: python backend/app.py')
  }
  let data = null
  try { data = await res.json() } catch { /* non-JSON response */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.details = data?.details
    err.status = res.status
    throw err
  }
  return data
}

const post = (path, body) =>
  request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  status: () => request('/status'),
  dataset: (params) => request(`/dataset${qs(params)}`),
  upload: (file) => { const f = new FormData(); f.append('file', file); return request('/upload', { method: 'POST', body: f }) },
  reset: () => post('/reset'),
  statistics: () => request('/statistics'),
  insights: () => request('/insights'),
  visualizations: () => request('/visualizations'),
  preprocessStatus: () => request('/preprocess'),
  preprocess: (cfg) => post('/preprocess', cfg),
  train: (cfg) => post('/train', cfg),
  comparison: () => request('/model-comparison'),
  confusion: (model) => request(`/confusion-matrix${qs({ model })}`),
  tree: () => request('/decision-tree'),
  predict: (body) => post('/predict', body),
  support: (model) => request(`/support-insights${qs({ model })}`),
}
