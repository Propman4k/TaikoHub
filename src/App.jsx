import { useEffect, useRef, useState, useCallback } from 'react'
import * as Lucide from 'lucide-react'
import { Plus, Pencil, Trash2, X, Grid2x2, LayoutGrid, ExternalLink,
         Settings, Check, Eye, EyeOff, LogOut, Share2, Loader2,
         SlidersHorizontal, ArrowLeft, Download, MonitorSmartphone } from 'lucide-react'

// ── Konstanten ────────────────────────────────────────────────────────────
const TILE = 84
const CELL = 112
const PAD = 24
const DRAG_THRESHOLD = 4

const COLORS = [
  '#1100ff', '#0ea5e9', '#0284c7', '#0d9488', '#059669', '#65a30d',
  '#ca8a04', '#ea580c', '#FA5D00', '#dc2626', '#e11d48', '#db2777',
  '#c026d3', '#9333ea', '#7c3aed', '#4f46e5', '#475569', '#1e293b',
]

const ICONS = Object.keys(Lucide)
  .filter((k) => /^[A-Z]/.test(k) && k !== 'Icon'
    && !k.endsWith('Icon') && !k.startsWith('Lucide')
    && typeof Lucide[k] === 'object')
  .sort()
const ICON_CAP = 180

const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'

const snapTo = (v) => Math.round((v - PAD) / CELL) * CELL + PAD

function Icon({ name, ...props }) {
  const C = Lucide[name] || Lucide.AppWindow
  return <C {...props} />
}

const isImageIcon = (icon) => typeof icon === 'string' && icon.startsWith('data:')

// Rendert entweder ein Bild-Icon (echtes App-Icon) oder ein lucide-Icon auf Farbflaeche.
function Glyph({ icon, color, box, radius, glyph }) {
  return (
    <div className="flex items-center justify-center overflow-hidden flex-shrink-0"
         style={{ width: box, height: box, borderRadius: radius,
                  backgroundColor: isImageIcon(icon) ? 'transparent' : color }}>
      {isImageIcon(icon)
        ? <img src={icon} alt="" className="w-full h-full object-cover" />
        : <Icon name={icon} size={glyph} strokeWidth={1.8} className="text-white" />}
    </div>
  )
}

// ── API ─────────────────────────────────────────────────────────────────────
const api = {
  me: () => fetch('/api/auth/me', { credentials: 'include' }),
  board: () => fetch('/api/board', { credentials: 'include' }).then((r) => r.json()),
  users: () => fetch('/api/users', { credentials: 'include' }).then((r) => r.json()),
  createTool: (d) => fetch('/api/tools', { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }),
  updateTool: (id, d) => fetch(`/api/tools/${id}`, { method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }),
  deleteTool: (id) => fetch(`/api/tools/${id}`, { method: 'DELETE', credentials: 'include' }),
  placement: (toolId, d) => fetch(`/api/placements/${toolId}`, { method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }),
}

// ── App-Icon-Kachel ───────────────────────────────────────────────────────
function AppTile({ app, snap, boardRef, onMoveLocal, onCommit, onOpen, onEdit }) {
  const drag = useRef(null)

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    const rect = boardRef.current.getBoundingClientRect()
    drag.current = { startX: e.clientX, startY: e.clientY,
      offX: e.clientX - rect.left - app.x, offY: e.clientY - rect.top - app.y, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return
    d.moved = true
    const rect = boardRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left - d.offX, rect.width - TILE))
    const y = Math.max(0, e.clientY - rect.top - d.offY)
    onMoveLocal(app.toolId, x, y)
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) { onOpen(app); return }
    const x = snap ? Math.max(0, snapTo(app.x)) : app.x
    const y = snap ? Math.max(0, snapTo(app.y)) : app.y
    onMoveLocal(app.toolId, x, y)
    onCommit(app.toolId, x, y)
  }

  return (
    <div className="group absolute flex flex-col items-center gap-1.5 select-none touch-none"
         style={{ left: app.x, top: app.y, width: TILE }}
         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div className="relative flex items-center justify-center rounded-[18px] cursor-pointer overflow-visible
                      shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform
                      group-hover:scale-105 group-active:scale-95"
           style={{ width: TILE, height: TILE, backgroundColor: isImageIcon(app.icon) ? 'transparent' : app.color }}>
        {isImageIcon(app.icon)
          ? <img src={app.icon} alt="" className="w-full h-full rounded-[18px] object-cover" />
          : <Icon name={app.icon} size={38} strokeWidth={1.8} className="text-white" />}
        <button onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEdit(app) }}
                className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center
                           w-6 h-6 rounded-full bg-white text-slate-600 shadow-elevated
                           border border-border hover:text-brand transition-colors"
                title={app.mine ? 'Bearbeiten' : 'Optionen'}>
          {app.mine ? <Pencil size={12} /> : <Settings size={12} />}
        </button>
        {!app.mine && (
          <span className="absolute -bottom-1 -left-1 flex items-center justify-center w-5 h-5 rounded-full
                           bg-white text-brand shadow-card border border-border" title={`Geteilt von ${app.ownerName}`}>
            <Share2 size={10} />
          </span>
        )}
      </div>
      <span className="text-[12px] font-medium text-text max-w-full truncate px-0.5" title={app.name}>
        {app.name}
      </span>
    </div>
  )
}

// ── Editor-Modal ────────────────────────────────────────────────────────────
function Editor({ initial, users, onSave, onDelete, onClose }) {
  const canEdit = !initial || initial.mine // neu oder eigenes -> Inhalt editierbar
  const [name, setName] = useState(initial?.name || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [color, setColor] = useState(initial?.color || COLORS[0])
  const [icon, setIcon] = useState(initial?.icon || 'AppWindow')
  const [macApp, setMacApp] = useState(initial?.macApp || '')
  const [hidden, setHidden] = useState(initial?.hidden || false)
  const [shareWith, setShareWith] = useState(initial?.sharedWith || [])
  const [iconQuery, setIconQuery] = useState('')

  const q = iconQuery.trim().toLowerCase()
  const matches = q ? ICONS.filter((n) => n.toLowerCase().includes(q)) : ICONS
  const shown = matches.slice(0, ICON_CAP)
  const toggleShare = (id) => setShareWith((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])

  const submit = (e) => {
    e.preventDefault()
    if (canEdit && (!name.trim() || !url.trim())) return
    onSave({ toolId: initial?.toolId, canEdit,
      tool: { name: name.trim(), url: url.trim(), color, icon, shareWith },
      placement: { macApp: macApp.trim(), hidden } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
         onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
            className="relative bg-surface rounded-2xl shadow-elevated w-full max-w-md flex flex-col
                       animate-modal-in border border-border overflow-hidden">
        <div className="flex-none px-6 py-4 border-b border-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {!initial ? 'Neues Tool' : initial.mine ? 'Tool bearbeiten' : 'Optionen'}
          </h2>
          <button type="button" onClick={onClose}
                  className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 shadow-card rounded-[18px]">
              <Glyph icon={icon} color={color} box={64} radius={18} glyph={30} />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {canEdit ? (
                <>
                  <input className="input-base" placeholder="Name" value={name}
                         onChange={(e) => setName(e.target.value)} autoFocus />
                  <input className="input-base" placeholder="https://..." value={url}
                         onChange={(e) => setUrl(e.target.value)} />
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-text">{name}</p>
                  <p className="text-xs text-text-muted truncate">{url}</p>
                  <p className="text-[11px] text-text-light">Geteilt von {initial.ownerName}</p>
                </>
              )}
            </div>
          </div>

          {/* macOS-App (pro Person) */}
          <div>
            <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase mb-2">
              macOS-App <span className="normal-case font-medium text-text-light">(optional)</span>
            </p>
            <input className="input-base" placeholder="z.B. TaikoTasks — oeffnet installierte PWA statt Browser"
                   value={macApp} onChange={(e) => setMacApp(e.target.value)} />
          </div>

          {/* Nur eigene: Farbe, Icon, Teilen */}
          {canEdit && (
            <>
              <div>
                <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase mb-2">Farbe</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                            className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                              color === c ? 'ring-2 ring-offset-2 ring-brand' : ''}`}
                            style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase">Icon</p>
                  <span className="text-[11px] text-text-light">{matches.length} verfuegbar</span>
                </div>
                <input className="input-base mb-2" placeholder="Icon suchen (z.B. mail, chart, cloud)..."
                       value={iconQuery} onChange={(e) => setIconQuery(e.target.value)} />
                <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
                  {shown.map((n) => (
                    <button key={n} type="button" onClick={() => setIcon(n)} title={n}
                            className={`flex items-center justify-center aspect-square rounded-md transition-colors ${
                              icon === n ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                      <Icon name={n} size={18} />
                    </button>
                  ))}
                </div>
                {matches.length > ICON_CAP && (
                  <p className="text-[11px] text-text-light mt-2">{matches.length - ICON_CAP} weitere — Suche eingrenzen.</p>
                )}
              </div>

              {users.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-text-muted tracking-wide uppercase mb-2">Teilen mit</p>
                  <div className="flex flex-col gap-1.5">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border
                                                    hover:bg-slate-50 cursor-pointer text-sm">
                        <input type="checkbox" checked={shareWith.includes(u.id)} onChange={() => toggleShare(u.id)}
                               className="h-[18px] w-[18px] rounded-[4px] accent-sky-500 cursor-pointer" />
                        {u.name} <span className="text-text-light text-xs">{u.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Nur geteilte: Ausblenden-Toggle */}
          {!canEdit && (
            <button type="button" onClick={() => setHidden((h) => !h)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border
                               hover:bg-slate-50 text-sm text-slate-700 transition-colors">
              {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
              {hidden ? 'Wieder einblenden' : 'Ausblenden'}
            </button>
          )}
        </div>

        <div className="flex-none px-6 py-4 border-t border-border flex items-center justify-between gap-2">
          {initial?.mine ? (
            <button type="button" onClick={onDelete}
                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700
                               rounded-md flex items-center gap-1.5">
              <Trash2 size={14} /> Loeschen
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300
                               rounded-[6px] hover:bg-slate-50 hover:text-slate-900 transition-colors">
              Abbrechen
            </button>
            <button type="submit" disabled={canEdit && (!name.trim() || !url.trim())}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover
                               disabled:bg-brand/50 disabled:cursor-not-allowed rounded-[6px] transition-colors">
              Speichern
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────
function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand text-white shadow-elevated">
        <LayoutGrid size={30} />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">TaikoHub</h1>
        <p className="text-sm text-text-muted mt-1">Deine Tools an einem Ort.</p>
      </div>
      <a href="/api/auth/login"
         className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-[6px]
                    text-sm font-semibold hover:bg-brand-hover transition-colors">
        Mit Google anmelden
      </a>
    </div>
  )
}

// ── App / Board ─────────────────────────────────────────────────────────────
export default function App() {
  const [me, setMe] = useState(undefined) // undefined=laedt, null=aus, obj=an
  const [loaded, setLoaded] = useState(false) // Board schon einmal geladen?
  const [apps, setApps] = useState([])
  const [users, setUsers] = useState([])
  const [snap, setSnap] = useState(() => localStorage.getItem('taikohub.snap') === '1')
  const [editor, setEditor] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [view, setView] = useState('board') // 'board' | 'settings'
  const boardRef = useRef(null)

  const reload = useCallback(async () => {
    const [board, us] = await Promise.all([api.board(), api.users()])
    setApps(board)
    setUsers(us.filter((u) => u.id !== me?.id))
    setLoaded(true)
  }, [me?.id])

  useEffect(() => {
    api.me().then((r) => r.ok ? r.json() : null).then(setMe).catch(() => setMe(null))
  }, [])
  useEffect(() => { if (me) reload() }, [me, reload])
  useEffect(() => localStorage.setItem('taikohub.snap', snap ? '1' : '0'), [snap])

  const visible = apps.filter((a) => !a.hidden)
  const hiddenApps = apps.filter((a) => a.hidden)

  const moveLocal = (toolId, x, y) =>
    setApps((cur) => cur.map((a) => (a.toolId === toolId ? { ...a, x, y } : a)))
  const commitPos = (toolId, x, y) => api.placement(toolId, { x, y })

  const openInWindow = (app) => {
    const w = Math.min(1400, screen.availWidth - 80), h = Math.min(900, screen.availHeight - 80)
    const left = screen.availLeft + (screen.availWidth - w) / 2, top = screen.availTop + (screen.availHeight - h) / 2
    window.open(app.url, `taikohub_${app.toolId}`,
      `popup=yes,noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`)
  }

  // Mit macApp: ueber das taikohub://-Schema die installierte App oeffnen. Das ist
  // eine System-Weiterleitung (kein fetch) und funktioniert daher auch in Safari.
  // Ist der Opener installiert, faengt macOS die URL ab und die Seite bleibt stehen.
  const openApp = (app) => {
    if (app.macApp) { window.location.href = `taikohub://open?name=${encodeURIComponent(app.macApp)}`; return }
    openInWindow(app)
  }

  const saveEditor = async ({ toolId, canEdit, tool, placement }) => {
    if (!toolId) {
      const n = visible.length
      const cols = Math.max(1, Math.floor(((boardRef.current?.clientWidth || 800) - PAD) / CELL))
      const x = PAD + (n % cols) * CELL, y = PAD + Math.floor(n / cols) * CELL
      await api.createTool({ ...tool, macApp: placement.macApp, x, y })
    } else if (canEdit) {
      await api.updateTool(toolId, tool)
      await api.placement(toolId, { macApp: placement.macApp })
    } else {
      await api.placement(toolId, { macApp: placement.macApp, hidden: placement.hidden })
    }
    setEditor(null)
    reload()
  }

  const deleteApp = async () => { await api.deleteTool(editor.toolId); setEditor(null); reload() }

  const arrange = () => {
    const cols = Math.max(1, Math.floor(((boardRef.current?.clientWidth || 800) - PAD) / CELL))
    const sorted = [...visible].sort((a, b) => (a.y - b.y) || (a.x - b.x))
    sorted.forEach((a, i) => {
      const x = PAD + (i % cols) * CELL, y = PAD + Math.floor(i / cols) * CELL
      moveLocal(a.toolId, x, y); api.placement(a.toolId, { x, y })
    })
  }

  const unhide = (toolId) => {
    moveLocal(toolId, PAD, PAD)
    setApps((cur) => cur.map((a) => (a.toolId === toolId ? { ...a, hidden: false } : a)))
    api.placement(toolId, { hidden: false })
  }

  const logout = () => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => setMe(null))
  const menuAction = (fn) => () => { setMenuOpen(false); fn() }

  if (me === undefined)
    return <div className="min-h-screen flex items-center justify-center text-text-light"><Loader2 className="animate-spin" /></div>
  if (me === null) return <LoginPage />
  if (view === 'settings') return <SettingsPage me={me} onBack={() => setView('board')} />

  return (
    <div className="min-h-screen">
      <main ref={boardRef} className="relative min-h-screen"
            style={{ padding: PAD,
                     backgroundImage: snap ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)' : 'none',
                     backgroundSize: snap ? `${CELL}px ${CELL}px` : undefined,
                     backgroundPosition: snap ? `${PAD}px ${PAD}px` : undefined }}>
        {loaded && visible.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 text-slate-400">
              <ExternalLink size={28} />
            </div>
            <p className="text-lg font-semibold text-slate-700">Noch keine Apps</p>
            <p className="text-sm text-text-muted max-w-sm">
              Ueber das <span className="font-semibold text-brand">Zahnrad</span> unten rechts legst du dein erstes Tool an.
            </p>
          </div>
        )}
        {visible.map((app) => (
          <AppTile key={app.toolId} app={app} snap={snap} boardRef={boardRef}
                   onMoveLocal={moveLocal} onCommit={commitPos} onOpen={openApp} onEdit={setEditor} />
        ))}
      </main>

      <span className="fixed bottom-4 left-5 z-30 text-sm font-semibold text-text-light select-none pointer-events-none">
        TaikoHub
      </span>

      <div className="fixed bottom-4 right-5 z-40">
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-12 right-0 z-50 w-56 bg-white border border-border
                            rounded-lg shadow-elevated p-1.5 animate-modal-in">
              <div className="px-3 py-2 flex items-center gap-2 border-b border-border mb-1">
                {me.picture && <img src={me.picture} alt="" className="w-6 h-6 rounded-full" />}
                <span className="text-xs text-text-muted truncate">{me.name}</span>
              </div>
              {me.isAdmin && (
                <MenuItem icon={Plus} onClick={menuAction(() => setEditor({}))}>Neues Tool</MenuItem>
              )}
              <MenuItem icon={Grid2x2} onClick={() => setSnap((s) => !s)}>
                Am Raster ausrichten {snap && <Check size={15} className="ml-auto text-brand" />}
              </MenuItem>
              <MenuItem icon={LayoutGrid} onClick={menuAction(arrange)}>Anordnen</MenuItem>
              {hiddenApps.length > 0 && (
                <MenuItem icon={EyeOff} onClick={() => setShowHidden(true)}>
                  Ausgeblendet <span className="ml-auto text-text-light">{hiddenApps.length}</span>
                </MenuItem>
              )}
              <MenuItem icon={SlidersHorizontal} onClick={menuAction(() => setView('settings'))}>Einstellungen</MenuItem>
              <MenuItem icon={LogOut} onClick={menuAction(logout)}>Abmelden</MenuItem>
              <p className="px-3 pt-2 pb-1 text-[10px] text-text-light border-t border-border mt-1">
                Build: {BUILD_TIME}
              </p>
            </div>
          </>
        )}
        <button onClick={() => setMenuOpen((o) => !o)} title="Optionen"
                className={`relative z-50 flex items-center justify-center w-11 h-11 rounded-full shadow-elevated
                            border transition-colors ${
                  menuOpen ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-border hover:text-brand'}`}>
          <Settings size={20} />
        </button>
      </div>

      {editor && (
        <Editor initial={editor.toolId ? editor : null} users={users}
                onSave={saveEditor} onDelete={deleteApp} onClose={() => setEditor(null)} />
      )}

      {showHidden && (
        <HiddenList apps={hiddenApps} onShow={unhide} onClose={() => setShowHidden(false)} />
      )}
    </div>
  )
}

// Eigenstaendige Einstellungsseite (erweiterbar um weitere Sektionen).
function SettingsPage({ me, onBack }) {
  const [test, setTest] = useState('idle') // idle | testing | ok | fail
  // Schema-Test: Handler oeffnet kurz den Finder -> Fenster verliert Fokus = erkannt.
  const runTest = useCallback(() => {
    setTest('testing')
    let seen = false
    const cancel = () => { seen = true }
    window.addEventListener('blur', cancel, { once: true })
    document.addEventListener('visibilitychange', cancel, { once: true })
    // Transientes Fenster (kein Wegnavigieren der Seite); macOS faengt das Schema ab.
    const w = window.open('taikohub://open?name=Finder', '_blank')
    setTimeout(() => {
      try { w && w.close() } catch { /* egal */ }
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
      setTest(seen ? 'ok' : 'fail')
    }, 1500)
  }, [])

  return (
    <div className="min-h-screen bg-surface-raised">
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-[820px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={onBack}
                  className="p-2 -ml-2 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-md transition-colors"
                  title="Zurueck">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        </div>
      </header>

      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Sektion: TaikoHub Opener */}
        <section className="bg-surface rounded-[10px] shadow-card border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10 text-brand">
              <MonitorSmartphone size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold leading-tight">TaikoHub Opener</h2>
              <p className="text-sm text-text-muted">Oeffnet Tools als installierte App statt im Browser.</p>
            </div>
            {test === 'testing'
              ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-3 py-1">
                  <Loader2 size={13} className="animate-spin" /> Teste
                </span>
              : test === 'ok'
                ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-3 py-1">
                    <Check size={13} /> Aktiv
                  </span>
                : test === 'fail'
                  ? <span className="text-xs font-semibold text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-3 py-1">Nicht erkannt</span>
                  : <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-3 py-1">Opener</span>}
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Einmal installieren, dann oeffnen die Kacheln die als App installierten Tools direkt
              (z.B. TaikoTasks als eigene App). Ohne den Opener oeffnen sie sich in einem Browser-Fenster.
            </p>

            <div className="flex items-center gap-2">
              <a href="/TaikoHub-Opener.zip" download
                 className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-[6px]
                            text-sm font-semibold hover:bg-brand-hover transition-colors">
                <Download size={18} /> Opener herunterladen
              </a>
              <button onClick={runTest}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-semibold
                                 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">
                Verbindung testen
              </button>
            </div>

            <ol className="text-sm text-text-muted list-decimal list-inside space-y-1.5">
              <li>Datei herunterladen und im Downloads-Ordner <span className="font-medium text-text">doppelklicken</span> (entpackt <span className="font-medium text-text">TaikoHub Opener</span>).</li>
              <li>Auf <span className="font-medium text-text">TaikoHub Opener</span> rechtsklicken &rarr; <span className="font-medium text-text">Oeffnen</span> &rarr; im Dialog nochmal <span className="font-medium text-text">Oeffnen</span> (einmalige Bestaetigung).</li>
              <li>Zurueck hier auf <span className="font-medium text-text">Verbindung testen</span> &mdash; wird's gruen, ist alles bereit.</li>
            </ol>

            <p className="text-[12px] text-text-light">
              Der Opener ist ein kleines Programm, das nur lokal die installierte App startet &mdash;
              es laeuft im Hintergrund, kein Fenster. Voraussetzung: die jeweilige App ist auf dem Mac installiert.
            </p>
          </div>
        </section>

        {me.isAdmin && <AdminTools />}
      </div>
    </div>
  )
}

// Admin-Sektion: zentraler Tool-Katalog (anlegen, bearbeiten, pro Nutzer freigeben).
function AdminTools() {
  const [tools, setTools] = useState(null)
  const [users, setUsers] = useState([])
  const [editor, setEditor] = useState(null)

  const reload = useCallback(async () => {
    const [board, us, meRes] = await Promise.all([api.board(), api.users(), api.me().then((r) => r.json())])
    setTools(board)
    setUsers(us.filter((u) => u.id !== meRes.id))
  }, [])
  useEffect(() => { reload() }, [reload])

  const save = async ({ toolId, tool, placement }) => {
    if (!toolId) await api.createTool({ ...tool, macApp: placement.macApp })
    else { await api.updateTool(toolId, tool); await api.placement(toolId, { macApp: placement.macApp }) }
    setEditor(null); reload()
  }
  const del = async () => { await api.deleteTool(editor.toolId); setEditor(null); reload() }

  return (
    <section className="bg-surface rounded-[10px] shadow-card border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold leading-tight">Tools verwalten</h2>
          <p className="text-sm text-text-muted">Zentral anlegen und pro Person freigeben.</p>
        </div>
        <button onClick={() => setEditor({})}
                className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-[6px]
                           text-sm font-semibold hover:bg-brand-hover transition-colors">
          <Plus size={16} strokeWidth={2.5} /> Neu
        </button>
      </div>

      <div className="px-3 py-3 flex flex-col gap-1">
        {tools === null && (
          <div className="flex items-center justify-center py-8 text-text-light"><Loader2 className="animate-spin" /></div>
        )}
        {tools?.length === 0 && (
          <p className="text-sm text-text-muted px-3 py-6 text-center">Noch keine Tools. Lege mit „Neu" das erste an.</p>
        )}
        {tools?.map((t) => (
          <button key={t.toolId} onClick={() => setEditor(t)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 text-left transition-colors">
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

      {editor && (
        <Editor initial={editor.toolId ? editor : null} users={users}
                onSave={save} onDelete={del} onClose={() => setEditor(null)} />
      )}
    </section>
  )
}

function MenuItem({ icon: I, onClick, children }) {
  return (
    <button onClick={onClick}
            className="w-full text-left px-3 py-2.5 text-sm rounded-md flex items-center gap-2.5
                       text-slate-700 hover:bg-slate-50 hover:text-brand transition-colors">
      <I size={16} /> {children}
    </button>
  )
}

function HiddenList({ apps, onShow, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-surface rounded-2xl shadow-elevated w-full max-w-md border border-border animate-modal-in overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ausgeblendete Apps</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-md">
            <X size={16} />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
          {apps.map((a) => (
            <div key={a.toolId} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50">
              <Glyph icon={a.icon} color={a.color} box={36} radius={8} glyph={18} />
              <span className="flex-1 text-sm truncate">{a.name}</span>
              <button onClick={() => onShow(a.toolId)}
                      className="px-3 py-1.5 text-xs font-semibold text-brand bg-brand/5 hover:bg-brand/10 rounded-md
                                 flex items-center gap-1.5">
                <Eye size={14} /> Einblenden
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
