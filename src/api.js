// Zentrale JSON-Huelle: 401 = Session abgelaufen -> Reload laesst das Auth-Gate
// greifen (LoginPage) statt Fehler-JSON in .map()-Crashes laufen zu lassen.
const j = (r) => {
  if (r.status === 401) { window.location.reload(); throw new Error('unauthenticated') }
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

export const api = {
  me: () => fetch('/api/auth/me', { credentials: 'include' }),
  board: () => fetch('/api/board', { credentials: 'include' }).then(j),
  available: () => fetch('/api/available', { credentials: 'include' }).then(j),
  allTools: () => fetch('/api/tools', { credentials: 'include' }).then(j),
  users: () => fetch('/api/users', { credentials: 'include' }).then(j),
  createUser: (email) => fetch('/api/users', { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }),
  deleteUser: (id) => fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' }),
  userAccess: (id) => fetch(`/api/users/${id}/access`, { credentials: 'include' }).then(j),
  setUserAccess: (id, toolIds) => fetch(`/api/users/${id}/access`, { method: 'PUT', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolIds }) }),
  createTool: (d) => fetch('/api/tools', { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }),
  updateTool: (id, d) => fetch(`/api/tools/${id}`, { method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }),
  deleteTool: (id) => fetch(`/api/tools/${id}`, { method: 'DELETE', credentials: 'include' }),
  placement: (toolId, d) => fetch(`/api/placements/${toolId}`, { method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }),
}
