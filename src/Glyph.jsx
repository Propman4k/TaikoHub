// Icon-Rendering: lucide-Lookup, Bild-Icons (Data-URI) auf Farbflaeche.
import * as Lucide from 'lucide-react'
import { isImageIcon } from './icons.js'

export function Icon({ name, ...props }) {
  const C = Lucide[name] || Lucide.AppWindow
  return <C {...props} />
}

// Rendert entweder ein Bild-Icon (echtes App-Icon) oder ein lucide-Icon auf Farbflaeche.
export function Glyph({ icon, color, box, radius, glyph }) {
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
