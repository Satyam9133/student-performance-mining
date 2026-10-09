import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export const CLASS_COLORS = { Excellent: '#1B7F5C', Good: '#2F6FDB', Average: '#D99A00', Poor: '#CC4458' }
const FALLBACK = ['#7C3AED', '#0891B2', '#DB2777', '#65A30D']
export const classColor = (label, i = 0) => CLASS_COLORS[label] || FALLBACK[i % FALLBACK.length]

export function AppProvider({ children }) {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [model, setModel] = useState('decision_tree')   // model shared by Evaluation / Prediction pages
  const [version, setVersion] = useState(0)             // bumps whenever data or models change

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.status())
      setError(null)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return <Ctx.Provider value={{ status, error, loading, refresh, model, setModel, version }}>{children}</Ctx.Provider>
}
