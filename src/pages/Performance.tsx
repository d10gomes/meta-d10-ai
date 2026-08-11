import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, DollarSign, MousePointerClick, Eye, Target } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

type Period = '7d' | '14d' | '30d' | 'all'

export default function Performance() {
  const { companies, selectedCompanyId } = useApp()
  const [period, setPeriod] = useState<Period>('30d')
  const [activeChart, setActiveChart] = useState<'spend' | 'cpl' | 'roas' | 'ctr'>('spend')

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const kpis = useMemo(() => {
    let totalSpend = 0, totalClicks = 0, totalImpressions = 0,
      totalConversions = 0, totalRevenue = 0, totalReach = 0

    for (const c of filteredCompanies) {
      for (const camp of c.campaigns) {
        totalSpend += camp.metrics.spend
        totalClicks += camp.metrics.clicks
        totalImpressions += camp.metrics.impressions
        totalConversions += camp.metrics.conversions
        totalReach += camp.metrics.reach
        totalRevenue += camp.metrics.roas * camp.metrics.spend
      }
    }

    return {
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      conversions: totalConversions,
      revenue: totalRevenue,
      reach: totalReach,
      cpl: totalConversions > 0 ? totalSpend / totalConversions : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    }
  }, [filteredCompanies])

  const companyPerf = useMemo(() => {
    return filteredCompanies.map((c) => {
      const totalSpend = c.campaigns.reduce((s, camp) => s + camp.metrics.spend, 0)
      const totalConversions = c.campaigns.reduce((s, camp) => s + camp.metrics.conversions, 0)
      const totalClicks = c.campaigns.reduce((s, camp) => s + camp.metrics.clicks, 0)
      const totalImpressions = c.campaigns.reduce((s, camp) => s + camp.metrics.impressions, 0)
      const totalRevenue = c.campaigns.reduce((s, camp) => s + camp.metrics.roas * camp.metrics.spend, 0)

      return {
        name: c.name.length > 18 ? c.name.split(' ').slice(0, 2).join(' ') : c.name,
        fullName: c.name,
        cpl: totalConversions > 0 ? totalSpend / totalConversions : 0,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        spend: totalSpend,
        conversions: totalConversions,
        campaigns: c.campaigns.length,
        activeCampaigns: c.campaigns.filter(camp => camp.status === 'ACTIVE').length,
      }
    }).filter(c => c.spend > 0 || c.conversions > 0 || c.campaigns > 0)
      .sort((a, b) => b.spend - a.spend)
  }, [filteredCompanies])

  const topCampaigns = useMemo(() => {
    const all: Array<{ name: string; company: string; spend: number; conversions: number; ctr: number; roas: number; status: string }> = []
    for (const c of filteredCompanies) {
      for (const camp of c.campaigns) {
        if (camp.metrics.spend > 0) {
          all.push({
            name: camp.name.length > 30 ? camp.name.substring(0, 30) + '...' : camp.name,
            company: c.name.split(' ').slice(0, 2).join(' '),
            spend: camp.metrics.spend,
            conversions: camp.metrics.conversions,
            ctr: camp.metrics.ctr,
            roas: camp.metrics.roas,
            status: camp.status,
          })
        }
      }
    }
    return all.sort((a, b) => b.spend - a.spend).slice(0, 10)
  }, [filteredCompanies])

  const objectiveBreakdown = useMemo(() => {
    const byObj: Record<string, { count: number; spend: number; conversions: number }> = {}
    for (const c of filteredCompanies) {
      for (const camp of c.campaigns) {
        const obj = camp.objective || 'OTHER'
        if (!byObj[obj]) byObj[obj] = { count: 0, spend: 0, conversions: 0 }
        byObj[obj].count++
        byObj[obj].spend += camp.metrics.spend
        byObj[obj].conversions += camp.metrics.conversions
      }
    }
    return Object.entries(byObj)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [filteredCompanies])

  const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  const chartData = useMemo(() => {
    return companyPerf.slice(0, 10).map(c => ({
      name: c.name,
      spend: Number(c.spend.toFixed(2)),
      cpl: Number(c.cpl.toFixed(2)),
      roas: Number(c.roas.toFixed(2)),
      ctr: Number(c.ctr.toFixed(2)),
    }))
  }, [companyPerf])

  const chartConfig: Record<string, { label: string; color: string; formatter: (v: number) => string }> = {
    spend: { label: 'Investimento', color: '#3b82f6', formatter: (v) => `R$ ${v.toLocaleString('pt-BR')}` },
    cpl: { label: 'CPL', color: '#f59e0b', formatter: (v) => `R$ ${v.toFixed(2)}` },
    roas: { label: 'ROAS', color: '#22c55e', formatter: (v) => `${v.toFixed(2)}x` },
    ctr: { label: 'CTR', color: '#8b5cf6', formatter: (v) => `${v.toFixed(1)}%` },
  }

  const cfg = chartConfig[activeChart]

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        {([['7d', '7 dias'], ['14d', '14 dias'], ['30d', '30 dias'], ['all', 'Tudo']] as [Period, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="Investido" value={`R$ ${kpis.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} color="blue" />
        <KpiCard icon={Target} label="Conversoes" value={kpis.conversions.toLocaleString('pt-BR')} color="green" />
        <KpiCard icon={TrendingUp} label="ROAS" value={`${kpis.roas.toFixed(1)}x`} color={kpis.roas >= 2 ? 'green' : kpis.roas >= 1 ? 'yellow' : 'red'} />
        <KpiCard icon={MousePointerClick} label="CTR" value={`${kpis.ctr.toFixed(1)}%`} color={kpis.ctr >= 2 ? 'green' : 'yellow'} />
        <KpiCard icon={DollarSign} label="CPL" value={`R$ ${kpis.cpl.toFixed(2)}`} color="orange" />
        <KpiCard icon={Eye} label="Impressoes" value={kpis.impressions > 1000000 ? `${(kpis.impressions / 1000000).toFixed(1)}M` : kpis.impressions > 1000 ? `${(kpis.impressions / 1000).toFixed(0)}K` : String(kpis.impressions)} color="purple" />
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Comparativo por Empresa</h3>
            <p className="text-sm text-gray-500">Selecione a metrica para visualizar</p>
          </div>
          <div className="flex gap-1">
            {Object.entries(chartConfig).map(([key, c]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveChart(key as typeof activeChart)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeChart === key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={cfg.formatter} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                formatter={(value: number) => [cfg.formatter(value), cfg.label]}
              />
              <Bar dataKey={activeChart} fill={cfg.color} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            <p>Sem dados de investimento para exibir</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objective Breakdown Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Campanhas por Objetivo</h3>
          <p className="text-sm text-gray-500 mb-4">Distribuicao de {filteredCompanies.reduce((s, c) => s + c.campaigns.length, 0)} campanhas</p>
          {objectiveBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={objectiveBreakdown}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {objectiveBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} campanhas`, 'Total']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">Sem dados</div>
          )}
        </div>

        {/* Spend vs Revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Investimento vs Retorno</h3>
          <p className="text-sm text-gray-500 mb-4">Comparacao entre gasto e receita por empresa</p>
          {companyPerf.filter(c => c.spend > 0).length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={companyPerf.filter(c => c.spend > 0).slice(0, 8)} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, '']} />
                <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Investido" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">Sem dados de investimento</div>
          )}
        </div>
      </div>

      {/* Top Campaigns Table */}
      {topCampaigns.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Top 10 Campanhas por Investimento</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">#</th>
                  <th className="text-left px-5 py-3 font-medium">Campanha</th>
                  <th className="text-left px-5 py-3 font-medium">Empresa</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Investido</th>
                  <th className="text-right px-5 py-3 font-medium">Conv.</th>
                  <th className="text-right px-5 py-3 font-medium">CTR</th>
                  <th className="text-right px-5 py-3 font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c, i) => (
                  <tr key={`${c.name}-${i}`} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-bold text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{c.company}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.status === 'ACTIVE' ? 'Ativo' : c.status === 'PAUSED' ? 'Pausado' : c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">R$ {c.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{c.conversions}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{c.ctr.toFixed(1)}%</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-bold ${c.roas >= 4 ? 'text-green-600' : c.roas >= 2 ? 'text-yellow-600' : c.roas > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {c.roas > 0 ? `${c.roas.toFixed(1)}x` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Company Ranking */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Ranking de Empresas</h3>
          <p className="text-sm text-gray-500 mt-0.5">{companyPerf.length} empresas com campanhas</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-5 py-3 font-medium">Empresa</th>
                <th className="text-right px-5 py-3 font-medium">Campanhas</th>
                <th className="text-right px-5 py-3 font-medium">Investido</th>
                <th className="text-right px-5 py-3 font-medium">CPL</th>
                <th className="text-right px-5 py-3 font-medium">ROAS</th>
                <th className="text-right px-5 py-3 font-medium">CTR</th>
                <th className="text-right px-5 py-3 font-medium">Conversoes</th>
              </tr>
            </thead>
            <tbody>
              {companyPerf.map((c, i) => (
                <tr key={c.name} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{c.fullName}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">
                    <span className="text-green-600 font-medium">{c.activeCampaigns}</span>
                    <span className="text-gray-400">/{c.campaigns}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    {c.spend > 0 ? `R$ ${c.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-600">
                    {c.cpl > 0 ? `R$ ${c.cpl.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`font-bold ${c.roas >= 4 ? 'text-green-600' : c.roas >= 2 ? 'text-yellow-600' : c.roas > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {c.roas > 0 ? `${c.roas.toFixed(1)}x` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-600">
                    {c.ctr > 0 ? `${c.ctr.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{c.conversions || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon size={14} />
        </div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
