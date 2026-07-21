// Sharing-/Board-Semantik gegen die echte DB (Nachfolger von test-db.mjs).
// Legt __test_*-User an und raeumt auf.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import db, {
  upsertUser, getBoard, getAvailable, createTool, updateTool, upsertPlacement,
  getShareUserIds, getUserToolIds, setUserAccess, countToolsOwned, canSeeTool,
} from './db.mjs'

const cleanup = () => db.prepare("DELETE FROM users WHERE email LIKE '__test_%@x.dev'").run()
const has = (list, tid) => list.some((x) => x.toolId === tid)

let aId, bId, tid
beforeAll(() => {
  cleanup()
  aId = upsertUser({ email: '__test_a@x.dev', name: 'A', picture: '' }).id
  bId = upsertUser({ email: '__test_b@x.dev', name: 'B', picture: '' }).id
  tid = createTool(aId, { name: 'T', url: 'https://t.dev', icon: 'Rocket', color: '#111' }, [bId])
})
afterAll(cleanup)

describe('Anlegen & Verfuegbarkeit', () => {
  it('nichts landet automatisch auf einem Board', () => {
    expect(getBoard(aId)).toHaveLength(0)
    expect(getBoard(bId)).toHaveLength(0)
  })
  it('Owner und Geteilte koennen es hinzufuegen', () => {
    expect(has(getAvailable(aId), tid)).toBe(true)
    expect(has(getAvailable(bId), tid)).toBe(true)
    expect(getShareUserIds(tid)).toContain(bId)
  })
  it('canSeeTool: Owner+Share ja, Fremde nein', () => {
    expect(canSeeTool(aId, tid)).toBe(true)
    expect(canSeeTool(bId, tid)).toBe(true)
    expect(canSeeTool(999999, tid)).toBe(false)
  })
  it('countToolsOwned zaehlt nur den Owner (Basis des Delete-Guards)', () => {
    expect(countToolsOwned(aId)).toBe(1)
    expect(countToolsOwned(bId)).toBe(0)
  })
})

describe('Board-Placement', () => {
  it('Hinzufuegen bringt es aufs Board und aus Verfuegbar raus', () => {
    upsertPlacement(bId, tid, { x: 10, y: 20, macApp: 'BApp' })
    expect(has(getBoard(bId), tid)).toBe(true)
    expect(has(getAvailable(bId), tid)).toBe(false)
    expect(getBoard(aId)).toHaveLength(0) // A unveraendert
  })
  it('Teil-Updates aendern nur die gesendeten Felder', () => {
    upsertPlacement(bId, tid, { x: 136 })
    const item = getBoard(bId).find((x) => x.toolId === tid)
    expect(item.x).toBe(136)
    expect(item.y).toBe(20)
    expect(item.macApp).toBe('BApp')
  })
  it('Entfernen (hidden) legt es zurueck in Verfuegbar', () => {
    upsertPlacement(bId, tid, { hidden: true })
    expect(getBoard(bId)).toHaveLength(0)
    expect(has(getAvailable(bId), tid)).toBe(true)
  })
})

describe('Freigaben entziehen & setzen', () => {
  it('updateTool ohne B entzieht Verfuegbarkeit', () => {
    updateTool(tid, aId, { name: 'T', url: 'https://t.dev', icon: 'Rocket', color: '#111' }, [])
    expect(has(getAvailable(bId), tid)).toBe(false)
  })
  it('setUserAccess setzt und entzieht Zugriffe', () => {
    setUserAccess(bId, [tid])
    expect(getUserToolIds(bId)).toContain(tid)
    expect(has(getAvailable(bId), tid)).toBe(true)
    setUserAccess(bId, [])
    expect(getUserToolIds(bId)).toHaveLength(0)
  })
})
