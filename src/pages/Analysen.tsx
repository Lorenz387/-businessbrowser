import { useState } from 'react'
import { TrendingUp, Users, Eye, Heart, Download } from 'lucide-react'

const periods = ['7 Tage', '30 Tage', '90 Tage', '1 Jahr']

const barData: Record<string, number[]> = {
  '7 Tage': [45, 62, 38, 71, 55, 89, 66],
  '30 Tage': [120, 145, 98, 167, 134, 189, 156, 143, 178, 162, 201, 188, 176, 195, 167, 212, 198, 223, 209, 245, 231, 256, 242, 268, 254, 279, 265, 290, 276, 301],
  '90 Tage': [800, 950, 1100, 1050, 1200, 1350, 1300, 1450, 1600, 1550, 1700, 1850],
  '1 Jahr': [3200, 3800, 4200, 3900, 4500, 4800, 5100, 4900, 5400, 5700, 6000, 6500],
}

const platforms = [
  { name: 'Instagram', value: 67, color: 'bg-pink-500' },
  { name: 'TikTok', value: 45, color: 'bg-gray-800' },
  { name: 'YouTube', value: 23, color: 'bg-red-500' },
  { name: 'LinkedIn', value: 18, color: 'bg-blue-600' },
]

const topContent = [
  { title: 'KI-Workflow Tutorial', platform: 'YouTube', views: '24.5K', engagement: '8.2%' },
  { title: 'Business Hack #47', platform: 'Instagram', views: '18.3K', engagement: '6.9%' },
  { title: 'Produktivität 2026', platform: 'TikTok', views: '31.2K', engagement: '12.4%' },
  { title: 'LifeOS Review', platform: 'YouTube', views: '9.8K', engagement: '5.1%' },
]

function LineChart({ data }: { data: number[] }) {
  const w = 600, h = 160, pad = 20
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / range) * (h - pad * 2),
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${path} L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path d={path} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => i % Math.ceil(data.length / 6) === 0 && (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#7c3aed" stroke="white" strokeWidth="2" />
      ))}
    </svg>
  )
}

export default function Analysen() {
  const [period, setPeriod] = useState('30 Tage')
  const [chartType, setChartType] = useState<'bar' | 'line'>('line')
  const data = barData[period]
  const maxVal = Math.max(...data)

  const kpis = [
    { label: 'Reichweite', value: '124.5K', change: '+18%', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Follower', value: '8,234', change: '+5.2%', icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Engagement', value: '4.8%', change: '+0.9%', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
    { label: 'Wachstum', value: '+234', change: '+12%', icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analysen</h1>
          <p className="text-slate-500 text-sm mt-1">Deine Performance im Überblick</p>
        </div>
        <div className="flex gap-2">
          {periods.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${period === p ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
              {p}
            </button>
          ))}
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-violet-300">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-9 h-9 ${kpi.bg} rounded-lg flex items-center justify-center mb-3`}>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{kpi.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{kpi.label}</div>
            <div className="text-xs text-green-600 mt-1">{kpi.change} vs. Vorperiode</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Reichweite</h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(['line', 'bar'] as const).map(t => (
              <button key={t} onClick={() => setChartType(t)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all ${chartType === t ? 'bg-white shadow-sm text-violet-600 font-medium' : 'text-slate-400'}`}>
                {t === 'line' ? 'Linie' : 'Balken'}
              </button>
            ))}
          </div>
        </div>
        {chartType === 'line' ? (
          <LineChart data={data} />
        ) : (
          <div className="flex items-end gap-1 h-40">
            {data.map((val, i) => (
              <div key={i} className="flex-1 bg-violet-500 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ height: `${(val / maxVal) * 100}%` }} title={val.toString()} />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Plattform Aufschlüsselung</h3>
          <div className="space-y-4">
            {platforms.map(p => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-700">{p.name}</span>
                  <span className="text-sm font-medium text-slate-800">{p.value}K</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${p.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(p.value / 100) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Top Content</h3>
          <div className="space-y-3">
            {topContent.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.platform}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{item.views}</p>
                  <p className="text-xs text-green-600">{item.engagement} ER</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
