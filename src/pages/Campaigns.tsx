import { Plus, Circle, MoreVertical, MessageCircle, ShoppingCart, ExternalLink, UserPlus, Smartphone, Eye, Heart, Filter } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import type { MetaObjective } from '../types/meta'

const objectiveIcons: Record<MetaObjective, React.ElementType> = {
  LEADS: MessageCircle, SALES: ShoppingCart, TRAFFIC: ExternalLink,
  REGISTRATION: UserPlus, APP_INSTALL: Smartphone, AWARENESS: Eye,
  ENGAGEMENT: Heart, FUNNEL: Filter,
}

const objectiveColors: Record<MetaObjective, string> = {
  LEADS: 'text-green-600 bg-green-50', SALES: 'text-blue-600 bg-blue-50',
  TRAFFIC: 'text-purple-600 bg-purple-50', REGISTRATION: 'text-indigo-600 bg-indigo-50',
  APP_INSTALL: 'text-cyan-600 bg-cyan-50', AWARENESS: 'text-orange-600 bg-orange-50',
  ENGAGEMENT: 'text-pink-600 bg-pink-50', FUNNEL: 'text-amber-600 bg-amber-50',
}

const objectiveLabels: Record<MetaObjective, string> = {
  LEADS: 'Leads', SALES: 'Vendas', TRAFFIC: 'Trafego', REGISTRATION: 'Cadastros',
  APP_INSTALL: 'Apps', AWARENESS: 'Awareness', ENGAGEMENT: 'Engajamento', FUNNEL: 'Funil',
}

export default function Campaigns() {
  const { companies, selectedCompanyId } = useApp()

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const allCampaigns = filteredCompanies.flatMap(c =>
    c.campaigns.map(camp => ({ ...camp, companyName: c.name }))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{allCampaigns.length} campanhas {selectedCompanyId ? '' : 'em todas as empresas'}</p>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          Nova Campanha
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['LEADS', 'SALES', 'TRAFFIC', 'REGISTRATION', 'ENGAGEMENT', 'AWARENESS', 'FUNNEL', 'APP_INSTALL'] as MetaObjective[]).map((obj) => {
          const Icon = objectiveIcons[obj]
          const count = allCampaigns.filter(c => c.objective === obj).length
          if (count === 0) return null
          return (
            <span key={obj} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${objectiveColors[obj]}`}>
              <Icon size={12} />
              {objectiveLabels[obj]} ({count})
            </span>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-medium">Campanha</th>
                <th className="text-left px-5 py-3.5 font-medium">Empresa</th>
                <th className="text-left px-5 py-3.5 font-medium">Objetivo</th>
                <th className="text-left px-5 py-3.5 font-medium">Status</th>
                <th className="text-left px-5 py-3.5 font-medium">Orcamento</th>
                <th className="text-left px-5 py-3.5 font-medium">Investido</th>
                <th className="text-left px-5 py-3.5 font-medium">Conversoes</th>
                <th className="text-left px-5 py-3.5 font-medium">CPA</th>
                <th className="text-left px-5 py-3.5 font-medium">ROAS</th>
                <th className="text-left px-5 py-3.5 font-medium">CTR</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {allCampaigns.map((camp) => {
                const Icon = objectiveIcons[camp.objective]
                return (
                  <tr key={camp.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {camp.automationEnabled && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                        <span className="font-medium text-gray-900">{camp.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{camp.companyName}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${objectiveColors[camp.objective]}`}>
                        <Icon size={10} />
                        {objectiveLabels[camp.objective]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        camp.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                        camp.status === 'PAUSED' ? 'bg-gray-100 text-gray-500' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
                        <Circle size={6} fill="currentColor" />
                        {camp.status === 'ACTIVE' ? 'Ativa' : camp.status === 'PAUSED' ? 'Pausada' : camp.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">R$ {camp.budget}/dia</td>
                    <td className="px-5 py-3.5 text-gray-900 font-medium">R$ {camp.metrics.spend.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{camp.metrics.conversions.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3.5 text-gray-600">R$ {camp.metrics.costPerConversion.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`font-bold ${camp.metrics.roas >= 4 ? 'text-green-600' : camp.metrics.roas >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {camp.metrics.roas.toFixed(1)}x
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{camp.metrics.ctr.toFixed(1)}%</td>
                    <td className="px-5 py-3.5">
                      <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
