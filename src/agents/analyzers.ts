import type { AgentRole } from '../types/company'
import type { ActionType } from '../types/agent'

export interface CampaignData {
  id: string
  companyId: string
  name: string
  objective: string
  status: string
  budget: number
  metaCampaignId: string | null
  metrics: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpc: number
    cpm: number
    roas: number
    frequency: number
    reach: number
    revenue: number
  }
  trend: {
    spendDelta: number
    ctrDelta: number
    cpaDelta: number
    roasDelta: number
  }
  daysRunning: number
}

export interface AgentDecision {
  agent: AgentRole
  campaignId: string
  campaignName: string
  action: ActionType
  params: Record<string, unknown>
  reason: string
  confidence: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  impact: string
}

interface AnalyzerContext {
  campaigns: CampaignData[]
  totalBudget: number
  avgROAS: number
  avgCTR: number
  avgCPA: number
}

// Budget: redistribui verba de campanhas ruins para boas
export function analyzeBudget(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []
  const active = ctx.campaigns.filter(c => c.status === 'ACTIVE' && c.metrics.spend > 0)
  if (active.length < 2) return decisions

  for (const camp of active) {
    const cpa = camp.metrics.conversions > 0 ? camp.metrics.spend / camp.metrics.conversions : Infinity

    // Campanha com ROAS alto e spend consistente: escalar 20%
    if (camp.metrics.roas >= 3 && camp.metrics.spend >= 20 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'budget',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'scale_campaign',
        params: { multiplier: 1.2 },
        reason: `ROAS de ${camp.metrics.roas.toFixed(1)}x com R$${camp.metrics.spend.toFixed(0)} gastos. Performance consistente para escalar.`,
        confidence: Math.min(0.95, 0.7 + (camp.metrics.roas - 3) * 0.05),
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.2).toFixed(0)}`,
      })
    }

    // Campanha gastando muito com ROAS negativo: reduzir 30%
    if (camp.metrics.roas < 0.8 && camp.metrics.spend > 50 && camp.daysRunning >= 5) {
      decisions.push({
        agent: 'budget',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.7 },
        reason: `ROAS de ${camp.metrics.roas.toFixed(2)}x abaixo de 1. Queimando budget sem retorno.`,
        confidence: 0.85,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.7).toFixed(0)}`,
      })
    }

    // CPA explodiu (3x a media): reduzir budget
    if (cpa > ctx.avgCPA * 3 && ctx.avgCPA > 0 && camp.metrics.conversions >= 3) {
      decisions.push({
        agent: 'budget',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.5 },
        reason: `CPA de R$${cpa.toFixed(2)} esta 3x acima da media (R$${ctx.avgCPA.toFixed(2)}). Reduzindo budget pela metade.`,
        confidence: 0.8,
        priority: 'critical',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.5).toFixed(0)}`,
      })
    }
  }

  return decisions
}

// Analytics: detecta anomalias e tendencias perigosas
export function analyzePerformance(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    // CTR caiu mais de 40%: fadiga de criativo
    if (camp.trend.ctrDelta < -40 && camp.metrics.impressions > 500) {
      decisions.push({
        agent: 'analytics',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR caiu ${Math.abs(camp.trend.ctrDelta).toFixed(0)}%. Possivel fadiga de criativo.` },
        reason: `CTR caiu ${Math.abs(camp.trend.ctrDelta).toFixed(0)}% comparado ao periodo anterior. Sinal forte de fadiga de criativo.`,
        confidence: 0.9,
        priority: 'high',
        impact: 'Alerta para equipe de criativos',
      })
    }

    // CPA subiu mais de 50%: alerta critico
    if (camp.trend.cpaDelta > 50 && camp.metrics.conversions >= 2) {
      decisions.push({
        agent: 'analytics',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CPA subiu ${camp.trend.cpaDelta.toFixed(0)}%. Investigar urgente.` },
        reason: `CPA subiu ${camp.trend.cpaDelta.toFixed(0)}% — custo de aquisicao disparando.`,
        confidence: 0.85,
        priority: 'critical',
        impact: 'Alerta critico para investigacao',
      })
    }

    // Spend sem conversoes por mais de 5 dias
    if (camp.metrics.spend > 100 && camp.metrics.conversions === 0 && camp.daysRunning >= 5) {
      decisions.push({
        agent: 'analytics',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'pause_ad',
        reason: `R$${camp.metrics.spend.toFixed(0)} gastos com zero conversoes em ${camp.daysRunning} dias. Campanha ineficiente.`,
        params: {},
        confidence: 0.9,
        priority: 'critical',
        impact: 'Pausar para evitar desperdicio',
      })
    }

    // ROAS caiu mais de 50%: reduzir budget
    if (camp.trend.roasDelta < -50 && camp.metrics.roas < 1.5 && camp.metrics.spend > 30) {
      decisions.push({
        agent: 'analytics',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.6 },
        reason: `ROAS caiu ${Math.abs(camp.trend.roasDelta).toFixed(0)}% e esta em ${camp.metrics.roas.toFixed(2)}x. Tendencia perigosa.`,
        confidence: 0.8,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.6).toFixed(0)}`,
      })
    }
  }

  return decisions
}

// Audience: detecta saturacao e recomenda acoes
export function analyzeAudience(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE') continue

    // Frequencia > 4: publico saturado
    if (camp.metrics.frequency > 4 && camp.metrics.reach > 500) {
      decisions.push({
        agent: 'audience',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `Frequencia de ${camp.metrics.frequency.toFixed(1)} — publico saturado. Expandir ou trocar segmentacao.` },
        reason: `Frequencia de ${camp.metrics.frequency.toFixed(1)} indica que o publico ja viu o anuncio muitas vezes. Performance tende a cair.`,
        confidence: 0.85,
        priority: 'high',
        impact: 'Recomendacao para expandir publico',
      })
    }

    // Frequencia > 6 com CTR baixo: pausar e recriar
    if (camp.metrics.frequency > 6 && camp.metrics.ctr < 1) {
      decisions.push({
        agent: 'audience',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'pause_ad',
        params: {},
        reason: `Frequencia de ${camp.metrics.frequency.toFixed(1)} com CTR de ${camp.metrics.ctr.toFixed(2)}%. Publico completamente saturado.`,
        confidence: 0.9,
        priority: 'critical',
        impact: 'Pausar campanha saturada',
      })
    }
  }

  return decisions
}

// Creative: detecta fadiga e performance de criativos
export function analyzeCreatives(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 500) continue

    // CTR muito abaixo da media da conta: criativo fraco
    if (camp.metrics.ctr < ctx.avgCTR * 0.5 && ctx.avgCTR > 0) {
      decisions.push({
        agent: 'creative',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR de ${camp.metrics.ctr.toFixed(2)}% esta ${((1 - camp.metrics.ctr / ctx.avgCTR) * 100).toFixed(0)}% abaixo da media. Trocar criativos.` },
        reason: `CTR de ${camp.metrics.ctr.toFixed(2)}% vs media de ${ctx.avgCTR.toFixed(2)}%. Criativos nao estao engajando.`,
        confidence: 0.8,
        priority: 'medium',
        impact: 'Sugestao de novos criativos',
      })
    }

    // CPC muito alto comparado com a media: criativo ou segmentacao ruim
    if (camp.metrics.cpc > ctx.avgCTR * 3 && camp.metrics.clicks > 10) {
      decisions.push({
        agent: 'creative',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CPC de R$${camp.metrics.cpc.toFixed(2)} esta muito alto. Testar novas copys e imagens.` },
        reason: `CPC elevado indica baixa relevancia do criativo para o publico alvo.`,
        confidence: 0.75,
        priority: 'medium',
        impact: 'Recomendacao de A/B testing',
      })
    }
  }

  return decisions
}

// Orchestrator: visao macro, resolve conflitos, campanhas mortas
export function analyzeOrchestrator(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []
  const active = ctx.campaigns.filter(c => c.status === 'ACTIVE')

  // Campanhas ativas sem impressoes em 3+ dias: reativar ou matar
  for (const camp of active) {
    if (camp.metrics.impressions === 0 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'orchestrator',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'kill_campaign',
        params: {},
        reason: `Campanha ativa ha ${camp.daysRunning} dias sem nenhuma impressao. Provavelmente rejeitada ou com erro de configuracao.`,
        confidence: 0.85,
        priority: 'high',
        impact: 'Arquivar campanha inativa',
      })
    }
  }

  // Top performer absoluta: escalar agressivamente
  if (active.length >= 3) {
    const sorted = [...active]
      .filter(c => c.metrics.roas > 0 && c.metrics.spend > 30)
      .sort((a, b) => b.metrics.roas - a.metrics.roas)

    if (sorted.length > 0) {
      const top = sorted[0]
      if (top.metrics.roas >= 5 && top.daysRunning >= 5) {
        decisions.push({
          agent: 'orchestrator',
          campaignId: top.id,
          campaignName: top.name,
          action: 'scale_campaign',
          params: { multiplier: 1.3 },
          reason: `Melhor campanha da conta com ROAS ${top.metrics.roas.toFixed(1)}x. Escalando 30% para maximizar retorno.`,
          confidence: 0.9,
          priority: 'high',
          impact: `Budget de R$${top.budget} → R$${(top.budget * 1.3).toFixed(0)}`,
        })
      }
    }
  }

  return decisions
}

// Deduplication: remove decisoes conflitantes sobre a mesma campanha
export function deduplicateDecisions(decisions: AgentDecision[]): AgentDecision[] {
  const bycamp = new Map<string, AgentDecision[]>()
  for (const d of decisions) {
    const existing = bycamp.get(d.campaignId) || []
    existing.push(d)
    bycamp.set(d.campaignId, existing)
  }

  const result: AgentDecision[] = []
  for (const [, group] of bycamp) {
    if (group.length === 1) {
      result.push(group[0])
      continue
    }

    const hasPause = group.find(d => d.action === 'pause_ad' || d.action === 'kill_campaign')
    const hasScale = group.find(d => d.action === 'scale_campaign')

    // Se um agente quer pausar e outro quer escalar: pausar vence (seguranca)
    if (hasPause && hasScale) {
      result.push(hasPause)
      continue
    }

    // Multiplos adjust_budget: pegar o de maior confianca
    const adjusts = group.filter(d => d.action === 'adjust_budget')
    if (adjusts.length > 1) {
      adjusts.sort((a, b) => b.confidence - a.confidence)
      result.push(adjusts[0])
      const alerts = group.filter(d => d.action === 'send_alert')
      result.push(...alerts)
      continue
    }

    // Sem conflito: manter todas
    result.push(...group)
  }

  return result
}
