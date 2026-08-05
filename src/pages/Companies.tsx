import { Plus, MoreVertical, TrendingUp, Users, Target, Zap } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

export default function Companies() {
  const { companies, setSelectedCompanyId, setActivePage } = useApp()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{companies.length} empresas cadastradas</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((company) => {
          const totalSpend = company.campaigns.reduce((s, c) => s + c.metrics.spend, 0)
          const totalConversions = company.campaigns.reduce((s, c) => s + c.metrics.conversions, 0)
          const avgRoas = company.campaigns.length > 0 ? company.campaigns.reduce((s, c) => s + c.metrics.roas, 0) / company.campaigns.length : 0
          const activeAgents = company.agents.filter(a => a.status !== 'idle').length
          const goalProgress = company.goals.length > 0
            ? Math.round(company.goals.reduce((s, g) => s + (g.currentValue / g.target) * 100, 0) / company.goals.length)
            : 0

          return (
            <div key={company.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {company.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <p className="text-xs text-gray-500">{company.industry}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${company.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {company.status === 'active' ? 'Ativa' : 'Pausada'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <TrendingUp size={12} />
                      <span className="text-xs">ROAS</span>
                    </div>
                    <p className={`text-lg font-bold ${avgRoas >= 4 ? 'text-green-600' : avgRoas >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>{avgRoas.toFixed(1)}x</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <Users size={12} />
                      <span className="text-xs">Conversoes</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{totalConversions.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <Target size={12} />
                      <span className="text-xs">Campanhas</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{company.campaigns.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <Zap size={12} />
                      <span className="text-xs">Agentes</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{activeAgents}/{company.agents.length}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Progresso das metas</span>
                    <span className="font-medium text-gray-900">{goalProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${goalProgress >= 80 ? 'bg-green-500' : goalProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(goalProgress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Investido: <span className="font-medium text-gray-900">R$ {totalSpend.toLocaleString('pt-BR')}</span></span>
                  <button
                    onClick={() => { setSelectedCompanyId(company.id); setActivePage('campaigns') }}
                    className="text-blue-600 font-medium hover:text-blue-700"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
