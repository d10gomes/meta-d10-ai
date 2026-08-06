import { Crown, MessageCircle, ShoppingCart, ExternalLink, UserPlus, Smartphone, Eye, Heart, Filter, Palette, Users, DollarSign, PenTool, BarChart3, ArrowRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { AGENT_ROLES, type AgentRole } from '../types/company'

const iconMap: Record<string, React.ElementType> = {
  Crown, MessageCircle, ShoppingCart, ExternalLink, UserPlus, Smartphone,
  Eye, Heart, Filter, Palette, Users, DollarSign, PenTool, BarChart3,
}

export default function Agents() {
  const { companies, selectedCompanyId, messages } = useApp()

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const allAgents = filteredCompanies.flatMap((c) =>
    c.agents.map((a) => ({ ...a, companyName: c.name, companyId: c.id }))
  )

  const roleGroups = allAgents.reduce((acc, agent) => {
    if (!acc[agent.type]) acc[agent.type] = []
    acc[agent.type].push(agent)
    return acc
  }, {} as Record<AgentRole, typeof allAgents>)

  const statusColors = {
    active: 'bg-green-500',
    working: 'bg-blue-500 animate-pulse',
    idle: 'bg-gray-400',
    alert: 'bg-red-500 animate-pulse',
  }

  const statusLabels = {
    active: 'Ativo',
    working: 'Trabalhando',
    idle: 'Inativo',
    alert: 'Alerta',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total de Agentes</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{allAgents.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Trabalhando Agora</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{allAgents.filter(a => a.status === 'working').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Acoes Hoje</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{allAgents.reduce((s, a) => s + a.actionsToday, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Performance Media</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{Math.round(allAgents.reduce((s, a) => s + a.performance, 0) / allAgents.length)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-2">Comunicacao entre Agentes</h3>
        <p className="text-sm text-gray-500 mb-4">Ultimas mensagens trocadas na orquestra</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {messages.slice(-4).map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                msg.priority === 'critical' ? 'bg-red-100 text-red-700' :
                msg.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>{msg.priority}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{msg.from}</span>
                  <ArrowRight size={10} />
                  <span className="font-medium text-gray-700">{msg.to}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{msg.subject}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(roleGroups).map(([role, agents]) => {
          const config = AGENT_ROLES[role as AgentRole]
          if (!config) return null
          const Icon = iconMap[config.icon] || Users

          return (
            <div key={role} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${config.color} text-white`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{config.name}</h3>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[agent.status]}`}></span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{agent.companyName}</p>
                        <p className="text-xs text-gray-500 truncate">{agent.lastAction}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-gray-900">{agent.performance}%</p>
                      <p className="text-xs text-gray-500">{agent.actionsToday} acoes</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1">
                {config.capabilities.slice(0, 3).map((cap) => (
                  <span key={cap} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cap}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
