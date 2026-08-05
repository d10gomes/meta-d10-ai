import { Bell, Search, ChevronDown } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visao geral de todas as empresas' },
  companies: { title: 'Empresas', subtitle: 'Gerencie seus clientes' },
  campaigns: { title: 'Campanhas', subtitle: 'Todas as campanhas ativas' },
  agents: { title: 'Agentes IA', subtitle: 'Orquestra de agentes especialistas' },
  creatives: { title: 'Criativos', subtitle: 'Analise de performance de criativos' },
  performance: { title: 'Performance', subtitle: 'Metricas detalhadas' },
  roi: { title: 'ROI Tracker', subtitle: 'Retorno sobre investimento' },
  funnel: { title: 'Funis', subtitle: 'Estrategia de funil completo' },
  automations: { title: 'Automacoes', subtitle: 'Regras automaticas dos agentes' },
  insights: { title: 'IA Insights', subtitle: 'Analises e recomendacoes da IA' },
  communication: { title: 'Central de Mensagens', subtitle: 'Comunicacao entre agentes' },
  settings: { title: 'Configuracoes', subtitle: 'Ajustes da plataforma' },
}

export default function Header() {
  const { activePage, companies, selectedCompanyId, setSelectedCompanyId, messages } = useApp()
  const page = pageTitles[activePage] || { title: '', subtitle: '' }
  const unreadCount = messages.filter(m => !m.read).length

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{page.title}</h2>
        <p className="text-sm text-gray-500">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        <select
          value={selectedCompanyId || ''}
          onChange={(e) => setSelectedCompanyId(e.target.value || null)}
          className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todas as empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
          />
        </div>

        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
          DG
        </div>
      </div>
    </header>
  )
}
