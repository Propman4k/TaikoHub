import { describe, it, expect } from 'vitest'
import { parseTool } from './validate.mjs'

const base = { name: 'Tool', url: 'https://t.dev', icon: 'Rocket', color: '#111' }

describe('parseTool', () => {
  it('akzeptiert gueltige Eingaben und trimmt', () => {
    expect(parseTool({ ...base, name: '  Tool  ' })).toEqual({ ...base, shareWith: [] })
  })
  it('ergaenzt https:// wenn Schema fehlt', () => {
    expect(parseTool({ ...base, url: 'taiko.dev' }).url).toBe('https://taiko.dev')
  })
  it('lehnt fehlende Pflichtfelder ab', () => {
    expect(parseTool({ ...base, name: '' })).toBeNull()
    expect(parseTool({ ...base, icon: '' })).toBeNull()
    expect(parseTool({ ...base, color: '' })).toBeNull()
    expect(parseTool()).toBeNull()
  })
  it('lehnt kaputte URLs ab (auch javascript:)', () => {
    expect(parseTool({ ...base, url: 'http://' })).toBeNull()
    expect(parseTool({ ...base, url: 'javascript:alert(1)' })).toBeNull()
  })
  it('filtert shareWith auf Integer', () => {
    expect(parseTool({ ...base, shareWith: [1, '2', 'x', 3.5, null] }).shareWith).toEqual([1, 2])
    expect(parseTool({ ...base, shareWith: 'nope' }).shareWith).toEqual([])
  })
})
