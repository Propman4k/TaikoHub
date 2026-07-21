import { describe, it, expect } from 'vitest'
import { searchIcons, isImageIcon, CURATED, ICONS } from './icons.js'

describe('searchIcons', () => {
  it('leere Query liefert die kuratierte Auswahl', () => {
    expect(searchIcons('')).toBe(CURATED)
    expect(searchIcons('   ')).toBe(CURATED)
  })
  it('findet per Namens-Substring (case-insensitiv)', () => {
    expect(searchIcons('MAIL')).toContain('Mail')
  })
  it('findet per deutschem Synonym', () => {
    const hits = searchIcons('essen')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((n) => /Utensils|Pizza|Coffee/.test(n))).toBe(true)
  })
  it('liefert leeres Array fuer Unsinn', () => {
    expect(searchIcons('xyzzy123')).toEqual([])
  })
  it('ICONS-Katalog ist gross und sortiert', () => {
    expect(ICONS.length).toBeGreaterThan(1000)
    expect([...ICONS].sort()).toEqual(ICONS)
  })
})

describe('isImageIcon', () => {
  it('erkennt Data-URIs, aber keine lucide-Namen', () => {
    expect(isImageIcon('data:image/png;base64,abc')).toBe(true)
    expect(isImageIcon('Rocket')).toBe(false)
    expect(isImageIcon(undefined)).toBe(false)
  })
})
