// Apps: zentraler Tool-Katalog (Admin). Liste + Inline-Formular (kein Overlay).
import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Share2, ArrowLeft, Loader2 } from 'lucide-react'
import { api } from './api.js'
import { COLORS, ICON_CAP, searchIcons } from './icons.js'
import { Icon, Glyph } from './Glyph.jsx'

export function AppsAdmin({ meId }) {
  const [tools, setTools] = useState(null)
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null) // null=Liste, {}=neu, tool=bearbeiten

  const reload = useCallback(async () => {
    const [all, us] = await Promise.all([api.allTools(), api.users()])
    setTools(all); setUsers(us.filter((u) => u.id !== meId))
  }, [meId])
  useEffect(() => { reload() }, [reload])

  const save = async ({ toolId, tool }) => {
    if (toolId) await api.updateTool(toolId, tool); else await api.createTool(tool)
    setEditing(null); reload()
  }
  const del = async (id) => {
    if (!confirm('App fuer alle loeschen? Freigaben und Board-Platzierungen aller Nutzer gehen verloren.')) return
    await api.deleteTool(id); setEditing(null); reload()
  }

  if (editing !== null)
    return <AppForm initial={editing.toolId ? editing : null} users={users}
                    onSave={save} onDelete={del} onCancel={() => setEditing(null)} />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Apps</h2>
          <p className="text-sm text-text-muted">Zentral anlegen und pro Mitarbeiter freigeben.</p>
        </div>
        <button onClick={() => setEditing({})}
                className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-[6px] text-sm font-semibold hover:bg-brand-hover transition-colors">
          <Plus size={16} strokeWidth={2.5} /> Neu
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {tools === null && <div className="flex items-center justify-center py-8 text-text-light"><Loader2 className="animate-spin" /></div>}
        {tools?.length === 0 && <p className="text-sm text-text-muted py-6 text-center">Noch keine Apps. Lege mit „Neu" die erste an.</p>}
        {tools?.map((t) => (
          <button key={t.toolId} onClick={() => setEditing(t)}
                  className="bg-surface rounded-[10px] shadow-card border border-border flex items-center gap-3 px-4 py-3
                             hover:bg-slate-50 text-left transition-colors">
            <Glyph icon={t.icon} color={t.color} box={40} radius={9} glyph={20} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">{t.name}</span>
              <span className="block text-[11px] text-text-light truncate">{t.url}</span>
            </span>
            <span className="text-[11px] font-semibold text-text-muted bg-slate-100 rounded-full px-2.5 py-1 flex items-center gap-1">
              <Share2 size={11} /> {t.sharedWith?.length || 0}
            </span>
            <Pencil size={14} className="text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  )
}

// Icon-Auswahl: Suche (mit Synonymen) + Grid. Eigene Komponente haelt AppForm flach.
function IconPicker({ icon, onPick }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = searchIcons(query)
  const shown = matches.slice(0, ICON_CAP)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase">Icon</p>
        <span className="text-[11px] text-text-light">{q ? `${matches.length} Treffer` : 'Auswahl'}</span>
      </div>
      <input className="input-base mb-3 max-w-md" placeholder="Icon suchen (z.B. mail, chart, essen)..."
             value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="flex flex-wrap gap-1.5">
        {shown.map((n) => (
          <button key={n} type="button" onClick={() => onPick(n)} title={n}
                  className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
                    icon === n ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Icon name={n} size={18} />
          </button>
        ))}
      </div>
      {q && matches.length === 0 && (
        <p className="text-[11px] text-text-light mt-2">Nichts gefunden — versuch's englisch (mail, chart, cart).</p>
      )}
    </div>
  )
}

// "Verfuegbar fuer": Mitarbeiter-Checkboxen (haelt AppForm flach).
function ShareList({ users, shareWith, onToggle }) {
  if (!users.length) return null
  return (
    <div>
      <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase mb-1">Verfuegbar fuer</p>
      <p className="text-[11px] text-text-light mb-2">Wer diese App selbst hinzufuegen darf.</p>
      <div className="flex flex-col max-w-xl">
        {users.map((u) => (
          <label key={u.id} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-slate-50 cursor-pointer text-sm">
            <input type="checkbox" checked={shareWith.includes(u.id)} onChange={() => onToggle(u.id)}
                   className="h-[18px] w-[18px] rounded-[4px] accent-sky-500 cursor-pointer" />
            {u.name} <span className="text-text-light text-xs">{u.email}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// Inline-Formular fuer eine App (Inhalt + Verfuegbarkeit).
export function AppForm({ initial, users, onSave, onDelete, onCancel }) {
  const init = initial || {}
  const [name, setName] = useState(init.name || '')
  const [url, setUrl] = useState(init.url || '')
  const [color, setColor] = useState(init.color || COLORS[0])
  const [icon, setIcon] = useState(init.icon || 'AppWindow')
  const [shareWith, setShareWith] = useState(init.sharedWith || [])

  const toggleShare = (id) => setShareWith((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const canSave = name.trim() && url.trim()

  return (
    <div>
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <button onClick={onCancel} className="p-1.5 -ml-1.5 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-md">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold">{initial ? 'App bearbeiten' : 'Neue App'}</h2>
      </div>

      <div className="py-6 border-b border-border flex items-center gap-4">
        <div className="flex-shrink-0 shadow-card rounded-[18px]">
          <Glyph icon={icon} color={color} box={64} radius={18} glyph={30} />
        </div>
        <div className="flex-1 max-w-xl flex flex-col gap-2">
          <input className="input-base" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className="input-base" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      </div>

      <div className="py-6 border-b border-border">
        <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase mb-2">Farbe</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-brand' : ''}`}
                    style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <div className="py-6 border-b border-border">
        <IconPicker icon={icon} onPick={setIcon} />
      </div>

      {users.length > 0 && (
        <div className="py-6 border-b border-border">
          <ShareList users={users} shareWith={shareWith} onToggle={toggleShare} />
        </div>
      )}

      <div className="py-5 flex items-center justify-between gap-2">
        {initial
          ? <button onClick={() => onDelete(initial.toolId)}
                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-1.5">
              <Trash2 size={14} /> Loeschen
            </button>
          : <span />}
        <div className="flex gap-2">
          <button onClick={onCancel}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-[6px] hover:bg-slate-50 transition-colors">
            Abbrechen
          </button>
          <button onClick={() => canSave && onSave({ toolId: init.toolId, tool: { name: name.trim(), url: url.trim(), color, icon, shareWith } })}
                  disabled={!canSave}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed rounded-[6px] transition-colors">
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
