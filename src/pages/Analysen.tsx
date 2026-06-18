import { useState } from 'react'
import { TrendingUp, Users, Eye, Heart } from 'lucide-react'

const periods = ['7 Tage', '30 Tage', '90 Tage', '1 Jahr']

const barData = {
  '7 Tage': [45, 62, 38, 71, 55, 89, 66],
  '30 Tage': [120, 145, 98, 167, 134, 189, 156, 143, 178, 162, 201, 188, 176, 195, 167, 212, 198, 223, 209, 245, 231, 256, 242, 268, 254, 279, 265, 290, 276, 301],
  '90 Tage': [800, 950, 1100, 1050, 1200, 1350, 1300, 1450, 1600, 1550, 1700, 1850],
  '1 Jahr': [3200, 3800, 4200, 3900, 4500, 4800, 5100, 4900, 5400, 5700, 6000, 6500],
}

const platforms = [
  { name: 'Instagram', value: 67, color: 'bg-pink-500' },
  { name: 'TikTok', value: 45, color: 'bg-gray-800' },
  { name: 'YouTube', value: 23, color: 'bg-red-500' },
]

export default function Analysen() {
  const [period, setPeriod] = useState('30 Tage')
  const data = barData[period as keyof typeof barData]
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
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${period === p ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}
            >
              {p}
            </button>
          ))}
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
        <h3 className="font-semibold text-slate-800 mb-4">Reichweite</h3>
        <div className="flex items-end gap-1 h-40">
          {data.map((val, i) => (
            <div
              key={i}
              className="flex-1 bg-violet-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
              style={{ height: `${(val / maxVal) * 100}%` }}
              title={val.toString()}
            />
          ))}
        </div>
      </div>

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
                <div
                  className={`h-full ${p.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(p.value / 100) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
