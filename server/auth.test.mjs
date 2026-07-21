// Allowlist-/Admin-Logik + requireAuth/requireAdmin (Env wird vor Import gestubbt,
// weil auth.mjs die Listen beim Modul-Load liest).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

let auth, db, uid
const fakeRes = () => {
  const r = { code: null, body: null }
  r.status = (c) => { r.code = c; return r }
  r.json = (b) => { r.body = b; return r }
  return r
}

beforeAll(async () => {
  vi.stubEnv('ALLOWED_EMAILS', '@x.dev, solo@extern.com')
  vi.stubEnv('ADMIN_EMAILS', '__test_admin@x.dev')
  auth = await import('./auth.mjs')
  db = await import('./db.mjs')
  db.default.prepare("DELETE FROM users WHERE email LIKE '__test_%@x.dev'").run()
  uid = db.upsertUser({ email: '__test_admin@x.dev', name: 'Adm', picture: '' }).id
})
afterAll(() => db.default.prepare("DELETE FROM users WHERE email LIKE '__test_%@x.dev'").run())

describe('Allowlist', () => {
  it('Domain-Wildcard erlaubt die ganze Domain', () => {
    expect(auth.isEmailAllowed('wer@x.dev')).toBe(true)
    expect(auth.isEmailAllowed('WER@X.DEV')).toBe(true)
  })
  it('exakte Emails nur exakt', () => {
    expect(auth.isEmailAllowed('solo@extern.com')).toBe(true)
    expect(auth.isEmailAllowed('anderer@extern.com')).toBe(false)
    expect(auth.isEmailAllowed('')).toBe(false)
    expect(auth.isEmailAllowed(undefined)).toBe(false)
  })
  it('isAdmin nur fuer ADMIN_EMAILS', () => {
    expect(auth.isAdmin('__test_admin@x.dev')).toBe(true)
    expect(auth.isAdmin('wer@x.dev')).toBe(false)
  })
})

describe('requireAuth', () => {
  it('ohne Session -> 401', () => {
    const res = fakeRes()
    auth.requireAuth({ session: undefined }, res, () => { throw new Error('next darf nicht laufen') })
    expect(res.code).toBe(401)
  })
  it('Session ohne Allowlist-Treffer -> 401', () => {
    const res = fakeRes()
    auth.requireAuth({ session: { authenticated: true, email: 'boese@fremd.com' } }, res, () => {})
    expect(res.code).toBe(401)
  })
  it('gueltige Session laedt req.user und ruft next', () => {
    const req = { session: { authenticated: true, email: '__test_admin@x.dev' } }
    let called = false
    auth.requireAuth(req, fakeRes(), () => { called = true })
    expect(called).toBe(true)
    expect(req.user.id).toBe(uid)
  })
})

describe('requireAdmin', () => {
  it('Nicht-Admin -> 403, Admin -> next', () => {
    const res = fakeRes()
    auth.requireAdmin({ user: { email: 'wer@x.dev' } }, res, () => {})
    expect(res.code).toBe(403)
    let called = false
    auth.requireAdmin({ user: { email: '__test_admin@x.dev' } }, fakeRes(), () => { called = true })
    expect(called).toBe(true)
  })
})
