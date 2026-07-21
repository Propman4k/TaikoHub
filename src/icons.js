// Icon-Katalog (reine Daten + Suche): Farb-Palette, kuratierte Auswahl,
// Synonym-Suche. Rendering lebt in Glyph.jsx.
import * as Lucide from 'lucide-react'

export const COLORS = [
  '#1100ff', '#0ea5e9', '#0284c7', '#0d9488', '#059669', '#65a30d',
  '#ca8a04', '#ea580c', '#FA5D00', '#dc2626', '#e11d48', '#db2777',
  '#c026d3', '#9333ea', '#7c3aed', '#4f46e5', '#475569', '#1e293b',
]

export const ICONS = Object.keys(Lucide)
  .filter((k) => /^[A-Z]/.test(k) && k !== 'Icon'
    && !k.endsWith('Icon') && !k.startsWith('Lucide')
    && typeof Lucide[k] === 'object')
  .sort()
export const ICON_CAP = 180

// Kompakte Standard-Auswahl (leeres Suchfeld) — alles Weitere nur ueber die Suche.
export const CURATED = [
  'AppWindow', 'Globe', 'Link', 'Rocket', 'Star', 'Heart', 'Home', 'Folder',
  'Mail', 'Calendar', 'Users', 'Settings', 'Terminal', 'Database', 'BarChart3', 'Utensils',
].filter((n) => Lucide[n])

// Synonyme: Suchbegriff -> zusaetzliche Namens-Fragmente (lucide-Namen sind engl. & woertlich).
export const SYNONYMS = {
  essen: 'utensil salad pizza soup sandwich beef egg cake cookie coffee apple croissant',
  food: 'utensil salad pizza soup sandwich beef egg cake cookie coffee apple croissant',
  meal: 'utensil salad pizza soup sandwich', restaurant: 'utensil chef',
  drink: 'coffee cup wine beer martini', getraenk: 'coffee cup wine beer',
  geld: 'dollar euro coins banknote wallet credit receipt landmark',
  money: 'dollar euro coins banknote wallet credit receipt',
  chat: 'message messages', nachricht: 'message mail', email: 'mail atsign',
  termin: 'calendar clock', datei: 'file folder', dokument: 'file',
  statistik: 'chart activity trending', diagramm: 'chart pie',
  person: 'user users contact', team: 'users',
  einstellung: 'settings sliders wrench', werkzeug: 'wrench hammer',
  auto: 'car truck', reise: 'plane map luggage', musik: 'music headphones',
  foto: 'camera image', sicherheit: 'shield lock key', suche: 'search',
  einkauf: 'shopping cart store', kalender: 'calendar', uhr: 'clock timer',
}

// Bild-Icon (echtes App-Icon als Data-URI) vs. lucide-Name?
export const isImageIcon = (icon) => typeof icon === 'string' && icon.startsWith('data:')

// Suche: Name-Substring ODER Synonym-Fragment. Leere Query -> kuratierte Auswahl.
export const searchIcons = (query) => {
  const q = (query || '').trim().toLowerCase()
  if (!q) return CURATED
  const frags = [q, ...(SYNONYMS[q] || '').split(' ').filter(Boolean)]
  return ICONS.filter((n) => {
    const l = n.toLowerCase()
    return frags.some((f) => l.includes(f))
  })
}
