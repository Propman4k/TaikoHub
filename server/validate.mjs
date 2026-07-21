// Eingabe-Validierung der Tool-Routen (POST/PATCH /api/tools).
const isValidUrl = (u) => { try { new URL(u); return true } catch { return false } }
const str = (v) => String(v || '').trim()

// Liefert normalisierte Tool-Daten oder null bei ungueltiger Eingabe.
export const parseTool = (b = {}) => {
  const name = str(b.name)
  const icon = str(b.icon)
  const color = str(b.color)
  let url = str(b.url)
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  if (!name || !icon || !color) return null
  if (!isValidUrl(url)) return null
  // Nur positive Integer-User-IDs (Number(null)=0 wuerde sonst durchrutschen)
  const shareWith = Array.isArray(b.shareWith)
    ? b.shareWith.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []
  return { name, url, icon, color, shareWith }
}
