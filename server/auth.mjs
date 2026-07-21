// Google-Login (googleapis OAuth2) + Session-Auth, gespiegelt aus TaikoCast.
// Nur der Login-Flow (openid email profile, access_type online) — keine Drive/Gmail-Tokens.
import { Router } from 'express'
import { google } from 'googleapis'
import crypto from 'node:crypto'
import { upsertUser, getUserByEmail } from './db.mjs'

// APP_URL = Origin, auf dem der BROWSER die App sieht (nicht der Server-Port!).
// Dev: der Vite-Client auf 3005 (proxyt /api an den Server). Prod: setzt APP_URL
// explizit auf die Tunnel-URL. Redirect-URI + Post-Login-Redirect haengen daran.
const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  APP_URL = 'http://localhost:3005',
  ALLOWED_EMAILS = '',
} = process.env

// Eintraege: exakte Emails ODER Domain-Wildcards ("@taikonauten.com" -> ganze Domain).
const parseList = (s) => (s || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
const inList = (list, email) => {
  if (!email) return false
  const e = email.toLowerCase()
  return list.some((entry) => entry.startsWith('@') ? e.endsWith(entry) : e === entry)
}
const ALLOWLIST = parseList(ALLOWED_EMAILS)
const ADMINS = parseList(process.env.ADMIN_EMAILS)
export const isEmailAllowed = (email) => inList(ALLOWLIST, email)
export const isAdmin = (email) => inList(ADMINS, email)

export const requireAdmin = (req, res, next) => {
  if (!req.user || !isAdmin(req.user.email)) return res.status(403).json({ error: 'admin only' })
  next()
}

const REDIRECT_URI = `${APP_URL}/api/auth/login/callback`
const oauthClient = () => new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI)

// ── CSRF-state (single-use, in Session) ──────────────────────────────────────
const issueState = (req) => {
  const s = crypto.randomBytes(16).toString('hex')
  req.session.oauthState = s
  return s
}
const consumeState = (req, given) => {
  const expected = req.session.oauthState
  delete req.session.oauthState
  if (!expected || !given || expected.length !== given.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))
}

// ── Middleware ────────────────────────────────────────────────────────────────
export const requireAuth = (req, res, next) => {
  if (!req.session?.authenticated || !isEmailAllowed(req.session.email))
    return res.status(401).json({ error: 'unauthenticated' })
  const user = getUserByEmail(req.session.email)
  if (!user) return res.status(401).json({ error: 'unknown user' })
  req.user = user
  next()
}

// ── Routen ────────────────────────────────────────────────────────────────────
export function authRoutes() {
  const router = Router()

  router.get('/login', (req, res) => {
    const url = oauthClient().generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state: issueState(req),
    })
    res.redirect(url)
  })

  router.get('/login/callback', async (req, res) => {
    try {
      if (!consumeState(req, req.query.state)) return res.status(403).send('bad state')
      const client = oauthClient()
      const { tokens } = await client.getToken(req.query.code)
      client.setCredentials(tokens)
      const { data } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get()
      if (data.verified_email === false) return res.status(403).send('Email nicht verifiziert.')
      if (!isEmailAllowed(data.email)) return res.status(403).send('Kein Zugriff fuer diese Adresse.')
      upsertUser({ email: data.email, name: data.name || data.email, picture: data.picture || '' })
      // Frische Session-ID nach Login (Session-Fixation-Hygiene).
      await new Promise((resolve, reject) =>
        req.session.regenerate((err) => (err ? reject(err) : resolve())))
      req.session.authenticated = true
      req.session.email = data.email
      res.redirect('/')
    } catch (e) {
      console.error('OAuth callback error', e)
      res.status(500).send('Login fehlgeschlagen')
    }
  })

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }))
  })

  router.get('/me', (req, res) => {
    if (!req.session?.authenticated || !isEmailAllowed(req.session.email))
      return res.status(401).json({ error: 'unauthenticated' })
    const user = getUserByEmail(req.session.email)
    if (!user) return res.status(401).json({ error: 'unknown user' })
    res.json({ id: user.id, email: user.email, name: user.name, picture: user.picture, isAdmin: isAdmin(user.email) })
  })

  return router
}
