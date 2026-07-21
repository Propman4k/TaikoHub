// "Tool hinzufuegen": zeigt verfuegbare, noch nicht hinzugefuegte Tools zur Auswahl.
import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { api } from './api.js'
import { Glyph } from './Glyph.jsx'

export function AddToolPicker({ onAdd, onClose }) {
  const [avail, setAvail] = useState(null)
  const [sel, setSel] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.available().then(setAvail).catch(() => setAvail([])) }, [])
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const confirm = async () => { setBusy(true); await onAdd(sel) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-surface rounded-2xl shadow-elevated w-full max-w-md border border-border animate-modal-in overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tool hinzufuegen</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-md">
            <X size={16} />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-1.5 max-h-[55vh] overflow-y-auto">
          {avail === null && (
            <div className="flex items-center justify-center py-10 text-text-light"><Loader2 className="animate-spin" /></div>
          )}
          {avail?.length === 0 && (
            <p className="text-sm text-text-muted px-3 py-8 text-center">
              Keine weiteren Tools verfuegbar. Alles Freigegebene ist schon auf deinem Board.
            </p>
          )}
          {avail?.map((t) => (
            <label key={t.toolId}
                   className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={sel.includes(t.toolId)} onChange={() => toggle(t.toolId)}
                     className="h-[18px] w-[18px] rounded-[4px] accent-sky-500 cursor-pointer" />
              <Glyph icon={t.icon} color={t.color} box={36} radius={8} glyph={18} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{t.name}</span>
                <span className="block text-[11px] text-text-light truncate">{t.url}</span>
              </span>
            </label>
          ))}
        </div>
        {avail?.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <button onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300
                               rounded-[6px] hover:bg-slate-50 transition-colors">Abbrechen</button>
            <button onClick={confirm} disabled={!sel.length || busy}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover
                               disabled:bg-brand/50 disabled:cursor-not-allowed rounded-[6px] transition-colors flex items-center gap-2">
              {busy && <Loader2 size={15} className="animate-spin" />}
              {sel.length ? `${sel.length} hinzufuegen` : 'Hinzufuegen'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
