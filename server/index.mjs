import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import express from 'express'
import session from 'express-session'
import SqliteStoreFactory from 'better-sqlite3-session-store'
import Database from 'better-sqlite3'
import helmet from 'helmet'
import cors from 'cors'

const __dirname = dirname(fileURLToPath(import.meta.url))
// override: .env hat Vorrang vor ererbten Shell-Vars (z.B. PORT vom Dev-Harness).
dotenv.config({ path: join(__dirname, '.env'), override: true })

// ENV-Pflichtfelder frueh pruefen (fail-fast).
for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'ALLOWED_EMAILS']) {
  if (!process.env[k]) { console.error(`FEHLT ENV: ${k}`); process.exit(1) }
}

const { authRoutes, requireAuth, requireAdmin } = await import('./auth.mjs')
const dbmod = await import('./db.mjs')
const {
  SESSION_DB_PATH, getBoard, getAvailable, listAllTools, listUsers, createTool,
  updateTool, deleteTool, getToolOwner, canSeeTool, getShareUserIds, upsertPlacement,
} = dbmod

const isProd = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 3006
const app = express()
if (isProd) app.set('trust proxy', 1)

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:3005', credentials: true }))
app.use(express.json({ limit: '1mb' })) // Icon-Data-URIs koennen ein paar KB haben

const SqliteStore = SqliteStoreFactory(session)
app.use(session({
  store: new SqliteStore({ client: new Database(SESSION_DB_PATH), expired: { clear: true, intervalMs: 900000 } }),
  secret: process.env.SESSION_SECRET || 'dev-insecure-secret',
  resave: false,
  saveUninitialized: false,
  name: 'taikohub.sid',
  cookie: { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}))

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes())

// ── Validierung ───────────────────────────────────────────────────────────────
const parseTool = (b) => {
  const name = String(b?.name || '').trim()
  let url = String(b?.url || '').trim()
  const icon = String(b?.icon || '').trim()
  const color = String(b?.color || '').trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  if (!name || !icon || !color) return null
  try { new URL(url) } catch { return null }
  const shareWith = Array.isArray(b?.shareWith) ? b.shareWith.map(Number).filter(Number.isInteger) : []
  return { name, url, icon, color, macApp: String(b?.macApp || '').trim(), shareWith,
           x: Number.isFinite(b?.x) ? b.x : undefined, y: Number.isFinite(b?.y) ? b.y : undefined }
}

// ── API (alles hinter requireAuth) ───────────────────────────────────────────
app.get('/api/users', requireAuth, (req, res) => res.json(listUsers()))

app.get('/api/board', requireAuth, (req, res) => {
  res.json(getBoard(req.user.id).map((it) => ({ ...it, mine: !!it.mine })))
})

// Verfuegbare, noch nicht hinzugefuegte Tools (fuer den "Tool hinzufuegen"-Picker).
app.get('/api/available', requireAuth, (req, res) => res.json(getAvailable(req.user.id)))

// Admin-Katalog: alle Tools + wem sie freigegeben sind.
app.get('/api/tools', requireAuth, requireAdmin, (req, res) => {
  res.json(listAllTools().map((t) => ({ ...t, sharedWith: getShareUserIds(t.toolId) })))
})

// Tool-Verwaltung nur fuer Admins (zentraler Katalog).
app.post('/api/tools', requireAuth, requireAdmin, (req, res) => {
  const data = parseTool(req.body)
  if (!data) return res.status(400).json({ error: 'invalid tool' })
  const id = createTool(req.user.id, data, data.shareWith)
  res.status(201).json({ id })
})

app.patch('/api/tools/:id', requireAuth, requireAdmin, (req, res) => {
  const owner = getToolOwner(req.params.id)
  if (owner == null) return res.status(404).json({ error: 'not found' })
  const data = parseTool(req.body)
  if (!data) return res.status(400).json({ error: 'invalid tool' })
  updateTool(req.params.id, owner, data, data.shareWith)
  res.json({ ok: true })
})

app.delete('/api/tools/:id', requireAuth, requireAdmin, (req, res) => {
  deleteTool.run(req.params.id)
  res.json({ ok: true })
})

// Eigene Placement (Position / hidden / macApp). Nur fuer sichtbare Tools.
app.patch('/api/placements/:toolId', requireAuth, (req, res) => {
  if (!canSeeTool(req.user.id, req.params.toolId)) return res.status(403).json({ error: 'no access' })
  const f = {}
  if (Number.isFinite(req.body?.x)) f.x = req.body.x
  if (Number.isFinite(req.body?.y)) f.y = req.body.y
  if (typeof req.body?.hidden === 'boolean') f.hidden = req.body.hidden
  if (typeof req.body?.macApp === 'string') f.macApp = req.body.macApp.trim()
  upsertPlacement(req.user.id, req.params.toolId, f)
  res.json({ ok: true })
})

// ── Prod: Client ausliefern ───────────────────────────────────────────────────
if (isProd) {
  const dist = join(__dirname, '..', 'dist')
  if (existsSync(dist)) {
    app.use(express.static(dist))
    app.get('/{*path}', (req, res, next) =>
      req.path.startsWith('/api/') ? next() : res.sendFile(join(dist, 'index.html')))
  }
}

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'server error' })
})

app.listen(PORT, '0.0.0.0', () => console.log(`TaikoHub-Server auf :${PORT}`))
