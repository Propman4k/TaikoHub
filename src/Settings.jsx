// Eigenstaendige Einstellungsseite mit Seiten-Navigation (Apps/Opener/Mitarbeiter).
import { useCallback, useState } from 'react'
import { ArrowLeft, LayoutGrid, Users, MonitorSmartphone, Download, Check, Loader2 } from 'lucide-react'
import { AppsAdmin } from './AppsAdmin.jsx'
import { StaffAdmin } from './StaffAdmin.jsx'

export function SettingsPage({ me, onBack }) {
  const NAV = [
    ...(me.isAdmin ? [{ id: 'apps', label: 'Apps', icon: LayoutGrid }] : []),
    { id: 'opener', label: 'TaikoHub Opener', icon: MonitorSmartphone },
    ...(me.isAdmin ? [{ id: 'staff', label: 'Mitarbeiter', icon: Users }] : []),
  ]
  const [section, setSection] = useState(NAV[0].id)

  return (
    <div className="h-screen overflow-hidden bg-surface-raised flex border-t border-border">
      {/* Sidebar buendig am linken Rand, volle Hoehe */}
      <nav className="w-56 flex-shrink-0 bg-surface border-r border-border h-full flex flex-col">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-border">
          <button onClick={onBack} title="Zurueck"
                  className="p-2 -ml-2 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-md transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Einstellungen</h1>
        </div>
        <div className="p-3 flex flex-col gap-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-left transition-colors ${
                      section === n.id ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-100'}`}>
              <n.icon size={17} /> {n.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto">
        {section === 'apps' && <AppsAdmin meId={me.id} />}
        {section === 'opener' && <OpenerSection />}
        {section === 'staff' && <StaffAdmin meId={me.id} />}
      </main>
    </div>
  )
}

// Sektion: TaikoHub Opener (Download + Schema-Test).
function OpenerSection() {
  const [test, setTest] = useState('idle') // idle | testing | ok | fail
  const runTest = useCallback(() => {
    setTest('testing')
    let seen = false
    const cancel = () => { seen = true }
    window.addEventListener('blur', cancel, { once: true })
    document.addEventListener('visibilitychange', cancel, { once: true })
    const w = window.open('taikohub://open?name=Finder', '_blank')
    setTimeout(() => {
      try { w && w.close() } catch { /* egal */ }
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
      setTest(seen ? 'ok' : 'fail')
    }, 1500)
  }, [])

  return (
    <section className="bg-surface rounded-[10px] shadow-card border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10 text-brand">
          <MonitorSmartphone size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold leading-tight">TaikoHub Opener</h2>
          <p className="text-sm text-text-muted">Oeffnet Tools als installierte App statt im Browser.</p>
        </div>
        {test === 'ok'
          ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-3 py-1"><Check size={13} /> Aktiv</span>
          : test === 'fail'
            ? <span className="text-xs font-semibold text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-3 py-1">Nicht erkannt</span>
            : test === 'testing'
              ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-3 py-1"><Loader2 size={13} className="animate-spin" /> Teste</span>
              : null}
      </div>
      <div className="px-6 py-5 flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Einmal installieren, dann oeffnen die Kacheln die als App installierten Tools direkt.
          Ohne den Opener oeffnen sie sich in einem Browser-Fenster.
        </p>
        <div className="flex items-center gap-2">
          <a href="/TaikoHub-Opener.zip" download
             className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-[6px] text-sm font-semibold hover:bg-brand-hover transition-colors">
            <Download size={18} /> Opener herunterladen
          </a>
          <button onClick={runTest}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">
            Verbindung testen
          </button>
        </div>
        <ol className="text-sm text-text-muted list-decimal list-inside space-y-1.5">
          <li>Datei herunterladen und im Downloads-Ordner <span className="font-medium text-text">doppelklicken</span>.</li>
          <li>Auf <span className="font-medium text-text">TaikoHub Opener</span> rechtsklicken &rarr; <span className="font-medium text-text">Oeffnen</span> &rarr; nochmal <span className="font-medium text-text">Oeffnen</span>.</li>
          <li>Hier auf <span className="font-medium text-text">Verbindung testen</span> &mdash; wird's gruen, ist alles bereit.</li>
        </ol>
      </div>
    </section>
  )
}
