// Mitarbeiter: anlegen, loeschen, App-Zugriffe verwalten (Admin).
import { useCallback, useEffect, useState } from 'react'
import { Users, UserPlus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import { api } from './api.js'
import { Glyph } from './Glyph.jsx'

export function StaffAdmin({ meId }) {
  const [users, setUsers] = useState(null)
  const [tools, setTools] = useState([])
  const [editing, setEditing] = useState(null) // null | user
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const [us, all] = await Promise.all([api.users(), api.allTools()])
    setUsers(us); setTools(all)
  }, [])
  useEffect(() => { reload() }, [reload])

  const add = async () => {
    const e = email.trim()
    if (!e) return
    setBusy(true)
    const r = await api.createUser(e)
    setBusy(false)
    if (r.ok) { setEmail(''); reload() } else alert('Email nicht erlaubt (nur @taikonauten.com).')
  }
  const remove = async (u) => {
    if (!confirm(`${u.name} wirklich entfernen? Freigaben und Board-Anordnung gehen verloren.`)) return
    const r = await api.deleteUser(u.id)
    if (!r.ok) alert('Nicht entfernbar — dieser Account hat selbst Apps angelegt.')
    reload()
  }

  if (editing) return <StaffAccess user={editing} tools={tools} onBack={() => { setEditing(null); reload() }} />

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">Mitarbeiter</h2>
        <p className="text-sm text-text-muted">Wer Zugriff bekommt und welche Apps sie hinzufuegen duerfen.
          Den Login selbst regelt die Allowlist (@taikonauten.com) — Entfernen loescht nur Freigaben und Board.</p>
      </div>

      <div className="bg-surface rounded-[10px] shadow-card border border-border p-3 flex items-center gap-2 mb-4">
        <input className="input-base flex-1" placeholder="email@taikonauten.com" value={email}
               onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} disabled={busy || !email.trim()}
                className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-[6px] text-sm font-semibold hover:bg-brand-hover disabled:bg-brand/50 transition-colors">
          <UserPlus size={16} /> Hinzufuegen
        </button>
      </div>

      <div className="bg-surface rounded-[10px] shadow-card border border-border p-2 flex flex-col gap-1">
        {users === null && <div className="flex items-center justify-center py-8 text-text-light"><Loader2 className="animate-spin" /></div>}
        {users?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
              <Users size={16} />
            </div>
            <button onClick={() => setEditing(u)} className="flex-1 min-w-0 text-left">
              <span className="block text-sm font-medium truncate">{u.name}{u.id === meId && ' (du)'}</span>
              <span className="block text-[11px] text-text-light truncate">{u.email}</span>
            </button>
            <button onClick={() => setEditing(u)}
                    className="px-3 py-1.5 text-xs font-semibold text-brand bg-brand/5 hover:bg-brand/10 rounded-md">
              Zugriffe
            </button>
            {u.id !== meId && (
              <button onClick={() => remove(u)} title="Entfernen"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Zugriffe eines Mitarbeiters: welche Apps darf er selbst hinzufuegen.
function StaffAccess({ user, tools, onBack }) {
  const [sel, setSel] = useState(null)
  useEffect(() => { api.userAccess(user.id).then((ids) => setSel(ids.map(String))) }, [user.id])
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const save = async () => { await api.setUserAccess(user.id, sel); onBack() }

  return (
    <div className="bg-surface rounded-[10px] shadow-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 -ml-1.5 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-md">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{user.name}</h2>
          <p className="text-[11px] text-text-light">{user.email}</p>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase mb-2">Freigegebene Apps</p>
        {sel === null
          ? <div className="flex items-center justify-center py-6 text-text-light"><Loader2 className="animate-spin" /></div>
          : tools.length === 0
            ? <p className="text-sm text-text-muted py-4">Noch keine Apps angelegt.</p>
            : (
              <div className="flex flex-col gap-1.5">
                {tools.map((t) => (
                  <label key={t.toolId} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={sel.includes(t.toolId)} onChange={() => toggle(t.toolId)}
                           className="h-[18px] w-[18px] rounded-[4px] accent-sky-500 cursor-pointer" />
                    <Glyph icon={t.icon} color={t.color} box={32} radius={7} glyph={16} />
                    <span className="text-sm truncate">{t.name}</span>
                  </label>
                ))}
              </div>
            )}
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end">
        <button onClick={save} disabled={sel === null}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:bg-brand/50 rounded-[6px] transition-colors">
          Speichern
        </button>
      </div>
    </div>
  )
}
