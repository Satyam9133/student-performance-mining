import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { useApp } from './context.jsx'
import { ErrorBox, Spinner } from './components/ui.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DatasetExplorer from './pages/DatasetExplorer.jsx'
import Preprocessing from './pages/Preprocessing.jsx'
import Visualization from './pages/Visualization.jsx'
import Training from './pages/Training.jsx'
import Comparison from './pages/Comparison.jsx'
import Prediction from './pages/Prediction.jsx'
import DecisionTree from './pages/DecisionTree.jsx'
import Evaluation from './pages/Evaluation.jsx'
import About from './pages/About.jsx'

export default function App() {
  const { loading, error, refresh } = useApp()
  return (
    <Layout>
      {loading ? <Spinner label="Connecting to the backend…" /> : error ? (
        <div className="space-y-3">
          <ErrorBox error={{ message: error }} onRetry={refresh} />
          <p className="text-sm text-muted">Start the API in a second terminal: <code className="rounded bg-white px-1.5 py-0.5">python backend/app.py</code></p>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dataset" element={<DatasetExplorer />} />
          <Route path="/preprocessing" element={<Preprocessing />} />
          <Route path="/visualization" element={<Visualization />} />
          <Route path="/training" element={<Training />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/tree" element={<DecisionTree />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/about" element={<About />} />
        </Routes>
      )}
    </Layout>
  )
}
