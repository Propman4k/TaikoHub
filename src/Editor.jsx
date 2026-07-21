// Board-Optionen-Modal: pro-Nutzer-Optionen einer Kachel — macOS-App fuer den
// Opener + vom Board entfernen. (Katalog-Bearbeitung lebt in Settings -> AppForm.)
import { useState } from 'react'
import { X, EyeOff } from 'lucide-react'
import { Glyph } from './Glyph.jsx'

export function Editor({ initial, onSave, onClose }) {
  const [macApp, setMacApp] = useState(initial?.macApp || '')
  const save = (hidden) =>
    onSave({ toolId: initial?.toolId, placement: { macApp: macApp.trim(), hidden } })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
         onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(false) }}
            className="relative bg-surface rounded-2xl shadow-elevated w-full max-w-md flex flex-col
                       animate-modal-in border border-border overflow-hidden">
        <div className="flex-none px-6 py-4 border-b border-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Optionen</h2>
          <button type="button" onClick={onClose}
                  className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 shadow-card rounded-[18px]">
              <Glyph icon={initial?.icon} color={initial?.color} box={64} radius={18} glyph={30} />
            </div>
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <p className="text-sm font-semibold text-text">{initial?.name}</p>
              <p className="text-xs text-text-muted truncate">{initial?.url}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase mb-2">
              macOS-App <span className="normal-case font-medium text-text-light">(optional)</span>
            </p>
            <input className="input-base" placeholder="z.B. TaikoTasks — oeffnet installierte App statt Browser"
                   value={macApp} onChange={(e) => setMacApp(e.target.value)} />
          </div>

          <button type="button" onClick={() => save(true)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border
                             hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-sm text-slate-700 transition-colors">
            <EyeOff size={16} /> Vom Board entfernen
          </button>
        </div>

        <div className="flex-none px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <button type="button" onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300
                             rounded-[6px] hover:bg-slate-50 hover:text-slate-900 transition-colors">
            Abbrechen
          </button>
          <button type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover
                             rounded-[6px] transition-colors">
            Speichern
          </button>
        </div>
      </form>
    </div>
  )
}
