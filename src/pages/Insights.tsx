import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, Zap, CheckCircle, Brain, DollarSign, Eye, MousePointerClick, BarChart3, ArrowUp, ArrowDown, Minus, Shield } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

type InsightType = 'oportunidade' | 'alerta' | 'sugestao' | 'destaque'
type Impact = 'Critico' | 'Alto' | 'Medio' | 'Baixo'

interface Insight {
  type: InsightType
  icon: React.ElementType
  color: string
  title: string
  description: string
  confidence: number
  impact: Impact
  action: string
  companyName: string
  campaignName?: string
  metric?: string
  metricValue?: string
}

interface CompanyHealth {
  name: string
  score: number
  activeCampaigns: number
  totalCampaigns: number
  totalSpend: number
  avgRoas: number
  avgCtr: number
  avgCpl: number
  totalConversions: number
  issues: number
  opportunities: number
}

const impactOrder: Record<Impact, number> = { Critico: 0, Alto: 1, Medio: 2, Baixo: 3 }

export default function Insights() {
  const { companies, selectedCompanyId } = useApp()
  const [activeFilter, setActiveFilter] = useState<'todos' | InsightType>('todos')
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const companyHealthScores = useMemo<CompanyHealth[]>(() => {
    return filteredCompanies
      .map(c => {
        const active = c.campaigns.filter(camp => camp.status === 'ACTIVE')
        const totalSpend = c.campaigns.reduce((s, camp) => s + camp.metrics.spend, 0)
        const totalConversions = c.campaigns.reduce((s, camp) => s + camp.metrics.conversions, 0)
        const totalImpressions = c.campaigns.reduce((s, camp) => s + camp.metrics.impressions, 0)
        const totalClicks = c.campaigns.reduce((s, camp) => s + camp.metrics.clicks, 0)
        const totalRev = c.campaigns.reduce((s, camp) => s + camp.metrics.roas * camp.metrics.spend, 0)
        const avgRoas = totalSpend > 0 ? totalRev / totalSpend : 0
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        const avgCpl = totalConversions > 0 ? totalSpend / totalConversions : 0

        let score = 50
        if (avgRoas >= 5) score += 25
        else if (avgRoas >= 3) score += 15
        else if (avgRoas >= 2) score += 10
        else if (avgRoas >= 1) score += 5
        else if (avgRoas > 0) score -= 10

        if (avgCtr >= 3) score += 15
        else if (avgCtr >= 1.5) score += 10
        else if (avgCtr >= 0.5) score += 5
        else if (avgCtr > 0) score -= 5

        if (active.length > 0) score += 10
        if (totalConversions > 100) score += 10
        if (totalSpend === 0 && c.campaigns.length > 0) score -= 15

        score = Math.max(0, Math.min(100, score))

        const issues = active.filter(camp =>
          camp.metrics.ctr < 0.8 || camp.metrics.frequency > 3 || (camp.metrics.roas > 0 && camp.metrics.roas < 1.5)
        ).length
        const opportunities = active.filter(camp => camp.metrics.roas >= 3).length

        return {
          name: c.name, score, activeCampaigns: active.length, totalCampaigns: c.campaigns.length,
          totalSpend, avgRoas, avgCtr, avgCpl, totalConversions, issues, opportunities,
        }
      })
      .filter(h => h.totalCampaigns > 0)
      .sort((a, b) => b.score - a.score)
  }, [filteredCompanies])

  const insights = useMemo(() => {
    const result: Insight[] = []

    for (const company of filteredCompanies) {
      const activeCampaigns = company.campaigns.filter(c => c.status === 'ACTIVE')
      const totalSpend = company.campaigns.reduce((s, c) => s + c.metrics.spend, 0)
      const totalConversions = company.campaigns.reduce((s, c) => s + c.metrics.conversions, 0)
      const totalImpressions = company.campaigns.reduce((s, c) => s + c.metrics.impressions, 0)
      const totalClicks = company.campaigns.reduce((s, c) => s + c.metrics.clicks, 0)
      const totalRev = company.campaigns.reduce((s, c) => s + c.metrics.roas * c.metrics.spend, 0)

      for (const camp of company.campaigns) {
        const m = camp.metrics

        if (camp.status === 'ACTIVE' && m.roas >= 4) {
          result.push({
            type: 'destaque', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50',
            title: `Top Performer — ${camp.name}`,
            description: `ROAS de ${m.roas.toFixed(1)}x com R$${m.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} investido e ${m.conversions.toLocaleString('pt-BR')} conversoes. Esta campanha esta entre as melhores da conta "${company.name}".`,
            confidence: 95, impact: 'Alto',
            action: `Escalar budget em 30% (+R$${Math.round(camp.budget * 0.3)}/dia)`,
            companyName: company.name, campaignName: camp.name,
            metric: 'ROAS', metricValue: `${m.roas.toFixed(1)}x`,
          })
        }

        if (camp.status === 'ACTIVE' && m.roas >= 2 && m.roas < 4 && m.spend > 100) {
          result.push({
            type: 'oportunidade', icon: TrendingUp, color: 'text-green-600 bg-green-50',
            title: `Potencial de Escala — ${camp.name}`,
            description: `Campanha com ROAS ${m.roas.toFixed(1)}x mostra potencial. Com otimizacao de criativos e publico, pode alcancar ROAS 3x+. Investimento atual: R$${m.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
            confidence: 82, impact: 'Medio',
            action: 'Testar novos criativos e expandir publico',
            companyName: company.name, campaignName: camp.name,
            metric: 'ROAS', metricValue: `${m.roas.toFixed(1)}x`,
          })
        }

        if (camp.status === 'ACTIVE' && m.ctr < 0.8 && m.impressions > 1000) {
          result.push({
            type: 'alerta', icon: MousePointerClick, color: 'text-red-600 bg-red-50',
            title: `CTR Critico — ${camp.name}`,
            description: `CTR de apenas ${m.ctr.toFixed(2)}% (meta: >1.5%) com ${m.impressions.toLocaleString('pt-BR')} impressoes. O anuncio nao esta atraindo cliques. Possivel: copy fraco, imagem/video pouco atrativo, ou publico errado.`,
            confidence: 93, impact: 'Critico',
            action: 'Pausar criativos atuais e testar 3 novas variacoes',
            companyName: company.name, campaignName: camp.name,
            metric: 'CTR', metricValue: `${m.ctr.toFixed(2)}%`,
          })
        }

        if (camp.status === 'ACTIVE' && m.frequency > 3) {
          result.push({
            type: 'alerta', icon: Eye, color: 'text-yellow-600 bg-yellow-50',
            title: `Fadiga de Criativo — ${camp.name}`,
            description: `Frequencia de ${m.frequency.toFixed(1)}x (ideal: <2.5). O mesmo publico esta vendo o anuncio varias vezes, causando "cegueira" e queda de conversao. Rotacao urgente necessaria.`,
            confidence: 91, impact: 'Alto',
            action: 'Rotacionar criativos e expandir publico-alvo',
            companyName: company.name, campaignName: camp.name,
            metric: 'Frequencia', metricValue: `${m.frequency.toFixed(1)}x`,
          })
        }

        if (camp.status === 'ACTIVE' && m.roas > 0 && m.roas < 1) {
          result.push({
            type: 'alerta', icon: DollarSign, color: 'text-red-600 bg-red-50',
            title: `Prejuizo — ${camp.name}`,
            description: `ROAS ${m.roas.toFixed(1)}x significa que cada R$1 investido retorna apenas R$${m.roas.toFixed(2)}. Prejuizo de R$${Math.round(m.spend * (1 - m.roas)).toLocaleString('pt-BR')} ate agora. Acao imediata necessaria.`,
            confidence: 96, impact: 'Critico',
            action: 'Pausar campanha imediatamente',
            companyName: company.name, campaignName: camp.name,
            metric: 'ROAS', metricValue: `${m.roas.toFixed(1)}x`,
          })
        } else if (camp.status === 'ACTIVE' && m.roas >= 1 && m.roas < 1.5 && m.spend > 300) {
          result.push({
            type: 'alerta', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50',
            title: `ROAS Marginal — ${camp.name}`,
            description: `ROAS de ${m.roas.toFixed(1)}x esta no limite. Com custos operacionais, o lucro real pode ser zero. R$${m.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} investido com retorno minimo.`,
            confidence: 88, impact: 'Alto',
            action: 'Otimizar ou pausar em 48h se nao melhorar',
            companyName: company.name, campaignName: camp.name,
            metric: 'ROAS', metricValue: `${m.roas.toFixed(1)}x`,
          })
        }

        if (camp.status === 'ACTIVE' && m.ctr >= 3 && m.conversions === 0 && m.clicks > 50) {
          result.push({
            type: 'sugestao', icon: Target, color: 'text-purple-600 bg-purple-50',
            title: `Funil Quebrado — ${camp.name}`,
            description: `CTR excelente de ${m.ctr.toFixed(1)}% mas 0 conversoes apos ${m.clicks} cliques. O trafego esta chegando mas nao converte. Verificar: landing page, formulario, velocidade de carregamento, ou pixel configurado errado.`,
            confidence: 89, impact: 'Critico',
            action: 'Auditar landing page e configuracao do pixel',
            companyName: company.name, campaignName: camp.name,
            metric: 'Conv.', metricValue: '0',
          })
        }

        if (camp.status === 'ACTIVE' && m.cpc > 5 && m.clicks > 10) {
          result.push({
            type: 'alerta', icon: DollarSign, color: 'text-orange-600 bg-orange-50',
            title: `CPC Elevado — ${camp.name}`,
            description: `CPC de R$${m.cpc.toFixed(2)} esta acima da media do mercado. Cada clique custa caro. Revisar segmentacao de publico e qualidade do anuncio para reduzir o custo.`,
            confidence: 84, impact: 'Medio',
            action: 'Ampliar publico e testar copy alternativo',
            companyName: company.name, campaignName: camp.name,
            metric: 'CPC', metricValue: `R$${m.cpc.toFixed(2)}`,
          })
        }
      }

      if (activeCampaigns.length >= 2) {
        const sorted = [...activeCampaigns].sort((a, b) => b.metrics.roas - a.metrics.roas)
        const best = sorted[0]
        const worst = sorted[sorted.length - 1]
        if (best.metrics.roas > worst.metrics.roas * 3 && worst.metrics.roas > 0) {
          result.push({
            type: 'sugestao', icon: Lightbulb, color: 'text-blue-600 bg-blue-50',
            title: `Redistribuir Budget — ${company.name}`,
            description: `"${best.name}" (ROAS ${best.metrics.roas.toFixed(1)}x) rende ${Math.round(best.metrics.roas / worst.metrics.roas)}x mais que "${worst.name}" (ROAS ${worst.metrics.roas.toFixed(1)}x). Redirecionar budget da fraca para a forte pode maximizar retorno total.`,
            confidence: 87, impact: 'Alto',
            action: `Mover 30% do budget de "${worst.name}" para "${best.name}"`,
            companyName: company.name,
          })
        }
      }

      if (totalConversions > 50 && totalSpend > 500) {
        const avgCPL = totalSpend / totalConversions
        result.push({
          type: 'sugestao', icon: Zap, color: 'text-violet-600 bg-violet-50',
          title: `Criar Lookalike — ${company.name}`,
          description: `${totalConversions.toLocaleString('pt-BR')} conversoes acumuladas com CPL de R$${avgCPL.toFixed(2)}. Base suficiente para criar publico Lookalike 1% que pode reduzir CPA em 20-35%.`,
          confidence: 84, impact: 'Medio',
          action: 'Criar Lookalike 1% baseado em conversores',
          companyName: company.name,
        })
      }

      const pausedWithSpend = company.campaigns.filter(c => c.status === 'PAUSED' && c.metrics.roas >= 2 && c.metrics.spend > 200)
      for (const camp of pausedWithSpend) {
        result.push({
          type: 'oportunidade', icon: Zap, color: 'text-green-600 bg-green-50',
          title: `Reativar Campanha — ${camp.name}`,
          description: `Campanha pausada com historico de ROAS ${camp.metrics.roas.toFixed(1)}x e ${camp.metrics.conversions} conversoes. Pode estar perdendo oportunidade de receita. Considerar reativacao com budget controlado.`,
          confidence: 78, impact: 'Medio',
          action: 'Reativar com 50% do budget original',
          companyName: company.name, campaignName: camp.name,
          metric: 'ROAS', metricValue: `${camp.metrics.roas.toFixed(1)}x`,
        })
      }

      if (totalSpend === 0 && company.campaigns.length > 0) {
        result.push({
          type: 'alerta', icon: AlertTriangle, color: 'text-gray-600 bg-gray-50',
          title: `Sem Dados de Investimento — ${company.name}`,
          description: `${company.campaigns.length} campanhas cadastradas mas nenhum dado de investimento sincronizado. Verificar se o token da Meta API tem permissoes de leitura de insights.`,
          confidence: 95, impact: 'Alto',
          action: 'Verificar permissoes do token Meta',
          companyName: company.name,
        })
      }

      const noMetricsCampaigns = company.campaigns.filter(c => c.status === 'ACTIVE' && c.metrics.spend === 0 && c.metrics.impressions === 0)
      if (noMetricsCampaigns.length >= 3) {
        result.push({
          type: 'alerta', icon: BarChart3, color: 'text-gray-600 bg-gray-50',
          title: `${noMetricsCampaigns.length} Campanhas Sem Metricas — ${company.name}`,
          description: `Campanhas ativas sem dados de performance. Pode indicar problema de integracao com a API, ou campanhas recentemente criadas que ainda nao geraram dados.`,
          confidence: 80, impact: 'Medio',
          action: 'Resincronizar dados da Meta API',
          companyName: company.name,
        })
      }

      if (totalSpend > 0) {
        const avgRoas = totalRev / totalSpend
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        if (avgRoas >= 3 && avgCtr >= 2 && totalConversions > 100) {
          result.push({
            type: 'destaque', icon: Shield, color: 'text-emerald-600 bg-emerald-50',
            title: `Conta Saudavel — ${company.name}`,
            description: `ROAS geral ${avgRoas.toFixed(1)}x, CTR ${avgCtr.toFixed(1)}% e ${totalConversions.toLocaleString('pt-BR')} conversoes. Esta conta esta performando acima da media. Manter estrategia atual e escalar gradualmente.`,
            confidence: 94, impact: 'Baixo',
            action: 'Manter estrategia e escalar 15%/semana',
            companyName: company.name,
            metric: 'Score', metricValue: 'Excelente',
          })
        }
      }
    }

    return result.sort((a, b) =>
      (impactOrder[a.impact] - impactOrder[b.impact]) || (b.confidence - a.confidence)
    )
  }, [filteredCompanies])

  const visibleInsights = insights.filter((_, i) => !dismissedIds.has(i))
  const filtered = activeFilter === 'todos' ? visibleInsights : visibleInsights.filter(i => i.type === activeFilter)

  const counts = {
    todos: visibleInsights.length,
    alerta: visibleInsights.filter(i => i.type === 'alerta').length,
    oportunidade: visibleInsights.filter(i => i.type === 'oportunidade').length,
    sugestao: visibleInsights.filter(i => i.type === 'sugestao').length,
    destaque: visibleInsights.filter(i => i.type === 'destaque').length,
  }

  const criticalCount = visibleInsights.filter(i => i.impact === 'Critico').length
  const highCount = visibleInsights.filter(i => i.impact === 'Alto').length
  const avgConfidence = visibleInsights.length > 0
    ? Math.round(visibleInsights.reduce((s, i) => s + i.confidence, 0) / visibleInsights.length)
    : 0

  const potentialRevenue = useMemo(() => {
    let total = 0
    for (const company of filteredCompanies) {
      for (const camp of company.campaigns) {
        if (camp.status === 'ACTIVE' && camp.metrics.roas >= 3) {
          total += camp.metrics.spend * 0.3 * camp.metrics.roas
        }
      }
    }
    return total
  }, [filteredCompanies])

  const filterButtons: Array<{ key: typeof activeFilter; label: string; color: string }> = [
    { key: 'todos', label: 'Todos', color: 'bg-gray-100 text-gray-700' },
    { key: 'alerta', label: 'Alertas', color: 'bg-red-100 text-red-700' },
    { key: 'oportunidade', label: 'Oportunidades', color: 'bg-green-100 text-green-700' },
    { key: 'sugestao', label: 'Sugestoes', color: 'bg-blue-100 text-blue-700' },
    { key: 'destaque', label: 'Destaques', color: 'bg-emerald-100 text-emerald-700' },
  ]

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'

  const scoreBg = (score: number) =>
    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'

  const scoreLabel = (score: number) =>
    score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 40 ? 'Regular' : 'Critico'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Brain size={16} /><span className="text-sm">Insights</span></div>
          <p className="text-3xl font-bold text-purple-600">{visibleInsights.length}</p>
          <p className="text-xs text-gray-400 mt-1">{dismissedIds.size > 0 ? `${dismissedIds.size} ignorados` : 'gerados pela IA'}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><AlertTriangle size={16} /><span className="text-sm">Urgentes</span></div>
          <p className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{criticalCount + highCount}</p>
          <p className="text-xs text-gray-400 mt-1">{criticalCount} criticos, {highCount} alto impacto</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Target size={16} /><span className="text-sm">Confianca</span></div>
          <p className="text-3xl font-bold text-blue-600">{avgConfidence}%</p>
          <p className="text-xs text-gray-400 mt-1">media das analises</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><DollarSign size={16} /><span className="text-sm">Receita Potencial</span></div>
          <p className="text-3xl font-bold text-green-600">R$ {potentialRevenue > 0 ? potentialRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'}</p>
          <p className="text-xs text-gray-400 mt-1">se escalar campanhas top</p>
        </div>
      </div>

      {/* HEALTH SCORES */}
      {companyHealthScores.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Saude das Contas</h3>
            <p className="text-xs text-gray-500 mt-0.5">Score calculado com base em ROAS, CTR, conversoes e campanhas ativas</p>
          </div>
          <div className="divide-y divide-gray-50">
            {companyHealthScores.map((h) => (
              <div key={h.name} className="flex items-center gap-4 px-5 py-3">
                <div className="w-12 text-center flex-shrink-0">
                  <p className={`text-lg font-bold ${scoreColor(h.score)}`}>{h.score}</p>
                  <p className="text-[10px] text-gray-400">{scoreLabel(h.score)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{h.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${scoreBg(h.score)}`} style={{ width: `${h.score}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                  <div className="text-center hidden md:block">
                    <p className="text-gray-400">Campanhas</p>
                    <p className="font-semibold text-gray-900">{h.activeCampaigns}/{h.totalCampaigns}</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-gray-400">Investido</p>
                    <p className="font-semibold text-gray-900">R$ {h.totalSpend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">ROAS</p>
                    <p className={`font-bold ${h.avgRoas >= 3 ? 'text-green-600' : h.avgRoas >= 1.5 ? 'text-yellow-600' : h.avgRoas > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {h.avgRoas > 0 ? `${h.avgRoas.toFixed(1)}x` : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {h.issues > 0 && (
                      <span className="flex items-center gap-0.5 text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                        <ArrowDown size={10} />{h.issues}
                      </span>
                    )}
                    {h.opportunities > 0 && (
                      <span className="flex items-center gap-0.5 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                        <ArrowUp size={10} />{h.opportunities}
                      </span>
                    )}
                    {h.issues === 0 && h.opportunities === 0 && (
                      <span className="flex items-center gap-0.5 text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                        <Minus size={10} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterButtons.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
              activeFilter === f.key
                ? `${f.color} ring-2 ring-offset-1 ring-current`
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {/* INSIGHTS LIST */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Brain size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {visibleInsights.length === 0
              ? 'Nenhum insight gerado ainda.'
              : `Nenhum insight do tipo "${activeFilter}" encontrado.`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {visibleInsights.length === 0
              ? 'Sincronize dados da Meta API para que a IA analise suas campanhas.'
              : 'Tente outro filtro para ver mais insights.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((insight, i) => {
            const originalIndex = insights.indexOf(insight)
            return (
              <div key={originalIndex} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${insight.color}`}>
                    <insight.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-semibold uppercase ${insight.color.split(' ')[0]}`}>{insight.type}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        insight.impact === 'Critico' ? 'bg-red-100 text-red-700' :
                        insight.impact === 'Alto' ? 'bg-orange-100 text-orange-700' :
                        insight.impact === 'Medio' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{insight.impact}</span>
                      <span className="text-xs text-gray-400">{insight.confidence}% confianca</span>
                      {insight.metric && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{insight.metric}: {insight.metricValue}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{insight.companyName}{insight.campaignName ? ` — ${insight.campaignName}` : ''}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        <CheckCircle size={12} />
                        {insight.action}
                      </button>
                      <button
                        onClick={() => setDismissedIds(prev => new Set([...prev, originalIndex]))}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
