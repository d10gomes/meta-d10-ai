import { DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApp } from '../contexts/AppContext'

export default function ROITracker() {
  const { companies, selectedCompanyId } = useApp()

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const roiData = filteredCompanies.map(c => {
    const totalSpend = c.campaigns.reduce((s, camp) => s + camp.metrics.spend, 0)
    const avgRoas = c.campaigns.length > 0 ? c.campaigns.reduce((s, camp) => s + camp.metrics.roas, 0) / c.campaigns.length : 0
    const totalRevenue = totalSpend * avgRoas
    const profit = totalRevenue - totalSpend
    return {
      name: c.name.split(' ').slice(0, 2).join(' '),
      investido: totalSpend,
      retorno: Math.round(totalRevenue),
      lucro: Math.round(profit),
      roas: avgRoas,
    }
  })

  const totalInvested = roiData.reduce((s, d) => s + d.investido, 0)
  const totalReturn = roiData.reduce((s, d) => s + d.retorno, 0)
  const totalProfit = totalReturn - totalInvested
  const overallROAS = totalInvested > 0 ? totalReturn / totalInvested : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><DollarSign size={16} /><span className="text-sm">Total Investido</span></div>
          <p className="text-2xl font-bold text-gray-900">R$ {totalInvested.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><TrendingUp size={16} /><span className="text-sm">Retorno Total</span></div>
          <p className="text-2xl font-bold text-green-600">R$ {totalReturn.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><ArrowUpRight size={16} /><span className="text-sm">Lucro Liquido</span></div>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {totalProfit.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><DollarSign size={16} /><span className="text-sm">ROAS Geral</span></div>
          <p className={`text-2xl font-bold ${overallROAS >= 4 ? 'text-green-600' : 'text-yellow-600'}`}>{overallROAS.toFixed(1)}x</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-1">ROI por Empresa</h3>
        <p className="text-sm text-gray-500 mb-4">Investimento vs Retorno</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={roiData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']} />
            <Bar dataKey="investido" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Investido" />
            <Bar dataKey="retorno" fill="#22c55e" radius={[8, 8, 0, 0]} name="Retorno" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Detalhamento por Empresa</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {roiData.map((d) => (
            <div key={d.name} className="p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{d.name}</p>
                <p className="text-sm text-gray-500">ROAS: <span className={`font-bold ${d.roas >= 4 ? 'text-green-600' : 'text-yellow-600'}`}>{d.roas.toFixed(1)}x</span></p>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div className="text-right">
                  <p className="text-gray-500">Investido</p>
                  <p className="font-medium text-gray-900">R$ {d.investido.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Retorno</p>
                  <p className="font-medium text-green-600">R$ {d.retorno.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Lucro</p>
                  <p className={`font-bold ${d.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {d.lucro >= 0 ? '+' : ''}R$ {d.lucro.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
