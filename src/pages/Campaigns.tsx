import { useState, useMemo } from 'react'
import { Circle, MessageCircle, ShoppingCart, ExternalLink, UserPlus, Smartphone, Eye, Heart, Filter, Play, Pause, TrendingUp, Loader2, DollarSign, Target, MousePointerClick, BarChart3, AlertTriangle, X, Check } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { updateCampaignStatus, updateCampaignBudget, fetchMetaConfig } from '../lib/supabase-data'
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

type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'

interface ConfirmAction {
  campaignId: string
  campaignName: string
  type: 'toggle' | 'scale'
  currentStatus?: string
  currentBudget?: number
}

export default function Campaigns() {
  const { companies, selectedCompanyId, refresh } = useApp()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterObjective, setFilterObjective] = useState<MetaObjective | null>(null)
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('ALL')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const allCampaigns = filteredCompanies.flatMap(c =>
    c.campaigns.map(camp => ({ ...camp, companyName: c.name, companyId: c.id }))
  )

  const displayCampaigns = allCampaigns
    .filter(c => filterStatus === 'ALL' || c.status === filterStatus)
    .filter(c => !filterObjective || c.objective === filterObjective)

  const totalSpend = allCampaigns.reduce((s, c) => s + c.metrics.spend, 0)
  const totalConversions = allCampaigns.reduce((s, c) => s + c.metrics.conversions, 0)
  const totalImpressions = allCampaigns.reduce((s, c) => s + c.metrics.impressions, 0)
  const totalClicks = allCampaigns.reduce((s, c) => s + c.metrics.clicks, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpl = totalConversions > 0 ? totalSpend / totalConversions : 0
  const activeCount = allCampaigns.filter(c => c.status === 'ACTIVE').length
  const pausedCount = allCampaigns.filter(c => c.status === 'PAUSED').length

  const getMetaOpts = async (companyId: string, metaCampaignId?: string) => {
    if (!metaCampaignId) return undefined
    const config = await fetchMetaConfig(companyId)
    if (!config || config.status !== 'connected') return undefined
    return { accessToken: config.accessToken, adAccountId: config.adAccountId, metaCampaignId }
  }

  const executeToggleStatus = async (campaignId: string, currentStatus: string, companyId: string, metaCampaignId?: string) => {
    setActionLoading(campaignId)
    setConfirmAction(null)
    setActionResult(null)
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
      const metaOpts = await getMetaOpts(companyId, metaCampaignId)
      await updateCampaignStatus(campaignId, newStatus, metaOpts)
      await refresh()
      const label = newStatus === 'ACTIVE' ? 'ativada' : 'pausada'
      setActionResult({
        type: 'success',
        message: metaOpts
          ? `Campanha ${label} na Meta API e localmente`
          : `Campanha ${label} localmente (sem conexao Meta API)`,
      })
    } catch (err) {
      setActionResult({ type: 'error', message: `Erro: ${err instanceof Error ? err.message : 'falha desconhecida'}` })
    } finally {
      setActionLoading(null)
      setTimeout(() => setActionResult(null), 4000)
    }
  }

  const executeScaleBudget = async (campaignId: string, currentBudget: number, companyId: string, metaCampaignId?: string) => {
    setActionLoading(campaignId)
    setConfirmAction(null)
    setActionResult(null)
    try {
      const newBudget = Math.round(currentBudget * 1.2 * 100) / 100
      const metaOpts = await getMetaOpts(companyId, metaCampaignId)
      await updateCampaignBudget(campaignId, newBudget, metaOpts)
      await refresh()
      setActionResult({
        type: 'success',
        message: metaOpts
          ? `Budget escalado para R$${newBudget.toFixed(2)}/dia na Meta API`
          : `Budget escalado para R$${newBudget.toFixed(2)}/dia localmente`,
      })
    } catch (err) {
      setActionResult({ type: 'error', message: `Erro: ${err instanceof Error ? err.message : 'falha desconhecida'}` })
    } finally {
      setActionLoading(null)
      setTimeout(() => setActionResult(null), 4000)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-500 mb-1"><BarChart3 size={14} /><span className="text-xs">Campanhas</span></div>
          <p className="text-xl font-bold text-gray-900">{allCampaigns.length}</p>
          <p className="text-xs text-gray-400">{activeCount} ativas, {pausedCount} pausadas</p>
        </div>
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
          <div className="flex items-center gap-1.5 text-gray-500 mb-1"><MousePointerClick size={14} /><span className="text-xs">CTR</span></div>
          <p className="text-xl font-bold text-gray-900">{avgCtr.toFixed(2)}%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Eye size={14} /><span className="text-xs">Impressoes</span></div>
          <p className="text-xl font-bold text-gray-900">{totalImpressions > 1000000 ? `${(totalImpressions / 1000000).toFixed(1)}M` : totalImpressions.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* TOAST */}
      {actionResult && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          actionResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {actionResult.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {actionResult.message}
          <button onClick={() => setActionResult(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* FILTERS */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Status:</span>
          {([
            { key: 'ALL' as StatusFilter, label: 'Todas', count: allCampaigns.length },
            { key: 'ACTIVE' as StatusFilter, label: 'Ativas', count: activeCount },
            { key: 'PAUSED' as StatusFilter, label: 'Pausadas', count: pausedCount },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                filterStatus === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Objetivo:</span>
          <button
            onClick={() => setFilterObjective(null)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${!filterObjective ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todos
          </button>
          {(['LEADS', 'SALES', 'TRAFFIC', 'REGISTRATION', 'ENGAGEMENT', 'AWARENESS', 'FUNNEL', 'APP_INSTALL'] as MetaObjective[]).map((obj) => {
            const Icon = objectiveIcons[obj]
            const count = allCampaigns.filter(c => c.objective === obj).length
            if (count === 0) return null
            return (
              <button
                key={obj}
                onClick={() => setFilterObjective(filterObjective === obj ? null : obj)}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${filterObjective === obj ? 'ring-2 ring-offset-1 ring-blue-500' : ''} ${objectiveColors[obj]}`}
              >
                <Icon size={10} />
                {objectiveLabels[obj]} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* SUBTITLE */}
      <p className="text-xs text-gray-400">{displayCampaigns.length} campanhas {selectedCompanyId ? '' : 'em todas as empresas'}</p>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-medium">Campanha</th>
                {!selectedCompanyId && <th className="text-left px-5 py-3.5 font-medium">Empresa</th>}
                <th className="text-left px-5 py-3.5 font-medium">Objetivo</th>
                <th className="text-left px-5 py-3.5 font-medium">Status</th>
                <th className="text-right px-5 py-3.5 font-medium">Orcamento</th>
                <th className="text-right px-5 py-3.5 font-medium">Investido</th>
                <th className="text-right px-5 py-3.5 font-medium">Conv.</th>
                <th className="text-right px-5 py-3.5 font-medium">CPA</th>
                <th className="text-right px-5 py-3.5 font-medium">ROAS</th>
                <th className="text-right px-5 py-3.5 font-medium">CTR</th>
                <th className="px-5 py-3.5 font-medium text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {displayCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={selectedCompanyId ? 10 : 11} className="text-center py-12 text-gray-400">
                    Nenhuma campanha encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                displayCampaigns.map((camp) => {
                  const Icon = objectiveIcons[camp.objective]
                  const isLoading = actionLoading === camp.id
                  return (
                    <tr key={camp.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {camp.automationEnabled && (
                            <span className="relative flex h-2 w-2" title="Automacao ativa">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 block truncate max-w-[220px]">{camp.name}</span>
                            {camp.metaCampaignId && (
                              <span className="text-[10px] text-gray-400">Meta ID: {camp.metaCampaignId.slice(0, 12)}...</span>
                            )}
                          </div>
                        </div>
                      </td>
                      {!selectedCompanyId && <td className="px-5 py-3.5 text-gray-600 text-xs truncate max-w-[120px]">{camp.companyName}</td>}
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
                          camp.status === 'ARCHIVED' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          <Circle size={6} fill="currentColor" />
                          {camp.status === 'ACTIVE' ? 'Ativa' : camp.status === 'PAUSED' ? 'Pausada' : camp.status === 'ARCHIVED' ? 'Arquivada' : camp.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-600">R$ {camp.budget}/dia</td>
                      <td className="px-5 py-3.5 text-right text-gray-900 font-medium">R$ {camp.metrics.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{camp.metrics.conversions.toLocaleString('pt-BR')}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600">
                        {camp.metrics.costPerConversion > 0 ? `R$ ${camp.metrics.costPerConversion.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-bold ${camp.metrics.roas >= 4 ? 'text-green-600' : camp.metrics.roas >= 2 ? 'text-yellow-600' : camp.metrics.roas > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {camp.metrics.roas > 0 ? `${camp.metrics.roas.toFixed(1)}x` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-600">
                        {camp.metrics.ctr > 0 ? `${camp.metrics.ctr.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {isLoading ? (
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                          ) : (
                            <>
                              <button
                                onClick={() => setConfirmAction({
                                  campaignId: camp.id, campaignName: camp.name,
                                  type: 'toggle', currentStatus: camp.status,
                                })}
                                title={camp.status === 'ACTIVE' ? 'Pausar campanha' : 'Ativar campanha'}
                                className={`p-1.5 rounded-lg transition-colors ${camp.status === 'ACTIVE' ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                              >
                                {camp.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                              {camp.status === 'ACTIVE' && camp.metrics.roas >= 2 && (
                                <button
                                  onClick={() => setConfirmAction({
                                    campaignId: camp.id, campaignName: camp.name,
                                    type: 'scale', currentBudget: camp.budget,
                                  })}
                                  title="Escalar budget +20%"
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <TrendingUp size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            {confirmAction.type === 'toggle' ? (
              <>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  confirmAction.currentStatus === 'ACTIVE' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                }`}>
                  {confirmAction.currentStatus === 'ACTIVE' ? <Pause size={24} /> : <Play size={24} />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {confirmAction.currentStatus === 'ACTIVE' ? 'Pausar Campanha?' : 'Ativar Campanha?'}
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  {confirmAction.currentStatus === 'ACTIVE'
                    ? `A campanha "${confirmAction.campaignName}" sera pausada. Ela parara de veicular anuncios imediatamente.`
                    : `A campanha "${confirmAction.campaignName}" sera reativada e voltara a veicular anuncios.`
                  }
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Esta acao sera aplicada na Meta API (se conectada) e localmente.
                </p>
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => {
                      const camp = allCampaigns.find(c => c.id === confirmAction.campaignId)
                      if (camp) executeToggleStatus(camp.id, camp.status, camp.companyId, camp.metaCampaignId)
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      confirmAction.currentStatus === 'ACTIVE'
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {confirmAction.currentStatus === 'ACTIVE' ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Ativar</>}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Escalar Budget +20%?</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Budget da campanha "{confirmAction.campaignName}" sera aumentado de <strong>R$ {confirmAction.currentBudget}/dia</strong> para <strong>R$ {Math.round((confirmAction.currentBudget || 0) * 1.2 * 100) / 100}/dia</strong>.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Esta acao sera aplicada na Meta API (se conectada) e localmente.
                </p>
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => {
                      const camp = allCampaigns.find(c => c.id === confirmAction.campaignId)
                      if (camp) executeScaleBudget(camp.id, camp.budget, camp.companyId, camp.metaCampaignId)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <TrendingUp size={14} /> Escalar +20%
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
