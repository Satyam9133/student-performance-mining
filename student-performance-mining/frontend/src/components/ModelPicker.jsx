import { useApp } from '../context.jsx'

/** Tabs for the models that have been trained. */
export default function ModelPicker() {
  const { status, model, setModel } = useApp()
  const keys = Object.keys(status.trained)
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Trained model">
      {keys.map((k) => (
        <button key={k} role="tab" aria-selected={model === k} onClick={() => setModel(k)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${model === k ? 'border-cobalt bg-cobalt text-white' : 'border-line bg-white hover:bg-paper'}`}>
          {status.models[k].label.split(' (')[0]}</button>
      ))}
    </div>
  )
}
