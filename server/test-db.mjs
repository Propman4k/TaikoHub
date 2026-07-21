// Selbsttest der Verfuegbar-/Hinzufuegen-Logik gegen die echte DB (raeumt auf).
// Lauf: node test-db.mjs
import db, {
  upsertUser, getBoard, getAvailable, createTool, updateTool, upsertPlacement, getShareUserIds,
} from './db.mjs'

const assert = (c, m) => { if (!c) { console.error('FAIL:', m); cleanup(); process.exit(1) } }
function cleanup() { db.prepare("DELETE FROM users WHERE email LIKE '__test_%@x.dev'").run() }
cleanup()

const aId = upsertUser({ email: '__test_a@x.dev', name: 'A', picture: '' }).id
const bId = upsertUser({ email: '__test_b@x.dev', name: 'B', picture: '' }).id
const has = (list, tid) => list.some((x) => x.toolId === tid)

// A (Admin) legt Tool an, verfuegbar fuer B
const tid = createTool(aId, { name: 'T', url: 'https://t.dev', icon: 'Rocket', color: '#111' }, [bId])

// Nichts landet automatisch auf einem Board
assert(getBoard(aId).length === 0, 'A: Board leer nach Anlegen')
assert(getBoard(bId).length === 0, 'B: Board leer nach Freigabe')
// aber beide koennen es hinzufuegen
assert(has(getAvailable(aId), tid), 'A: Tool verfuegbar')
assert(has(getAvailable(bId), tid), 'B: Tool verfuegbar')
assert(getShareUserIds(tid).includes(bId), 'Share existiert')

// B fuegt hinzu
upsertPlacement(bId, tid, { x: 10, y: 20, macApp: 'BApp' })
assert(has(getBoard(bId), tid), 'B: nach Hinzufuegen auf Board')
assert(!has(getAvailable(bId), tid), 'B: nicht mehr in Verfuegbar')
assert(getBoard(aId).length === 0, 'A: unveraendert leer')

// B entfernt wieder (hidden=1) -> zurueck in Verfuegbar, Position/macApp bleibt
upsertPlacement(bId, tid, { hidden: true })
assert(getBoard(bId).length === 0, 'B: nach Entfernen nicht mehr auf Board')
assert(has(getAvailable(bId), tid), 'B: wieder verfuegbar')

// A entzieht Freigabe -> B sieht es gar nicht mehr
updateTool(tid, aId, { name: 'T', url: 'https://t.dev', icon: 'Rocket', color: '#111' }, [])
assert(!has(getAvailable(bId), tid), 'B: nach Entzug nicht mehr verfuegbar')

cleanup()
console.log('ok')
