// App-Shell: Auth-Gate, Board (Drag+Drop mit Grid-Swap), FAB-Menue, Modals.
import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, LayoutGrid, ExternalLink, Settings, LogOut, Loader2, SlidersHorizontal } from 'lucide-react'
import { api } from './api.js'
import { PAD, cellOf, cellPos, gridCols, cellXY } from './grid.js'
import { AppTile } from './AppTile.jsx'
import { Editor } from './Editor.jsx'
import { AddToolPicker } from './AddToolPicker.jsx'
import { SettingsPage } from './Settings.jsx'

const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'

export default function App() {
  const [me, setMe] = useState(undefined) // undefined=laedt, null=aus, obj=an
  const [loaded, setLoaded] = useState(false) // Board schon einmal geladen?
  const [apps, setApps] = useState([])
  const [editor, setEditor] = useState(null) // Board-Optionen einer Kachel
  const [addPicker, setAddPicker] = useState(false)
  const [view, setView] = useState('board') // 'board' | 'settings'
  const boardRef = useRef(null)

  const reload = useCallback(async () => {
    setApps(await api.board())
    setLoaded(true)
  }, [])

  useEffect(() => {
    api.me().then((r) => r.ok ? r.json() : null).then(setMe).catch(() => setMe(null))
  }, [])
  useEffect(() => { if (me) reload() }, [me, reload])

  const moveLocal = (toolId, x, y) =>
    setApps((cur) => cur.map((a) => (a.toolId === toolId ? { ...a, x, y } : a)))

  // Drop: an Rasterzelle einrasten; ist die Zelle belegt, rueckt der Bewohner auf
  // die freigewordene Startzelle (Swap) -> keine Ueberlappung.
  const dropTile = (toolId, x, y, origX, origY) => {
    const col = cellOf(x), row = cellOf(y)
    const tx = cellPos(col), ty = cellPos(row)
    const occupant = apps.find((a) => a.toolId !== toolId && cellOf(a.x) === col && cellOf(a.y) === row)
    moveLocal(toolId, tx, ty); api.placement(toolId, { x: tx, y: ty })
    if (occupant) {
      const ox = cellPos(cellOf(origX)), oy = cellPos(cellOf(origY))
      moveLocal(occupant.toolId, ox, oy); api.placement(occupant.toolId, { x: ox, y: oy })
    }
  }

  const openInWindow = (app) => {
    const w = Math.min(1400, screen.availWidth - 80), h = Math.min(900, screen.availHeight - 80)
    const left = screen.availLeft + (screen.availWidth - w) / 2, top = screen.availTop + (screen.availHeight - h) / 2
    window.open(app.url, `taikohub_${app.toolId}`,
      `popup=yes,noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`)
  }

  // Mit macApp: ueber das taikohub://-Schema die installierte App oeffnen. Das ist
  // eine System-Weiterleitung (kein fetch) und funktioniert daher auch in Safari.
  const openApp = (app) => {
    if (app.macApp) { window.location.href = `taikohub://open?name=${encodeURIComponent(app.macApp)}`; return }
    openInWindow(app)
  }

  // Board-Optionen einer Kachel speichern (macApp / vom Board entfernen).
  const saveEditor = async ({ toolId, placement }) => {
    await api.placement(toolId, { macApp: placement.macApp, hidden: placement.hidden })
    setEditor(null)
    reload()
  }

  // Ausgewaehlte verfuegbare Tools aufs Board holen (naechste freie Rasterzellen).
  const addTools = async (ids) => {
    const cols = gridCols(boardRef.current?.clientWidth || 800)
    let n = apps.length
    for (const id of ids) {
      const { x, y } = cellXY(n, cols)
      await api.placement(id, { hidden: false, x, y })
      n++
    }
    setAddPicker(false)
    reload()
  }

  const arrange = () => {
    const cols = gridCols(boardRef.current?.clientWidth || 800)
    const sorted = [...apps].sort((a, b) => (a.y - b.y) || (a.x - b.x))
    sorted.forEach((a, i) => {
      const { x, y } = cellXY(i, cols)
      moveLocal(a.toolId, x, y); api.placement(a.toolId, { x, y })
    })
  }

  const logout = () => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => setMe(null))

  if (me === undefined)
    return <div className="min-h-screen flex items-center justify-center text-text-light"><Loader2 className="animate-spin" /></div>
  if (me === null) return <LoginPage />
  if (view === 'settings') return <SettingsPage me={me} onBack={() => setView('board')} />

  return (
    <div className="min-h-screen">
      <main ref={boardRef} className="relative min-h-screen" style={{ padding: PAD }}>
        {loaded && apps.length === 0 && <EmptyBoard />}
        {apps.map((app) => (
          <AppTile key={app.toolId} app={app} boardRef={boardRef}
                   onMoveLocal={moveLocal} onDrop={dropTile} onOpen={openApp} onEdit={setEditor} />
        ))}
      </main>

      <span className="fixed bottom-4 left-5 z-30 text-sm font-semibold text-text-light select-none pointer-events-none">
        TaikoHub
      </span>

      <BoardMenu me={me} onAdd={() => setAddPicker(true)} onArrange={arrange}
                 onSettings={() => setView('settings')} onLogout={logout} />

      {editor && (
        <Editor initial={editor} onSave={saveEditor} onClose={() => setEditor(null)} />
      )}

      {addPicker && (
        <AddToolPicker onAdd={addTools} onClose={() => setAddPicker(false)} />
      )}
    </div>
  )
}

function EmptyBoard() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 text-slate-400">
        <ExternalLink size={28} />
      </div>
      <p className="text-lg font-semibold text-slate-700">Noch keine Apps</p>
      <p className="text-sm text-text-muted max-w-sm">
        Ueber das <span className="font-semibold text-brand">Zahnrad</span> unten rechts &rarr;
        <span className="font-semibold text-brand"> Tool hinzufuegen</span> holst du dir verfuegbare Tools aufs Board.
      </p>
    </div>
  )
}

// FAB unten rechts mit Aktions-Menue.
function BoardMenu({ me, onAdd, onArrange, onSettings, onLogout }) {
  const [open, setOpen] = useState(false)
  const action = (fn) => () => { setOpen(false); fn() }

  return (
    <div className="fixed bottom-4 right-5 z-40">
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-12 right-0 z-50 w-56 bg-white border border-border
                          rounded-lg shadow-elevated p-1.5 animate-modal-in">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-border mb-1">
              {me.picture && <img src={me.picture} alt="" className="w-6 h-6 rounded-full" />}
              <span className="text-xs text-text-muted truncate">{me.name}</span>
            </div>
            <MenuItem icon={Plus} onClick={action(onAdd)}>Tool hinzufuegen</MenuItem>
            <MenuItem icon={LayoutGrid} onClick={action(onArrange)}>Anordnen</MenuItem>
            <MenuItem icon={SlidersHorizontal} onClick={action(onSettings)}>Einstellungen</MenuItem>
            <MenuItem icon={LogOut} onClick={action(onLogout)}>Abmelden</MenuItem>
            <p className="px-3 pt-2 pb-1 text-[10px] text-text-light border-t border-border mt-1">
              Build: {BUILD_TIME}
            </p>
          </div>
        </>
      )}
      <button onClick={() => setOpen((o) => !o)} title="Optionen"
              className={`relative z-50 flex items-center justify-center w-11 h-11 rounded-full shadow-elevated
                          border transition-colors ${
                open ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-border hover:text-brand'}`}>
        <Settings size={20} />
      </button>
    </div>
  )
}

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

function MenuItem({ icon: I, onClick, children }) {
  return (
    <button onClick={onClick}
            className="w-full text-left px-3 py-2.5 text-sm rounded-md flex items-center gap-2.5
                       text-slate-700 hover:bg-slate-50 hover:text-brand transition-colors">
      <I size={16} /> {children}
    </button>
  )
}
