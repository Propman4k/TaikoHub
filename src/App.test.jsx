// Integrationstests durch die echte App mit gemocktem fetch: Login-Gate,
// Board, Kachel-Optionen, Settings (Apps/Mitarbeiter), Tool-Picker.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from './App.jsx'

const ME = { id: 1, email: 'mf@x.dev', name: 'Maik', picture: '', isAdmin: true }
const TILE = { toolId: 't1', name: 'TaikoEat', url: 'https://eat.dev', icon: 'Utensils',
               color: '#dc2626', x: 24, y: 24, macApp: '', mine: 1 }
const USERS = [{ id: 1, email: 'mf@x.dev', name: 'Maik' }, { id: 2, email: 'marina@x.dev', name: 'Marina' }]

// Mini-Router fuer fetch: erste Route mit Methode+Pfad-Prefix gewinnt; loggt Calls.
let calls
const mockApi = (routes) => {
  calls = []
  vi.stubGlobal('fetch', (url, opts = {}) => {
    const method = opts.method || 'GET'
    const path = String(url)
    calls.push({ method, path, body: opts.body ? JSON.parse(opts.body) : undefined })
    const hit = routes.find((r) => r.m === method && path.startsWith(r.p))
    if (!hit) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
    const status = hit.status || 200
    return Promise.resolve({ ok: status < 400, status, json: async () => (hit.body ?? { ok: true }) })
  })
}
const called = (m, p) => calls.some((c) => c.method === m && c.path.startsWith(p))

const BASE = [
  { m: 'GET', p: '/api/auth/me', body: ME },
  { m: 'GET', p: '/api/board', body: [TILE] },
  { m: 'GET', p: '/api/tools', body: [{ ...TILE, sharedWith: [2] }] },
  { m: 'GET', p: '/api/users/2/access', body: ['t1'] },
  { m: 'GET', p: '/api/users', body: USERS },
  { m: 'GET', p: '/api/available', body: [{ toolId: 't2', name: 'TaikoTasks', url: 'https://tasks.dev', icon: 'Kanban', color: '#111' }] },
  { m: 'PATCH', p: '/api/placements' },
  { m: 'POST', p: '/api/tools' }, { m: 'PATCH', p: '/api/tools' }, { m: 'DELETE', p: '/api/tools' },
  { m: 'POST', p: '/api/users' }, { m: 'DELETE', p: '/api/users' }, { m: 'PUT', p: '/api/users' },
  { m: 'POST', p: '/api/auth/logout' },
]

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('confirm', vi.fn(() => true))
  vi.stubGlobal('alert', vi.fn())
})

const openSettings = async () => {
  render(<App />)
  fireEvent.click(await screen.findByTitle('Optionen'))
  fireEvent.click(screen.getByRole('button', { name: /Einstellungen/ }))
  await screen.findByRole('heading', { name: 'Einstellungen' })
}

describe('Auth-Gate', () => {
  it('zeigt Login wenn /me 401 liefert', async () => {
    mockApi([{ m: 'GET', p: '/api/auth/me', status: 401, body: {} }])
    render(<App />)
    expect(await screen.findByText('Mit Google anmelden')).toBeInTheDocument()
  })
  it('Abmelden fuehrt zurueck zum Login', async () => {
    mockApi(BASE)
    render(<App />)
    fireEvent.click(await screen.findByTitle('Optionen'))
    fireEvent.click(screen.getByRole('button', { name: /Abmelden/ }))
    expect(await screen.findByText('Mit Google anmelden')).toBeInTheDocument()
    expect(called('POST', '/api/auth/logout')).toBe(true)
  })
})

describe('Board', () => {
  it('rendert Kacheln vom Server', async () => {
    mockApi(BASE)
    render(<App />)
    expect(await screen.findByText('TaikoEat')).toBeInTheDocument()
  })
  it('zeigt Empty-State ohne Apps', async () => {
    mockApi([{ m: 'GET', p: '/api/auth/me', body: ME }, { m: 'GET', p: '/api/board', body: [] }])
    render(<App />)
    expect(await screen.findByText('Noch keine Apps')).toBeInTheDocument()
  })
  it('Klick auf Kachel oeffnet Browser-Fenster', async () => {
    mockApi(BASE)
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<App />)
    const tile = await screen.findByText('TaikoEat')
    fireEvent.pointerDown(tile.parentElement, { button: 0 })
    fireEvent.pointerUp(tile.parentElement)
    expect(open).toHaveBeenCalledWith('https://eat.dev', 'taikohub_t1', expect.stringContaining('popup=yes'))
  })
  it('Kachel-Optionen: macApp speichern via PATCH placement', async () => {
    mockApi(BASE)
    render(<App />)
    await screen.findByText('TaikoEat')
    fireEvent.click(screen.getAllByTitle('Optionen')[0]) // Zahnrad auf der Kachel
    const input = await screen.findByPlaceholderText(/oeffnet installierte App/)
    fireEvent.change(input, { target: { value: 'TaikoEat' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(called('PATCH', '/api/placements/t1')).toBe(true))
    expect(calls.find((c) => c.method === 'PATCH' && c.path.includes('t1')).body)
      .toEqual({ macApp: 'TaikoEat', hidden: false })
  })
  it('Tool-Picker fuegt verfuegbares Tool per PATCH hinzu', async () => {
    mockApi(BASE)
    render(<App />)
    fireEvent.click(await screen.findByTitle('Optionen'))
    fireEvent.click(screen.getByRole('button', { name: /Tool hinzufuegen/ }))
    fireEvent.click(await screen.findByText('TaikoTasks'))
    fireEvent.click(screen.getByRole('button', { name: /1 hinzufuegen/ }))
    await waitFor(() => expect(called('PATCH', '/api/placements/t2')).toBe(true))
  })
})

describe('Board: Drag', () => {
  it('Drag rastet in Rasterzelle ein und persistiert x/y', async () => {
    mockApi(BASE)
    render(<App />)
    const tile = (await screen.findByText('TaikoEat')).parentElement
    fireEvent.pointerDown(tile, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(tile, { clientX: 200, clientY: 60 })
    fireEvent.pointerUp(tile)
    await waitFor(() => expect(called('PATCH', '/api/placements/t1')).toBe(true))
    const body = calls.find((c) => c.method === 'PATCH' && c.path.includes('t1')).body
    expect(body).toEqual({ x: 24, y: 24 }) // jsdom-Board hat Breite 0 -> Zelle (0,0)
  })
})

describe('Settings: Opener', () => {
  it('zeigt Download + Verbindungstest (ohne Opener: "Nicht erkannt")', async () => {
    mockApi(BASE)
    await openSettings()
    fireEvent.click(screen.getByRole('button', { name: /TaikoHub Opener/ }))
    expect(await screen.findByText('Opener herunterladen')).toBeInTheDocument()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Verbindung testen' }))
    // unsichtbarer iframe traegt die Scheme-URL (kein window.open -> kein Fake-blur)
    const frame = document.querySelector('iframe')
    expect(frame?.src).toContain('taikohub://open?name=Finder')
    act(() => vi.advanceTimersByTime(3100))
    vi.useRealTimers()
    expect(await screen.findByText('Nicht erkannt')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull() // aufgeraeumt
  })
  it('Nicht-Admin sieht nur die Opener-Sektion', async () => {
    mockApi([{ m: 'GET', p: '/api/auth/me', body: { ...ME, isAdmin: false } },
             { m: 'GET', p: '/api/board', body: [] }])
    render(<App />)
    fireEvent.click(await screen.findByTitle('Optionen'))
    fireEvent.click(screen.getByRole('button', { name: /Einstellungen/ }))
    expect(await screen.findByText('Opener herunterladen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mitarbeiter/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apps' })).toBeNull()
  })
})

describe('Settings: Apps', () => {
  it('listet den Katalog und legt neue App per POST an', async () => {
    mockApi(BASE)
    await openSettings()
    expect(await screen.findByText('TaikoEat')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Neu/ }))
    fireEvent.change(await screen.findByPlaceholderText('Name'), { target: { value: 'TaikoCast' } })
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'cast.taiko.dev' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(called('POST', '/api/tools')).toBe(true))
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/tools').body.name).toBe('TaikoCast')
  })
  it('Loeschen fragt nach und feuert DELETE', async () => {
    mockApi(BASE)
    await openSettings()
    fireEvent.click(await screen.findByText('TaikoEat'))
    fireEvent.click(await screen.findByRole('button', { name: /Loeschen/ }))
    await waitFor(() => expect(called('DELETE', '/api/tools/t1')).toBe(true))
    expect(window.confirm).toHaveBeenCalled()
  })
  it('Loeschen bricht ohne Bestaetigung ab', async () => {
    mockApi(BASE)
    window.confirm.mockReturnValue(false)
    await openSettings()
    fireEvent.click(await screen.findByText('TaikoEat'))
    fireEvent.click(await screen.findByRole('button', { name: /Loeschen/ }))
    expect(called('DELETE', '/api/tools/t1')).toBe(false)
  })
})

describe('Settings: Mitarbeiter', () => {
  const openStaff = async () => {
    await openSettings()
    fireEvent.click(screen.getByRole('button', { name: /Mitarbeiter/ }))
    await screen.findByText('Marina')
  }
  it('legt Mitarbeiter per Email an', async () => {
    mockApi(BASE)
    await openStaff()
    fireEvent.change(screen.getByPlaceholderText('email@taikonauten.com'), { target: { value: 'neu@x.dev' } })
    fireEvent.click(screen.getByRole('button', { name: /Hinzufuegen/ }))
    await waitFor(() => expect(called('POST', '/api/users')).toBe(true))
  })
  it('entfernt Mitarbeiter mit Confirm, meldet Owner-Block per Alert', async () => {
    mockApi([...BASE.filter((r) => !(r.m === 'DELETE' && r.p === '/api/users')),
             { m: 'DELETE', p: '/api/users', status: 400, body: { error: 'owns tools' } }])
    await openStaff()
    fireEvent.click(screen.getAllByTitle('Entfernen')[1]) // [0] = eigene Zeile (invisible)
    await waitFor(() => expect(called('DELETE', '/api/users/2')).toBe(true))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Nicht entfernbar')))
  })
  it('setzt App-Zugriffe per PUT', async () => {
    mockApi(BASE)
    await openStaff()
    fireEvent.click(screen.getAllByRole('button', { name: 'Zugriffe' })[1]) // Marinas Zeile
    await screen.findByText('Freigegebene Apps')
    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(called('PUT', '/api/users/2/access')).toBe(true))
    expect(calls.find((c) => c.method === 'PUT').body).toEqual({ toolIds: [] })
  })
})
