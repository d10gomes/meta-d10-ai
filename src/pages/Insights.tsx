import { useMemo } from 'react'
import { TrendingUp, AlertTriangle, Lightbulb, Target, Zap, CheckCircle, Brain } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

interface Insight {
  type: 'oportunidade' | 'alerta' | 'sugestao'
  icon: React.ElementType
  color: string
  title: string
  description: string
  confidence: number
  impact: 'Critico' | 'Alto' | 'Medio' | 'Baixo'
  action: string
  companyId?: string
  campaignId?: string
}

export default function Insights() {
  const { companies, selectedCompanyId } = useApp()

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const insights = useMemo(() => {
    const result: Insight[] = []

    for (const company of filteredCompanies) {
      for (const camp of company.campaigns) {
        const m = camp.metrics

        if (camp.status === 'ACTIVE' && m.roas >= 3) {
          result.push({
            type: 'oportunidade', icon: TrendingUp, color: 'text-green-600 bg-green-50',
            title: `Escalar — ${camp.name}`,
            description: `Campanha "${camp.name}" (${company.name}) tem ROAS de ${m.roas.toFixed(1)}x. Aumento de 30% no budget pode gerar +R$${Math.round(m.spend * 0.3 * m.roas).toLocaleString('pt-BR')} em retorno adicional.`,
            confidence: Math.min(97, 80 + Math.round(m.roas * 3)),
            impact: m.roas >= 5 ? 'Alto' : 'Medio',
            action: `Aumentar budget para R$${Math.round(camp.budget * 1.3)}/dia`,
            companyId: company.id, campaignId: camp.id,
          })
        }

        if (camp.status === 'ACTIVE' && m.ctr < 0.8 && m.impressions > 1000) {
          result.push({
            type: 'alerta', icon: AlertTriangle, color: 'text-red-600 bg-red-50',
            title: `CTR Baixo — ${camp.name}`,
            description: `CTR de ${m.ctr.toFixed(1)}% na campanha "${camp.name}" (${company.name}) esta abaixo do ideal. Revisar criativos e copy pode aumentar significativamente a performance.`,
            confidence: 90, impact: 'Critico',
            action: 'Pausar criativos atuais e testar novos',
            companyId: company.id, campaignId: camp.id,
          })
        }

        if (camp.status === 'ACTIVE' && m.frequency > 2.5) {
          result.push({
            type: 'alerta', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50',
            title: `Fadiga de Criativo — ${camp.name}`,
            description: `Frequencia de ${m.frequency.toFixed(1)} na campanha "${camp.name}" (${company.name}). O publico esta vendo o anuncio muitas vezes. Rotacionar criativos para evitar queda de conversao.`,
            confidence: 88, impact: 'Alto',
            action: 'Rotacionar criativos e expandir publico',
            companyId: company.id, campaignId: camp.id,
          })
        }

        if (camp.status === 'ACTIVE' && m.conversions > 0 && m.costPerConversion > camp.budget * 0.5) {
          result.push({
            type: 'alerta', icon: Target, color: 'text-orange-600 bg-orange-50',
            title: `CPA Alto — ${camp.name}`,
            description: `CPA de R$${m.costPerConversion.toFixed(2)} na "${camp.name}" (${company.name}) esta consumindo metade do budget diario. Otimizar publico ou reduzir lance pode melhorar a eficiencia.`,
            confidence: 85, impact: 'Alto',
            action: 'Otimizar segmentacao e ajustar bid',
            companyId: company.id, campaignId: camp.id,
          })
        }

        if (camp.status === 'ACTIVE' && m.roas > 0 && m.roas < 1.5 && m.spend > 500) {
          result.push({
            type: 'alerta', icon: AlertTriangle, color: 'text-red-600 bg-red-50',
            title: `ROAS Negativo — ${camp.name}`,
            description: `ROAS de apenas ${m.roas.toFixed(1)}x na "${camp.name}" (${company.name}). Cada R$1 investido retorna menos de R$1.50. Considerar pausar ou reestruturar a campanha.`,
            confidence: 92, impact: 'Critico',
            action: 'Pausar campanha e reavaliar estrategia',
            companyId: company.id, campaignId: camp.id,
          })
        }
      }

      const activeCampaigns = company.campaigns.filter(c => c.status === 'ACTIVE')
      if (activeCampaigns.length >= 2) {
        const sorted = [...activeCampaigns].sort((a, b) => b.metrics.roas - a.metrics.roas)
        const best = sorted[0]
        const worst = sorted[sorted.length - 1]
        if (best.metrics.roas > worst.metrics.roas * 2 && worst.metrics.roas > 0) {
          result.push({
            type: 'sugestao', icon: Lightbulb, color: 'text-blue-600 bg-blue-50',
            title: `Redistribuir Budget — ${company.name}`,
            description: `"${best.name}" tem ROAS ${best.metrics.roas.toFixed(1)}x enquanto "${worst.name}" tem apenas ${worst.metrics.roas.toFixed(1)}x. Mover 20% do budget da campanha fraca para a forte pode aumentar retorno geral.`,
            confidence: 86, impact: 'Alto',
            action: `Transferir R$${Math.round(worst.budget * 0.2)}/dia para ${best.name}`,
            companyId: company.id,
          })
        }
      }

      const totalConversions = company.campaigns.reduce((s, c) => s + c.metrics.conversions, 0)
      const totalSpend = company.campaigns.reduce((s, c) => s + c.metrics.spend, 0)
      if (totalConversions > 50 && totalSpend > 1000) {
        const avgCPL = totalSpend / totalConversions
        result.push({
          type: 'sugestao', icon: Zap, color: 'text-purple-600 bg-purple-50',
          title: `Lookalike Audience — ${company.name}`,
          description: `Com ${totalConversions} conversoes acumuladas e CPL medio de R$${avgCPL.toFixed(2)}, criar um publico Lookalike baseado nos conversores pode reduzir o CPA em ate 25%.`,
          confidence: 84, impact: 'Medio',
          action: 'Criar Lookalike 1% dos conversores',
          companyId: company.id,
        })
      }
    }

    return result.sort((a, b) => {
      const impactOrder = { Critico: 0, Alto: 1, Medio: 2, Baixo: 3 }
      return (impactOrder[a.impact] - impactOrder[b.impact]) || (b.confidence - a.confidence)
    })
  }, [filteredCompanies])

  const avgConfidence = insights.length > 0
    ? Math.round(insights.reduce((s, i) => s + i.confidence, 0) / insights.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Brain size={16} /><span className="text-sm">Insights Gerados</span></div>
          <p className="text-3xl font-bold text-purple-600 mt-1">{insights.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Confianca Media</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{avgConfidence}%</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Alto Impacto</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{insights.filter(i => i.impact === 'Alto' || i.impact === 'Critico').length}</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Brain size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum insight gerado ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Os agentes analisam continuamente suas campanhas para gerar recomendacoes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${insight.color}`}>
                  <insight.icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold uppercase ${insight.color.split(' ')[0]}`}>{insight.type}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      insight.impact === 'Critico' ? 'bg-red-100 text-red-700' :
                      insight.impact === 'Alto' ? 'bg-orange-100 text-orange-700' :
                      insight.impact === 'Medio' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>Impacto: {insight.impact}</span>
                    <span className="text-xs text-gray-400">Confianca: {insight.confidence}%</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700">
                      <CheckCircle size={14} />
                      {insight.action}
                    </button>
                    <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Ignorar</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
