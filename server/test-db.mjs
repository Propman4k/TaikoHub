// Selbsttest der Sharing-Logik gegen die echte DB (legt Test-User an, raeumt auf).
// Lauf: node test-db.mjs
import db, {
  upsertUser, getBoard, createTool, updateTool, upsertPlacement, getShareUserIds,
} from './db.mjs'

const assert = (c, m) => { if (!c) { console.error('FAIL:', m); cleanup(); process.exit(1) } }

const a = upsertUser({ email: '__test_a@x.dev', name: 'A', picture: '' })
const b = upsertUser({ email: '__test_b@x.dev', name: 'B', picture: '' })

function cleanup() {
  db.prepare("DELETE FROM users WHERE email LIKE '__test_%@x.dev'").run() // cascade loescht tools/shares/placements
}
cleanup() // evtl. Reste aus vorherigem Lauf

const aId = upsertUser({ email: '__test_a@x.dev', name: 'A', picture: '' }).id
const bId = upsertUser({ email: '__test_b@x.dev', name: 'B', picture: '' }).id

// A legt Tool an, geteilt mit B
const tid = createTool(aId, { name: 'T', url: 'https://t.dev', icon: 'Rocket', color: '#111', macApp: 'MyApp' }, [bId])

let bA = getBoard(aId), bB = getBoard(bId)
assert(bA.length === 1 && bA[0].mine === 1, 'A sieht eigenes Tool als mine')
assert(bA[0].macApp === 'MyApp', 'A macApp aus create uebernommen')
assert(bB.length === 1 && bB[0].mine === 0 && bB[0].hidden === 0, 'B sieht geteiltes Tool, nicht mine, sichtbar')
assert(bB[0].macApp === '', 'B hat eigene (leere) macApp')
assert(getShareUserIds(tid).includes(bId), 'Share existiert')

// B blendet aus + eigene Position/macApp -> beeinflusst A nicht
upsertPlacement(bId, tid, { hidden: true, x: 300, y: 400, macApp: 'BApp' })
bB = getBoard(bId); bA = getBoard(aId)
assert(bB[0].hidden === 1 && bB[0].x === 300 && bB[0].macApp === 'BApp', 'B: hidden+pos+macApp gesetzt')
assert(bA[0].hidden === 0 && bA[0].macApp === 'MyApp', 'A unveraendert')

// A entfernt den Share -> B sieht nichts mehr
updateTool(tid, aId, { name: 'T2', url: 'https://t.dev', icon: 'Rocket', color: '#111' }, [])
bB = getBoard(bId); bA = getBoard(aId)
assert(bB.length === 0, 'B sieht Tool nach Entzug nicht mehr')
assert(bA.length === 1 && bA[0].name === 'T2', 'A: Tool umbenannt, weiterhin da')

cleanup()
console.log('ok')
