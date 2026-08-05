import { BarChart3, Target, Megaphone, TrendingUp, Zap, Settings, Brain, DollarSign } from 'lucide-react'

const menuItems = [
  { icon: BarChart3, label: 'Dashboard', active: true },
  { icon: Target, label: 'Campanhas' },
  { icon: Megaphone, label: 'Criativos' },
  { icon: TrendingUp, label: 'Performance' },
  { icon: DollarSign, label: 'ROI Tracker' },
  { icon: Zap, label: 'Automacoes' },
  { icon: Brain, label: 'IA Insights' },
  { icon: Settings, label: 'Configuracoes' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-950 text-white min-h-screen p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-lg">
          D10
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Meta D10 AI</h1>
          <p className="text-xs text-gray-400">Gestor de Trafego IA</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              item.active
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
        <p className="text-xs text-blue-300 font-medium">IA Ativa</p>
        <p className="text-xs text-gray-400 mt-1">Otimizando 12 campanhas</p>
      </div>
    </aside>
  )
}
