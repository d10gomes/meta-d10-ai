import { useState, useEffect, useMemo } from 'react'
import { DollarSign, Users, TrendingUp, Zap, Play, Pause, Cloud, Eye, MousePointerClick, Target, BarChart3, RefreshCw, Loader2, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApp } from '../contexts/AppContext'
import { engine } from '../agents/engine'
import { fetchMetaConfig, saveMetaConfig } from '../lib/supabase-data'
import { syncCampaignsToSupabase } from '../lib/meta-api'

const objectiveColors: Record<string, string> = {
  LEADS: '#22c55e', SALES: '#3b82f6', TRAFFIC: '#a855f7', REGISTRATION: '#6366f1',
  APP_INSTALL: '#06b6d4', AWARENESS: '#f97316', ENGAGEMENT: '#ec4899', FUNNEL: '#f59e0b',
}

export default function Dashboard() {
  const { companies, selectedCompanyId, setSelectedCompanyId, setActivePage, actions, loading, refresh } = useApp()
  const [engineRunning, setEngineRunning] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const displayCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const allCampaigns = displayCompanies.flatMap(c => c.campaigns)
  const activeCampaigns = allCampaigns.filter(c => c.status === 'ACTIVE')
  const allAgents = displayCompanies.flatMap(c => c.agents)

  const totalSpend = allCampaigns.reduce((s, c) => s + c.metrics.spend, 0)
  const totalConversions = allCampaigns.reduce((s, c) => s + c.metrics.conversions, 0)
  const totalImpressions = allCampaigns.reduce((s, c) => s + c.metrics.impressions, 0)
  const totalClicks = allCampaigns.reduce((s, c) => s + c.metrics.clicks, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const totalRevenue = allCampaigns.reduce((s, c) => s + (c.metrics.roas * c.metrics.spend), 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpl = totalConversions > 0 ? totalSpend / totalConversions : 0
  const activeAgentCount = allAgents.filter(a => a.status !== 'idle').length

  const objectiveData = useMemo(() => {
    const byObj: Record<string, number> = {}
    for (const c of allCampaigns) {
      byObj[c.objective] = (byObj[c.objective] || 0) + c.metrics.spend
    }
    return Object.entries(byObj)
      .map(([name, value]) => ({ name, value: Math.round(value), color: objectiveColors[name] || '#9ca3af' }))
      .sort((a, b) => b.value - a.value)
  }, [allCampaigns])

  const companyRanking = useMemo(() => {
    return companies.map(c => {
      const spend = c.campaigns.reduce((s, camp) => s + camp.metrics.spend, 0)
      const conversions = c.campaigns.reduce((s, camp) => s + camp.metrics.conversions, 0)
      const rev = c.campaigns.reduce((s, camp) => s + camp.metrics.roas * camp.metrics.spend, 0)
      const roas = spend > 0 ? rev / spend : 0
      return { id: c.id, name: c.name, spend, conversions, roas, campaigns: c.campaigns.length, agents: c.agents.length, status: c.status }
    }).sort((a, b) => b.spend - a.spend)
  }, [companies])

  const toggleEngine = async () => {
    if (engineRunning) {
      engine.stop()
      setEngineRunning(false)
    } else {
      await engine.start()
      setEngineRunning(true)
    }
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      for (const company of companies) {
        const metaConfig = await fetchMetaConfig(company.id)
        if (!metaConfig || metaConfig.status !== 'connected') continue
        try {
          await syncCampaignsToSupabase(company.id, {
            accessToken: metaConfig.accessToken,
            adAccountId: metaConfig.adAccountId,
          })
        } catch { /* skip */ }
      }
      await refresh()
    } catch { /* skip */ }
    setSyncing(false)
  }

  useEffect(() => {
    return () => { engine.stop() }
  }, [])

  const recentActions = actions.slice(-5).reverse()

  return (
    <div className="space-y-6">
      {/* TOP BAR: Engine + Sync */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${engineRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Motor de Agentes {engineRunning ? 'Ativo' : 'Pausado'}
            </p>
            <p className="text-xs text-gray-500">
              {engineRunning ? `Monitorando ${activeCampaigns.length} campanhas ativas` : 'Clique para ativar a orquestra'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncing || companies.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sincronizar
          </button>
          <button
            onClick={toggleEngine}
            disabled={loading || companies.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              engineRunning
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {engineRunning ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Ativar Agentes</>}
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {companies.length === 0 && !loading && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Cloud size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma conta conectada</h3>
          <p className="text-sm text-gray-500 mb-4">
            Va em Configuracoes, cole seu token do Meta e clique "Descobrir Contas" para comecar.
          </p>
          <button
            onClick={() => setActivePage('settings')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            Ir para Configuracoes
          </button>
        </div>
      )}

      {companies.length > 0 && (
        <>
          {/* METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-xs">Investido</span></div>
              <p className="text-xl font-bold text-gray-900">R$ {totalSpend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Target size={14} /><span className="text-xs">Conversoes</span></div>
              <p className="text-xl font-bold text-gray-900">{totalConversions.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1"><DollarSign size={14} /><span className="text-xs">CPL</span></div>
              <p className="text-xl font-bold text-gray-900">R$ {avgCpl.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1"><TrendingUp size={14} /><span className="text-xs">ROAS</span></div>
              <p className={`text-xl font-bold ${avgRoas >= 3 ? 'text-green-600' : avgRoas >= 1.5 ? 'text-yellow-600' : 'text-red-600'}`}>{avgRoas.toFixed(1)}x</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1"><MousePointerClick size={14} /><span className="text-xs">CTR</span></div>
              <p className="text-xl font-bold text-gray-900">{avgCtr.toFixed(2)}%</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Zap size={14} /><span className="text-xs">Agentes</span></div>
              <p className="text-xl font-bold text-blue-600">{activeAgentCount}/{allAgents.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COMPANIES LIST */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Contas de Anuncio</h3>
                  <p className="text-xs text-gray-500">{companies.length} contas conectadas</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">{activeCampaigns.length} campanhas ativas</span>
                  <span>•</span>
                  <span className="font-medium">{allCampaigns.length} total</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {companyRanking.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedCompanyId(c.id); setActivePage('campaigns') }}
                    className={`flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedCompanyId === c.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.campaigns} campanhas • {c.agents} agentes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-500">Investido</p>
                        <p className="text-sm font-semibold text-gray-900">R$ {c.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-500">Conversoes</p>
                        <p className="text-sm font-semibold text-gray-900">{c.conversions}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">ROAS</p>
                        <p className={`text-sm font-bold ${c.roas >= 3 ? 'text-green-600' : c.roas >= 1.5 ? 'text-yellow-600' : c.roas > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {c.roas > 0 ? `${c.roas.toFixed(1)}x` : '—'}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* OBJECTIVE DISTRIBUTION */}
              {objectiveData.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-1">Por Objetivo</h3>
                  <p className="text-xs text-gray-500 mb-3">Distribuicao do investimento</p>
                  <div className="space-y-2">
                    {objectiveData.map((d) => {
                      const pct = totalSpend > 0 ? (d.value / totalSpend) * 100 : 0
                      return (
                        <div key={d.name} className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                          <span className="text-xs text-gray-600 w-24 truncate">{d.name}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-900 w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* RECENT ACTIONS */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Acoes dos Agentes</h3>
                {recentActions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhuma acao registrada ainda</p>
                ) : (
                  <div className="space-y-2">
                    {recentActions.map((a) => (
                      <div key={a.id} className="flex gap-3 p-2.5 rounded-xl bg-gray-50">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.status === 'completed' ? 'bg-green-500' : a.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 truncate">{a.description}</p>
                          <span className="text-xs text-blue-600 font-medium">{a.agentRole}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TOP CAMPAIGNS TABLE */}
          {activeCampaigns.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Campanhas Ativas — Top Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium">Campanha</th>
                      <th className="text-left px-5 py-3 font-medium">Conta</th>
                      <th className="text-right px-5 py-3 font-medium">Investido</th>
                      <th className="text-right px-5 py-3 font-medium">Impressoes</th>
                      <th className="text-right px-5 py-3 font-medium">Cliques</th>
                      <th className="text-right px-5 py-3 font-medium">CTR</th>
                      <th className="text-right px-5 py-3 font-medium">Conv.</th>
                      <th className="text-right px-5 py-3 font-medium">CPA</th>
                      <th className="text-right px-5 py-3 font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCampaigns
                      .sort((a, b) => b.metrics.spend - a.metrics.spend)
                      .slice(0, 10)
                      .map((camp) => {
                        const company = companies.find(c => c.campaigns.some(cc => cc.id === camp.id))
                        return (
                          <tr key={camp.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-900 truncate max-w-[200px]">{camp.name}</p>
                              <p className="text-xs text-gray-500">{camp.objective}</p>
                            </td>
                            <td className="px-5 py-3 text-gray-600 text-xs truncate max-w-[120px]">{company?.name || '—'}</td>
                            <td className="px-5 py-3 text-right font-medium text-gray-900">R$ {camp.metrics.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                            <td className="px-5 py-3 text-right text-gray-600">{camp.metrics.impressions.toLocaleString('pt-BR')}</td>
                            <td className="px-5 py-3 text-right text-gray-600">{camp.metrics.clicks.toLocaleString('pt-BR')}</td>
                            <td className="px-5 py-3 text-right text-gray-600">{camp.metrics.ctr.toFixed(2)}%</td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-900">{camp.metrics.conversions}</td>
                            <td className="px-5 py-3 text-right text-gray-600">R$ {camp.metrics.costPerConversion.toFixed(2)}</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`font-bold ${camp.metrics.roas >= 3 ? 'text-green-600' : camp.metrics.roas >= 1.5 ? 'text-yellow-600' : camp.metrics.roas > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {camp.metrics.roas > 0 ? `${camp.metrics.roas.toFixed(1)}x` : '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
