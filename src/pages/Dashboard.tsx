import { DollarSign, Users, MousePointerClick, TrendingUp, Building2, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import MetricCard from '../components/MetricCard'
import { useApp } from '../contexts/AppContext'

const weeklyData = [
  { dia: 'Seg', investido: 1250, retorno: 5250, leads: 82 },
  { dia: 'Ter', investido: 1380, retorno: 5870, leads: 98 },
  { dia: 'Qua', investido: 1290, retorno: 5200, leads: 85 },
  { dia: 'Qui', investido: 1500, retorno: 7100, leads: 112 },
  { dia: 'Sex', investido: 1420, retorno: 6800, leads: 105 },
  { dia: 'Sab', investido: 980, retorno: 3920, leads: 68 },
  { dia: 'Dom', investido: 850, retorno: 3400, leads: 55 },
]

const objectiveData = [
  { name: 'Leads', value: 35, color: '#22c55e' },
  { name: 'Vendas', value: 28, color: '#3b82f6' },
  { name: 'Trafego', value: 15, color: '#a855f7' },
  { name: 'Cadastros', value: 12, color: '#6366f1' },
  { name: 'Engajamento', value: 7, color: '#ec4899' },
  { name: 'Awareness', value: 3, color: '#f97316' },
]

export default function Dashboard() {
  const { companies, totalBudget, totalLeads, totalROAS, activeAgents, actions } = useApp()

  const recentActions = actions.slice(-5).reverse()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Investido no Mes" value={`R$ ${totalBudget.toLocaleString('pt-BR')}`} change={12} icon={DollarSign} color="bg-blue-500" />
        <MetricCard title="Leads Gerados" value={totalLeads.toLocaleString('pt-BR')} change={24} icon={Users} color="bg-green-500" />
        <MetricCard title="ROAS Medio" value={`${totalROAS.toFixed(1)}x`} change={8} icon={TrendingUp} color="bg-purple-500" />
        <MetricCard title="Agentes Ativos" value={activeAgents.toString()} change={0} icon={Zap} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Performance Geral</h3>
              <p className="text-sm text-gray-500 mt-0.5">Investimento vs Retorno — todas as empresas</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Investido</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>Retorno</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']} />
              <Area type="monotone" dataKey="investido" stroke="#3b82f6" strokeWidth={2} fill="url(#gInv)" name="Investido" />
              <Area type="monotone" dataKey="retorno" stroke="#22c55e" strokeWidth={2} fill="url(#gRet)" name="Retorno" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Distribuicao por Objetivo</h3>
          <p className="text-sm text-gray-500 mb-4">% do orcamento total</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={objectiveData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2} stroke="#fff">
                {objectiveData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {objectiveData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span className="text-gray-600">{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Empresas</h3>
          <div className="space-y-3">
            {companies.map((c) => {
              const totalSpend = c.campaigns.reduce((s, camp) => s + camp.metrics.spend, 0)
              const avgRoas = c.campaigns.length > 0 ? c.campaigns.reduce((s, camp) => s + camp.metrics.roas, 0) / c.campaigns.length : 0
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xs">
                      {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.industry} — {c.campaigns.length} campanhas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">R$ {totalSpend.toLocaleString('pt-BR')}</p>
                    <p className={`text-xs font-medium ${avgRoas >= 4 ? 'text-green-600' : avgRoas >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>ROAS {avgRoas.toFixed(1)}x</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Acoes Recentes dos Agentes</h3>
          <div className="space-y-3">
            {recentActions.map((a) => (
              <div key={a.id} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.status === 'completed' ? 'bg-green-500' : a.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-900">{a.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-blue-600 font-medium">{a.agentRole}</span>
                    {a.impact && (
                      <span className={`text-xs font-medium ${a.impact.changePercent < 0 ? 'text-green-600' : 'text-green-600'}`}>
                        {a.impact.metric}: {a.impact.changePercent > 0 ? '+' : ''}{a.impact.changePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
