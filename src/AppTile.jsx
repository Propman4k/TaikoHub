// App-Icon-Kachel: Drag mit Pointer-Capture, Klick = oeffnen, Zahnrad = Optionen.
import { useRef } from 'react'
import { Settings } from 'lucide-react'
import { TILE, DRAG_THRESHOLD } from './grid.js'
import { Icon } from './Glyph.jsx'
import { isImageIcon } from './icons.js'

export function AppTile({ app, boardRef, onMoveLocal, onDrop, onOpen, onEdit }) {
  const drag = useRef(null)

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    const rect = boardRef.current.getBoundingClientRect()
    drag.current = { startX: e.clientX, startY: e.clientY, origX: app.x, origY: app.y,
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
    onDrop(app.toolId, app.x, app.y, d.origX, d.origY) // Zielposition + Startposition -> Swap in App
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
                title="Optionen">
          <Settings size={12} />
        </button>
      </div>
      <span className="text-[12px] font-medium text-text max-w-full truncate px-0.5" title={app.name}>
        {app.name}
      </span>
    </div>
  )
}
