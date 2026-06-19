import { useState } from 'react'
import { Bell, Shield, Palette, Globe, Key, Trash2, Save } from 'lucide-react'

const sections = [
  { id: 'profil', label: 'Profil', icon: '👤' },
  { id: 'benachrichtigungen', label: 'Benachrichtigungen', icon: '🔔' },
  { id: 'datenschutz', label: 'Datenschutz', icon: '🔒' },
  { id: 'erscheinungsbild', label: 'Erscheinungsbild', icon: '🎨' },
  { id: 'sprache', label: 'Sprache & Region', icon: '🌐' },
  { id: 'api', label: 'API & Integrationen', icon: '🔑' },
]

export default function Einstellungen() {
  const [active, setActive] = useState('profil')
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('Lorenz P.')
  const [email, setEmail] = useState('lorenzpannicke14@gmail.com')
  const [notifs, setNotifs] = useState({ email: true, push: true, weekly: false, activity: true })
  const [theme, setTheme] = useState('light')
  const [lang, setLang] = useState('de')

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Einstellungen</h1>
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${active === s.id ? 'bg-violet-50 text-violet-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          {active === 'profil' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800">Profil-Einstellungen</h2>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">E-Mail</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Neues Passwort</label>
                <input type="password" placeholder="Mindestens 8 Zeichen..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
                  <Trash2 size={14} /> Konto löschen
                </button>
              </div>
            </div>
          )}

          {active === 'benachrichtigungen' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800">Benachrichtigungen</h2>
              {[
                { key: 'email', label: 'E-Mail Benachrichtigungen', desc: 'Erhalte wichtige Meldungen per E-Mail' },
                { key: 'push', label: 'Push Benachrichtigungen', desc: 'Browser-Benachrichtigungen aktivieren' },
                { key: 'weekly', label: 'Wöchentlicher Report', desc: 'Zusammenfassung jede Woche' },
                { key: 'activity', label: 'Aktivitäts-Feed', desc: 'Benachrichtigung bei neuen Aktivitäten' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className={`w-11 h-6 rounded-full transition-all ${notifs[key as keyof typeof notifs] ? 'bg-violet-600' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${notifs[key as keyof typeof notifs] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {active === 'erscheinungsbild' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800">Erscheinungsbild</h2>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-3">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ val: 'light', label: 'Hell', preview: 'bg-white border-2' }, { val: 'dark', label: 'Dunkel', preview: 'bg-slate-900' }, { val: 'auto', label: 'Automatisch', preview: 'bg-gradient-to-r from-white to-slate-900' }].map(t => (
                    <button key={t.val} onClick={() => setTheme(t.val)}
                      className={`rounded-xl overflow-hidden border-2 transition-all ${theme === t.val ? 'border-violet-500' : 'border-slate-200'}`}>
                      <div className={`h-16 ${t.preview}`} />
                      <div className="bg-white py-1.5 text-xs font-medium text-center text-slate-600">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'sprache' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800">Sprache & Region</h2>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Sprache</label>
                <select value={lang} onChange={e => setLang(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Zeitzone</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option>Europe/Berlin (UTC+2)</option>
                  <option>Europe/London (UTC+1)</option>
                  <option>America/New_York (UTC-4)</option>
                </select>
              </div>
            </div>
          )}

          {active === 'api' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-slate-800">API & Integrationen</h2>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">API-Schlüssel</p>
                <div className="flex gap-2">
                  <input readOnly value="sk-lifeosai-••••••••••••••••••••••••" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-mono" />
                  <button className="bg-violet-600 text-white text-xs px-3 rounded-lg">Kopieren</button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Teile diesen Schlüssel nicht mit anderen.</p>
              </div>
              <button className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700">
                <Key size={14} /> Neuen Schlüssel generieren
              </button>
            </div>
          )}

          {active === 'datenschutz' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800">Datenschutz</h2>
              {[
                { label: 'Profil öffentlich', desc: 'Jeder kann dein Profil sehen' },
                { label: 'KI-Training deaktivieren', desc: 'Deine Daten werden nicht für Training verwendet' },
                { label: 'Analytics teilen', desc: 'Anonyme Nutzungsdaten teilen' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <ToggleSwitch />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button onClick={save}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${saved ? 'bg-green-100 text-green-700' : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-90'}`}>
              <Save size={15} /> {saved ? 'Gespeichert!' : 'Änderungen speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch() {
  const [on, setOn] = useState(false)
  return (
    <button onClick={() => setOn(!on)}
      className={`w-11 h-6 rounded-full transition-all ${on ? 'bg-violet-600' : 'bg-slate-200'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}
