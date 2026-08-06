import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'

interface DailyMetric {
  dia: string
  cpl: number
  cpc: number
  ctr: number
  roas: number
  spend: number
}

export default function Performance() {
  const { companies } = useApp()
  const [dailyData, setDailyData] = useState<DailyMetric[]>([])

  useEffect(() => {
    loadDailyMetrics()
  }, [])

  const loadDailyMetrics = async () => {
    const { data } = await supabase
      .from('campaign_metrics')
      .select('date, spend, clicks, impressions, conversions, revenue, ctr, cpc')
      .order('date', { ascending: true })

    if (!data || data.length === 0) return

    const byDate: Record<string, { spend: number; clicks: number; impressions: number; conversions: number; revenue: number }> = {}
    for (const row of data) {
      const d = row.date as string
      if (!byDate[d]) byDate[d] = { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }
      byDate[d].spend += Number(row.spend) || 0
      byDate[d].clicks += Number(row.clicks) || 0
      byDate[d].impressions += Number(row.impressions) || 0
      byDate[d].conversions += Number(row.conversions) || 0
      byDate[d].revenue += Number(row.revenue) || 0
    }

    const result = Object.entries(byDate).map(([date, m]) => ({
      dia: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      cpl: m.conversions > 0 ? m.spend / m.conversions : 0,
      cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      roas: m.spend > 0 ? m.revenue / m.spend : 0,
      spend: m.spend,
    }))

    setDailyData(result)
  }

  const companyPerf = companies.map((c) => {
    const totalSpend = c.campaigns.reduce((s, camp) => s + camp.metrics.spend, 0)
    const totalConversions = c.campaigns.reduce((s, camp) => s + camp.metrics.conversions, 0)
    const totalClicks = c.campaigns.reduce((s, camp) => s + camp.metrics.clicks, 0)
    const totalImpressions = c.campaigns.reduce((s, camp) => s + camp.metrics.impressions, 0)
    const totalRevenue = c.campaigns.reduce((s, camp) => {
      const rev = camp.metrics.roas * camp.metrics.spend
      return s + rev
    }, 0)

    return {
      name: c.name.length > 15 ? c.name.split(' ').slice(0, 2).join(' ') : c.name,
      cpl: totalConversions > 0 ? totalSpend / totalConversions : 0,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      spend: totalSpend,
      conversions: totalConversions,
    }
  }).sort((a, b) => b.roas - a.roas)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Evolucao do CPL</h3>
          <p className="text-sm text-gray-500 mb-4">Custo por lead/conversao ao longo da semana</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'CPL']} />
              <Line type="monotone" dataKey="cpl" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="CPL" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Evolucao do ROAS</h3>
          <p className="text-sm text-gray-500 mb-4">Retorno sobre investimento</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}x`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(value: number) => [`${value.toFixed(2)}x`, 'ROAS']} />
              <Line type="monotone" dataKey="roas" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} name="ROAS" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-1">Comparativo por Empresa</h3>
        <p className="text-sm text-gray-500 mb-4">ROAS e CTR de cada empresa</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={companyPerf}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="roas" fill="#3b82f6" radius={[8, 8, 0, 0]} name="ROAS" />
            <Bar dataKey="ctr" fill="#22c55e" radius={[8, 8, 0, 0]} name="CTR %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Ranking de Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">Empresa</th>
              <th className="text-left px-5 py-3 font-medium">CPL</th>
              <th className="text-left px-5 py-3 font-medium">ROAS</th>
              <th className="text-left px-5 py-3 font-medium">CTR</th>
              <th className="text-left px-5 py-3 font-medium">Conversoes</th>
              <th className="text-left px-5 py-3 font-medium">Investido</th>
            </tr>
          </thead>
          <tbody>
            {companyPerf.map((c, i) => (
              <tr key={c.name} className="border-t border-gray-50">
                <td className="px-5 py-3.5 font-bold text-gray-400">{i + 1}</td>
                <td className="px-5 py-3.5 font-medium text-gray-900">{c.name}</td>
                <td className="px-5 py-3.5 text-gray-600">R$ {c.cpl.toFixed(2)}</td>
                <td className="px-5 py-3.5"><span className={`font-bold ${c.roas >= 4 ? 'text-green-600' : c.roas >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>{c.roas.toFixed(1)}x</span></td>
                <td className="px-5 py-3.5 text-gray-600">{c.ctr.toFixed(1)}%</td>
                <td className="px-5 py-3.5 font-semibold text-gray-900">{c.conversions}</td>
                <td className="px-5 py-3.5 font-medium text-gray-900">R$ {c.spend.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
