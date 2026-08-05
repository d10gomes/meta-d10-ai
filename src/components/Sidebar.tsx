import { BarChart3, Target, Megaphone, TrendingUp, Zap, Settings, Brain, DollarSign, Building2, Users, MessageCircle, Filter } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

const menuItems = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'companies', icon: Building2, label: 'Empresas' },
  { id: 'campaigns', icon: Target, label: 'Campanhas' },
  { id: 'agents', icon: Users, label: 'Agentes IA' },
  { id: 'creatives', icon: Megaphone, label: 'Criativos' },
  { id: 'performance', icon: TrendingUp, label: 'Performance' },
  { id: 'roi', icon: DollarSign, label: 'ROI Tracker' },
  { id: 'funnel', icon: Filter, label: 'Funis' },
  { id: 'automations', icon: Zap, label: 'Automacoes' },
  { id: 'insights', icon: Brain, label: 'IA Insights' },
  { id: 'communication', icon: MessageCircle, label: 'Central de Msgs' },
  { id: 'settings', icon: Settings, label: 'Configuracoes' },
]

export default function Sidebar() {
  const { activePage, setActivePage, activeAgents, companies } = useApp()

  return (
    <aside className="w-64 bg-gray-950 text-white min-h-screen p-4 flex flex-col flex-shrink-0">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-lg">
          D10
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Meta D10 AI</h1>
          <p className="text-xs text-gray-400">Gestor de Trafego IA</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
              activePage === item.id
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-3">
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Empresas ativas</span>
            <span className="text-white font-bold">{companies.filter(c => c.status === 'active').length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Agentes ativos</span>
            <span className="text-green-400 font-bold">{activeAgents}</span>
          </div>
        </div>

        <div className="p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <p className="text-xs text-blue-300 font-medium">Orquestra IA Ativa</p>
          </div>
          <p className="text-xs text-gray-400 mt-1">Otimizando {companies.reduce((s, c) => s + c.campaigns.length, 0)} campanhas</p>
        </div>
      </div>
    </aside>
  )
}
