import { Bell, Search, ChevronDown, LogOut } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  companies: 'Empresas',
  campaigns: 'Campanhas',
  agents: 'Agentes IA',
  creatives: 'Criativos',
  performance: 'Performance',
  roi: 'ROI Tracker',
  funnel: 'Funis',
  automations: 'Automacoes',
  insights: 'IA Insights',
  communication: 'Central de Mensagens',
  settings: 'Configuracoes',
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }
  if (email) return email.substring(0, 2).toUpperCase()
  return '??'
}

export default function Header() {
  const { activePage, companies, selectedCompanyId, setSelectedCompanyId, messages } = useApp()
  const { user, signOut } = useAuth()
  const title = pageTitles[activePage] || ''
  const selectedCompany = companies.find(c => c.id === selectedCompanyId)
  const subtitle = selectedCompany ? selectedCompany.name : 'Todas as empresas'
  const unreadCount = messages.filter(m => !m.read).length

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const initials = getInitials(user?.user_metadata?.full_name, user?.email)

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <select
            value={selectedCompanyId || ''}
            onChange={(e) => setSelectedCompanyId(e.target.value || null)}
            className={`text-sm border rounded-xl pl-3 pr-8 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer ${
              selectedCompanyId
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <option value="">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>

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

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{userName}</p>
            <p className="text-xs text-gray-500 leading-tight">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
