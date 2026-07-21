#!/usr/bin/env node
// TaikoHub-Launcher: winziger localhost-Dienst, der installierte macOS-Apps
// (inkl. Safari-Web-Apps als .app-Bundle) per `open` startet. TaikoHub POSTet
// {app, url} hierher; wir rufen `open -a "<app>" "<url>"` auf.
//
// Sicherheit: bindet NUR an 127.0.0.1, execFile (kein Shell -> keine Injection),
// nur http/https-URLs erlaubt. App-Name wird als reines Argument uebergeben.
//
// Selbsttest: `node launcher.mjs test`

import { createServer } from 'node:http'
import { execFile } from 'node:child_process'

const PORT = 7890

export const isSafeUrl = (url) => {
  try { return ['http:', 'https:'].includes(new URL(url).protocol) }
  catch { return false }
}

const openApp = (app, url) =>
  new Promise((resolve, reject) => {
    const args = app ? ['-a', app, url] : [url]
    execFile('open', args, (err) => (err ? reject(err) : resolve()))
  })

// ── Selbsttest ──────────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1) } }
  assert(isSafeUrl('https://x.com'), 'https ok')
  assert(isSafeUrl('http://localhost:3005'), 'http ok')
  assert(!isSafeUrl('file:///etc/passwd'), 'file blocked')
  assert(!isSafeUrl('javascript:alert(1)'), 'js blocked')
  assert(!isSafeUrl('nonsense'), 'garbage blocked')
  console.log('ok')
  process.exit(0)
}

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

createServer((req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.method === 'GET') return res.writeHead(200).end('taikohub-launcher')

  if (req.method === 'POST' && req.url === '/open') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy() })
    req.on('end', async () => {
      let data
      try { data = JSON.parse(body) } catch { return res.writeHead(400).end('bad json') }
      if (!isSafeUrl(data.url)) return res.writeHead(400).end('bad url')
      try {
        await openApp(data.app, data.url)
        res.writeHead(200).end('ok')
      } catch (e) {
        res.writeHead(500).end(String(e.message || e))
      }
    })
    return
  }
  res.writeHead(404).end()
}).listen(PORT, '127.0.0.1', () =>
  console.log(`taikohub-launcher auf http://127.0.0.1:${PORT}`))
