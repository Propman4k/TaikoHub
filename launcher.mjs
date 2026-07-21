#!/usr/bin/env node
// TaikoHub-Launcher: lokaler localhost-Dienst.
//  POST /open  {app,url}  -> oeffnet installierte macOS-App via `open`
//  GET  /apps            -> listet installierte Safari-Web-Apps {name,url,icon}
//
// Sicherheit: bindet NUR an 127.0.0.1, execFile (keine Shell), nur http/https.
// Selbsttest: `node launcher.mjs test`

import { createServer } from 'node:http'
import { execFile, execFileSync } from 'node:child_process'
import { readdirSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const PORT = 7890
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href

export const isSafeUrl = (url) => {
  try { return ['http:', 'https:'].includes(new URL(url).protocol) }
  catch { return false }
}

const openApp = (app, url) =>
  new Promise((resolve, reject) => {
    // Mit App-Name: nur die PWA starten (sie kennt ihre eigene URL). Die URL
    // mitzugeben oeffnet ein zweites, leeres Fenster. Ohne App: URL im Browser.
    const args = app ? ['-a', app] : [url]
    execFile('open', args, (err) => (err ? reject(err) : resolve()))
  })

// ── Installierte Safari-Web-Apps auslesen ─────────────────────────────────────
function iconDataUri(bundle) {
  try {
    const res = join(bundle, 'Contents/Resources')
    const icns = readdirSync(res).find((f) => f.endsWith('.icns'))
    if (!icns) return ''
    const tmp = join(tmpdir(), `thub-${Date.now()}-${Math.random().toString(36).slice(2)}.png`)
    execFileSync('sips', ['-s', 'format', 'png', '-Z', '128', join(res, icns), '--out', tmp], { stdio: 'ignore' })
    const b64 = readFileSync(tmp).toString('base64')
    rmSync(tmp, { force: true })
    return `data:image/png;base64,${b64}`
  } catch { return '' }
}

export function listWebApps() {
  const dirs = [join(homedir(), 'Applications'), '/Applications']
  const out = []
  for (const dir of dirs) {
    let entries
    try { entries = readdirSync(dir).filter((f) => f.endsWith('.app')) } catch { continue }
    for (const app of entries) {
      try {
        const bundle = join(dir, app)
        const plist = join(bundle, 'Contents/Info.plist')
        if (!existsSync(plist)) continue
        const info = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', plist], { encoding: 'utf8' }))
        if (!String(info.CFBundleIdentifier || '').startsWith('com.apple.Safari.WebApp')) continue
        const url = info.Manifest?.start_url
        if (!url) continue
        out.push({
          name: info.CFBundleName || info.CFBundleDisplayName || app.replace(/\.app$/, ''),
          url,
          icon: iconDataUri(bundle),
        })
      } catch { /* Bundle ueberspringen */ }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

// ── Selbsttest ──────────────────────────────────────────────────────────────
if (isMain && process.argv[2] === 'test') {
  const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1) } }
  assert(isSafeUrl('https://x.com'), 'https ok')
  assert(isSafeUrl('http://localhost:3005'), 'http ok')
  assert(!isSafeUrl('file:///etc/passwd'), 'file blocked')
  assert(!isSafeUrl('javascript:alert(1)'), 'js blocked')
  assert(!isSafeUrl('nonsense'), 'garbage blocked')
  assert(Array.isArray(listWebApps()), 'listWebApps liefert Array')
  console.log('ok')
  process.exit(0)
}

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

if (isMain) {
  createServer((req, res) => {
    cors(res)
    if (req.method === 'OPTIONS') return res.writeHead(204).end()

    if (req.method === 'GET') {
      if (req.url === '/apps') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(listWebApps()))
      }
      return res.writeHead(200).end('taikohub-launcher')
    }

    if (req.method === 'POST' && req.url === '/open') {
      let body = ''
      req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy() })
      req.on('end', async () => {
        let data
        try { data = JSON.parse(body) } catch { return res.writeHead(400).end('bad json') }
        if (!isSafeUrl(data.url)) return res.writeHead(400).end('bad url')
        try { await openApp(data.app, data.url); res.writeHead(200).end('ok') }
        catch (e) { res.writeHead(500).end(String(e.message || e)) }
      })
      return
    }
    res.writeHead(404).end()
  }).listen(PORT, '127.0.0.1', () =>
    console.log(`taikohub-launcher auf http://127.0.0.1:${PORT}`))
}
