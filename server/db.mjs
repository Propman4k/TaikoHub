// SQLite-Anbindung + Schema + Queries. Greenfield -> reines CREATE IF NOT EXISTS,
// kein Migrations-Framework noetig. DB liegt in cache/ (in Prod als Volume gemountet).
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE = join(__dirname, 'cache')
mkdirSync(CACHE, { recursive: true })

export const DB_PATH = join(CACHE, 'taikohub.db')
export const SESSION_DB_PATH = join(CACHE, 'sessions.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS shares (
    tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (tool_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS placements (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    x REAL NOT NULL DEFAULT 24,
    y REAL NOT NULL DEFAULT 24,
    hidden INTEGER NOT NULL DEFAULT 0,
    mac_app TEXT DEFAULT '',
    PRIMARY KEY (user_id, tool_id)
  );
`)

// ── User ────────────────────────────────────────────────────────────────────
const upsertUserStmt = db.prepare(`
  INSERT INTO users (email, name, picture) VALUES (@email, @name, @picture)
  ON CONFLICT(email) DO UPDATE SET name=excluded.name, picture=excluded.picture
  RETURNING id, email, name, picture
`)
export const upsertUser = (u) => upsertUserStmt.get(u)
export const getUserByEmail = (email) =>
  db.prepare('SELECT id, email, name, picture FROM users WHERE email = ?').get(email.toLowerCase())
export const listUsers = () =>
  db.prepare('SELECT id, email, name FROM users ORDER BY name').all()

// Admin: Mitarbeiter vorab per Email anlegen (Name = Email bis zum ersten Login).
export const createUserByEmail = (email) =>
  db.prepare('INSERT OR IGNORE INTO users (email, name) VALUES (?, ?)').run(email.toLowerCase(), email.toLowerCase())
export const deleteUser = db.prepare('DELETE FROM users WHERE id = ?')

// Zugriffe eines Mitarbeiters (welche Tools sind fuer ihn freigegeben)
export const getUserToolIds = (userId) =>
  db.prepare('SELECT tool_id FROM shares WHERE user_id = ?').all(userId).map((r) => r.tool_id)

const delShare = db.prepare('DELETE FROM shares WHERE tool_id=? AND user_id=?')
const delPlacement = db.prepare('DELETE FROM placements WHERE tool_id=? AND user_id=?')
const addShare = db.prepare('INSERT OR IGNORE INTO shares (tool_id, user_id) VALUES (?, ?)')
export const setUserAccess = db.transaction((userId, toolIds) => {
  const cur = getUserToolIds(userId)
  const target = new Set(toolIds)
  for (const tid of cur) if (!target.has(tid)) { delShare.run(tid, userId); delPlacement.run(tid, userId) }
  for (const tid of target) if (!cur.includes(tid)) addShare.run(tid, userId)
})

// ── Board (Tools + eigene Placement-Sicht) ────────────────────────────────────
// Board = Tools, die der Nutzer sehen DARF (Owner/Share) UND aktiv hinzugefuegt hat
// (placement existiert, hidden=0).
export const getBoard = (userId) =>
  db.prepare(`
    SELECT t.id AS toolId, t.name, t.url, t.icon, t.color,
           t.owner_id AS ownerId, o.name AS ownerName,
           (t.owner_id = @uid) AS mine,
           p.x AS x, p.y AS y, p.hidden AS hidden, p.mac_app AS macApp
    FROM tools t
    JOIN users o ON o.id = t.owner_id
    JOIN placements p ON p.tool_id = t.id AND p.user_id = @uid AND p.hidden = 0
    WHERE t.owner_id = @uid
       OR t.id IN (SELECT tool_id FROM shares WHERE user_id = @uid)
    ORDER BY t.created_at
  `).all({ uid: userId })

// Verfuegbar = darf der Nutzer sehen, aber noch NICHT auf dem Board (kein placement
// oder hidden=1). Fuellt den "Tool hinzufuegen"-Picker.
export const getAvailable = (userId) =>
  db.prepare(`
    SELECT t.id AS toolId, t.name, t.url, t.icon, t.color, o.name AS ownerName
    FROM tools t
    JOIN users o ON o.id = t.owner_id
    LEFT JOIN placements p ON p.tool_id = t.id AND p.user_id = @uid
    WHERE (t.owner_id = @uid OR t.id IN (SELECT tool_id FROM shares WHERE user_id = @uid))
      AND (p.tool_id IS NULL OR p.hidden = 1)
    ORDER BY t.name
  `).all({ uid: userId })

// Alle Tools (Admin-Katalog).
export const listAllTools = () =>
  db.prepare('SELECT id AS toolId, name, url, icon, color FROM tools ORDER BY name').all()

export const getShareUserIds = (toolId) =>
  db.prepare('SELECT user_id FROM shares WHERE tool_id = ?').all(toolId).map((r) => r.user_id)

export const getToolOwner = (toolId) =>
  db.prepare('SELECT owner_id FROM tools WHERE id = ?').get(toolId)?.owner_id

// darf userId dieses Tool sehen? (Owner oder Share)
export const canSeeTool = (userId, toolId) =>
  !!db.prepare(`
    SELECT 1 FROM tools t WHERE t.id = @tid
      AND (t.owner_id = @uid OR t.id IN (SELECT tool_id FROM shares WHERE user_id = @uid))
  `).get({ uid: userId, tid: toolId })

// ── Mutations (in Transaktionen) ─────────────────────────────────────────────
const insertTool = db.prepare(
  'INSERT INTO tools (id, owner_id, name, url, icon, color) VALUES (@id, @ownerId, @name, @url, @icon, @color)')
const insertPlacement = db.prepare(
  'INSERT OR IGNORE INTO placements (user_id, tool_id, x, y, mac_app) VALUES (@uid, @tid, @x, @y, @macApp)')
const insertShare = db.prepare('INSERT OR IGNORE INTO shares (tool_id, user_id) VALUES (@tid, @uid)')

// Anlegen = Tool + Verfuegbarkeit (shares). KEIN placement -> landet erst auf dem Board,
// wenn ein Nutzer es selbst hinzufuegt.
export const createTool = db.transaction((ownerId, data, shareWith) => {
  const id = randomUUID()
  insertTool.run({ id, ownerId, name: data.name, url: data.url, icon: data.icon, color: data.color })
  for (const uid of shareWith) if (uid !== ownerId) insertShare.run({ tid: id, uid })
  return id
})

const updateToolStmt = db.prepare(
  'UPDATE tools SET name=@name, url=@url, icon=@icon, color=@color WHERE id=@id')
const deleteShareStmt = db.prepare('DELETE FROM shares WHERE tool_id=@tid AND user_id=@uid')
const deletePlacementStmt = db.prepare('DELETE FROM placements WHERE tool_id=@tid AND user_id=@uid')

export const updateTool = db.transaction((toolId, ownerId, data, shareWith) => {
  updateToolStmt.run({ id: toolId, name: data.name, url: data.url, icon: data.icon, color: data.color })
  const current = getShareUserIds(toolId)
  const target = new Set(shareWith.filter((u) => u !== ownerId))
  for (const uid of current) if (!target.has(uid)) { // entfernte Shares
    deleteShareStmt.run({ tid: toolId, uid })
    deletePlacementStmt.run({ tid: toolId, uid })
  }
  for (const uid of target) if (!current.includes(uid)) insertShare.run({ tid: toolId, uid })
})

export const deleteTool = db.prepare('DELETE FROM tools WHERE id = ?')

// Eigene Placement-Zeile aktualisieren (nur die Felder, die kamen). Legt Zeile an,
// falls noch keine existiert (z.B. frisch geteiltes Tool).
export const upsertPlacement = (userId, toolId, fields) => {
  insertPlacement.run({ uid: userId, tid: toolId, x: 24, y: 24, macApp: '' })
  const cols = []
  const params = { uid: userId, tid: toolId }
  for (const [k, col] of [['x', 'x'], ['y', 'y'], ['hidden', 'hidden'], ['macApp', 'mac_app']]) {
    if (fields[k] !== undefined) { cols.push(`${col}=@${k}`); params[k] = k === 'hidden' ? (fields[k] ? 1 : 0) : fields[k] }
  }
  if (cols.length) db.prepare(`UPDATE placements SET ${cols.join(', ')} WHERE user_id=@uid AND tool_id=@tid`).run(params)
}

export default db
