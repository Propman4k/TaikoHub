// Google-Login (googleapis OAuth2) + Session-Auth, gespiegelt aus TaikoCast.
// Nur der Login-Flow (openid email profile, access_type online) — keine Drive/Gmail-Tokens.
import { Router } from 'express'
import { google } from 'googleapis'
import crypto from 'node:crypto'
import { upsertUser, getUserByEmail } from './db.mjs'

const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  APP_URL = `http://localhost:${process.env.PORT || 3006}`,
  ALLOWED_EMAILS = '',
} = process.env

// Eintraege: exakte Emails ODER Domain-Wildcards ("@taikonauten.com" -> ganze Domain).
const ALLOWLIST = ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
export const isEmailAllowed = (email) => {
  if (!email) return false
  const e = email.toLowerCase()
  return ALLOWLIST.some((entry) => entry.startsWith('@') ? e.endsWith(entry) : e === entry)
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
      if (!isEmailAllowed(data.email)) return res.status(403).send('Kein Zugriff fuer diese Adresse.')
      upsertUser({ email: data.email, name: data.name || data.email, picture: data.picture || '' })
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
    res.json({ id: user.id, email: user.email, name: user.name, picture: user.picture })
  })

  return router
}
