import type { AgentRole } from '../types/company'
import type { ActionType } from '../types/agent'
import type { AgentThresholds } from '../lib/supabase-data'

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

export interface AnalyzerContext {
  campaigns: CampaignData[]
  totalBudget: number
  avgROAS: number
  avgCTR: number
  avgCPA: number
}

// Budget: redistribui verba de campanhas ruins para boas
export function analyzeBudget(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const minRoas = cfg.minRoasToScale ?? 3
  const scaleMult = cfg.scaleMultiplier ?? 1.2
  const maxRoas = cfg.maxRoasToCut ?? 0.8
  const cutMult = cfg.cutMultiplier ?? 0.7
  const cpaMult = cfg.cpaMultiplierThreshold ?? 3
  const cpaCut = cfg.cpaCutMultiplier ?? 0.5

  const decisions: AgentDecision[] = []
  const active = ctx.campaigns.filter(c => c.status === 'ACTIVE' && c.metrics.spend > 0)
  if (active.length < 2) return decisions

  for (const camp of active) {
    const cpa = camp.metrics.conversions > 0 ? camp.metrics.spend / camp.metrics.conversions : Infinity

    if (camp.metrics.roas >= minRoas && camp.metrics.spend >= 20 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'budget',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'scale_campaign',
        params: { multiplier: scaleMult },
        reason: `ROAS de ${camp.metrics.roas.toFixed(1)}x com R$${camp.metrics.spend.toFixed(0)} gastos. Performance consistente para escalar.`,
        confidence: Math.min(0.95, 0.7 + (camp.metrics.roas - minRoas) * 0.05),
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * scaleMult).toFixed(0)}`,
      })
    }

    if (camp.metrics.roas < maxRoas && camp.metrics.spend > 50 && camp.daysRunning >= 5) {
      decisions.push({
        agent: 'budget',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: cutMult },
        reason: `ROAS de ${camp.metrics.roas.toFixed(2)}x abaixo de ${maxRoas}. Queimando budget sem retorno.`,
        confidence: 0.85,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * cutMult).toFixed(0)}`,
      })
    }

    if (cpa > ctx.avgCPA * cpaMult && ctx.avgCPA > 0 && camp.metrics.conversions >= 3) {
      decisions.push({
        agent: 'budget',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: cpaCut },
        reason: `CPA de R$${cpa.toFixed(2)} esta ${cpaMult}x acima da media (R$${ctx.avgCPA.toFixed(2)}). Reduzindo budget.`,
        confidence: 0.8,
        priority: 'critical',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * cpaCut).toFixed(0)}`,
      })
    }
  }

  return decisions
}

// Analytics: detecta anomalias e tendencias perigosas
export function analyzePerformance(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const ctrDropAlert = cfg.ctrDropAlertPercent ?? 40
  const cpaRiseAlert = cfg.cpaRiseAlertPercent ?? 50
  const maxSpendNoConv = cfg.maxSpendNoConversions ?? 100
  const minDaysNoConv = cfg.minDaysNoConversions ?? 5
  const roasDropCut = cfg.roasDropCutPercent ?? 50

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    if (camp.trend.ctrDelta < -ctrDropAlert && camp.metrics.impressions > 500) {
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

    if (camp.trend.cpaDelta > cpaRiseAlert && camp.metrics.conversions >= 2) {
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

    if (camp.metrics.spend > maxSpendNoConv && camp.metrics.conversions === 0 && camp.daysRunning >= minDaysNoConv) {
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

    if (camp.trend.roasDelta < -roasDropCut && camp.metrics.roas < 1.5 && camp.metrics.spend > 30) {
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
export function analyzeAudience(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const freqAlert = cfg.frequencyAlertThreshold ?? 4
  const freqPause = cfg.frequencyPauseThreshold ?? 6
  const minCtr = cfg.minCtrToPause ?? 1

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE') continue

    if (camp.metrics.frequency > freqAlert && camp.metrics.reach > 500) {
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

    if (camp.metrics.frequency > freqPause && camp.metrics.ctr < minCtr) {
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
export function analyzeCreatives(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const ctrBelowPct = (cfg.ctrBelowAvgPercent ?? 50) / 100
  const cpcAboveMult = cfg.cpcAboveAvgMultiplier ?? 3

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 500) continue

    if (camp.metrics.ctr < ctx.avgCTR * (1 - ctrBelowPct) && ctx.avgCTR > 0) {
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

    if (camp.metrics.cpc > ctx.avgCTR * cpcAboveMult && camp.metrics.clicks > 10) {
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
export function analyzeOrchestrator(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const minDaysNoImp = cfg.minDaysNoImpressions ?? 3
  const minRoas = cfg.minRoasToScale ?? 5
  const scaleMult = cfg.scaleMultiplier ?? 1.3

  const decisions: AgentDecision[] = []
  const active = ctx.campaigns.filter(c => c.status === 'ACTIVE')

  for (const camp of active) {
    if (camp.metrics.impressions === 0 && camp.daysRunning >= minDaysNoImp) {
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
      if (top.metrics.roas >= minRoas && top.daysRunning >= 5) {
        decisions.push({
          agent: 'orchestrator',
          campaignId: top.id,
          campaignName: top.name,
          action: 'scale_campaign',
          params: { multiplier: scaleMult },
          reason: `Melhor campanha da conta com ROAS ${top.metrics.roas.toFixed(1)}x. Escalando ${((scaleMult - 1) * 100).toFixed(0)}% para maximizar retorno.`,
          confidence: 0.9,
          priority: 'high',
          impact: `Budget de R$${top.budget} → R$${(top.budget * scaleMult).toFixed(0)}`,
        })
      }
    }
  }

  return decisions
}

// Leads: analisa geracao de leads e custo por lead
export function analyzeLeads(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const minClicksNoConv = cfg.minClicksNoConversion ?? 50
  const cplAboveMult = cfg.cplAboveAvgMultiplier ?? 2.5
  const cplBelowPct = (cfg.cplBelowAvgPercent ?? 60) / 100
  const scaleMult = cfg.scaleMultiplier ?? 1.25

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue
    const cpl = camp.metrics.conversions > 0 ? camp.metrics.spend / camp.metrics.conversions : Infinity

    if (camp.metrics.clicks > minClicksNoConv && camp.metrics.conversions === 0 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'leads',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `${camp.metrics.clicks} cliques sem nenhum lead. Verificar formulario e landing page.` },
        reason: `Campanha gerando trafego (${camp.metrics.clicks} cliques) mas zero conversoes. Possivel problema no formulario de captura.`,
        confidence: 0.85,
        priority: 'high',
        impact: 'Verificar fluxo de captura de leads',
      })
    }

    if (cpl > ctx.avgCPA * cplAboveMult && ctx.avgCPA > 0 && camp.metrics.conversions >= 2) {
      decisions.push({
        agent: 'leads',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.6 },
        reason: `Custo por lead de R$${cpl.toFixed(2)} esta 2.5x acima da media (R$${ctx.avgCPA.toFixed(2)}). Lead caro demais.`,
        confidence: 0.8,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.6).toFixed(0)}`,
      })
    }

    if (camp.metrics.conversions >= 5 && cpl < ctx.avgCPA * (1 - cplBelowPct) && ctx.avgCPA > 0 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'leads',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'scale_campaign',
        params: { multiplier: scaleMult },
        reason: `Custo por lead de R$${cpl.toFixed(2)} — ${((1 - cpl / ctx.avgCPA) * 100).toFixed(0)}% abaixo da media. Maquina de leads eficiente.`,
        confidence: 0.85,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.25).toFixed(0)}`,
      })
    }
  }

  return decisions
}

// Sales: analisa conversao em vendas e oportunidades de retargeting
export function analyzeSales(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const roasDropRetarget = cfg.roasDropRetargetPercent ?? 20
  const minRoasScale = cfg.minRoasToScale ?? 4
  const maxSpendNoRev = cfg.maxSpendNoRevenue ?? 80

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    if (camp.metrics.roas >= 2 && camp.trend.roasDelta < -roasDropRetarget && camp.metrics.conversions >= 3) {
      decisions.push({
        agent: 'sales',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `ROAS de ${camp.metrics.roas.toFixed(1)}x mas caindo ${Math.abs(camp.trend.roasDelta).toFixed(0)}%. Ativar retargeting para recuperar conversoes.` },
        reason: `Campanha rentavel (ROAS ${camp.metrics.roas.toFixed(1)}x) mas com tendencia de queda. Retargeting pode reativar conversoes.`,
        confidence: 0.8,
        priority: 'high',
        impact: 'Recomendacao de retargeting',
      })
    }

    if (camp.metrics.revenue > 0 && camp.metrics.roas >= minRoasScale && camp.daysRunning >= 5) {
      decisions.push({
        agent: 'sales',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'scale_campaign',
        params: { multiplier: 1.2 },
        reason: `Maquina de vendas com ROAS ${camp.metrics.roas.toFixed(1)}x e R$${camp.metrics.revenue.toFixed(0)} de receita. Escalar para maximizar vendas.`,
        confidence: 0.85,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.2).toFixed(0)}`,
      })
    }

    if (camp.metrics.spend > maxSpendNoRev && camp.metrics.revenue === 0 && camp.metrics.conversions === 0 && camp.daysRunning >= 4) {
      decisions.push({
        agent: 'sales',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'pause_ad',
        params: {},
        reason: `R$${camp.metrics.spend.toFixed(0)} investidos sem gerar nenhuma venda em ${camp.daysRunning} dias. Funil de vendas quebrado.`,
        confidence: 0.85,
        priority: 'critical',
        impact: 'Pausar campanha sem retorno de vendas',
      })
    }
  }

  return decisions
}

// Traffic: analisa qualidade do trafego e eficiencia dos cliques
export function analyzeTraffic(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const minCtrAlert = cfg.minCtrAlert ?? 0.5
  const spendRise = cfg.spendRisePercent ?? 20
  const ctrDrop = cfg.ctrDropPercent ?? 25
  const ctrAboveMult = cfg.ctrAboveAvgMultiplier ?? 1.8

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 200) continue

    if (camp.metrics.ctr < minCtrAlert && camp.metrics.impressions > 1000) {
      decisions.push({
        agent: 'traffic',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR de ${camp.metrics.ctr.toFixed(2)}% com ${camp.metrics.impressions.toLocaleString()} impressoes. Segmentacao ou criativo inadequado para o publico.` },
        reason: `CTR de ${camp.metrics.ctr.toFixed(2)}% indica que o anuncio nao esta atraindo cliques. Trafego desperdicado.`,
        confidence: 0.8,
        priority: 'medium',
        impact: 'Revisar segmentacao e posicionamento',
      })
    }

    if (camp.trend.spendDelta > spendRise && camp.trend.ctrDelta < -ctrDrop && camp.metrics.spend > 30) {
      decisions.push({
        agent: 'traffic',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.7 },
        reason: `Gasto subiu ${camp.trend.spendDelta.toFixed(0)}% mas CTR caiu ${Math.abs(camp.trend.ctrDelta).toFixed(0)}%. Pagando mais por trafego pior.`,
        confidence: 0.8,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.7).toFixed(0)}`,
      })
    }

    if (camp.metrics.ctr > ctx.avgCTR * ctrAboveMult && ctx.avgCTR > 0 && camp.metrics.clicks > 30) {
      decisions.push({
        agent: 'traffic',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR de ${camp.metrics.ctr.toFixed(2)}% — ${((camp.metrics.ctr / ctx.avgCTR - 1) * 100).toFixed(0)}% acima da media. Trafego altamente qualificado.` },
        reason: `CTR excepcional indica forte alinhamento entre criativo, copy e publico alvo.`,
        confidence: 0.75,
        priority: 'low',
        impact: 'Benchmark positivo para outras campanhas',
      })
    }
  }

  return decisions
}

// Registration: analisa campanhas de cadastro e signup
export function analyzeRegistration(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const minCtrForm = cfg.minCtrFormAlert ?? 2
  const cpaRise = cfg.cpaRisePercent ?? 40
  const cprBelowPct = (cfg.cprBelowAvgPercent ?? 70) / 100

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    if (camp.metrics.ctr > minCtrForm && camp.metrics.clicks > 30 && camp.metrics.conversions === 0 && camp.daysRunning >= 2) {
      decisions.push({
        agent: 'registration',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR de ${camp.metrics.ctr.toFixed(1)}% com ${camp.metrics.clicks} cliques mas zero cadastros. Formulario com atrito ou erro tecnico.` },
        reason: `Publico interessado (CTR alto) mas ninguem converte. Sinal forte de problema no formulario de cadastro.`,
        confidence: 0.9,
        priority: 'critical',
        impact: 'Investigar formulario de cadastro urgente',
      })
    }

    if (camp.trend.cpaDelta > cpaRise && camp.metrics.conversions >= 3) {
      const cpr = camp.metrics.spend / camp.metrics.conversions
      decisions.push({
        agent: 'registration',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.75 },
        reason: `Custo por cadastro subiu ${camp.trend.cpaDelta.toFixed(0)}% (R$${cpr.toFixed(2)}/cadastro). Eficiencia caindo.`,
        confidence: 0.8,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.75).toFixed(0)}`,
      })
    }

    if (camp.metrics.conversions >= 5 && camp.trend.cpaDelta <= 10 && camp.trend.cpaDelta >= -30) {
      const cpr = camp.metrics.spend / camp.metrics.conversions
      if (cpr < ctx.avgCPA * (1 - cprBelowPct) && ctx.avgCPA > 0) {
        decisions.push({
          agent: 'registration',
          campaignId: camp.id,
          campaignName: camp.name,
          action: 'scale_campaign',
          params: { multiplier: 1.2 },
          reason: `Custo por cadastro de R$${cpr.toFixed(2)} estavel e abaixo da media. Campanha eficiente para escalar.`,
          confidence: 0.8,
          priority: 'medium',
          impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.2).toFixed(0)}`,
        })
      }
    }
  }

  return decisions
}

// Apps: analisa campanhas de instalacao de app
export function analyzeApps(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const maxSpendNoInst = cfg.maxSpendNoInstall ?? 60
  const cpiAboveMult = cfg.cpiAboveAvgMultiplier ?? 2
  const cpiBelowPct = (cfg.cpiBelowAvgPercent ?? 50) / 100
  const scaleMult = cfg.scaleMultiplier ?? 1.3

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    if (camp.metrics.spend > maxSpendNoInst && camp.metrics.conversions === 0 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'apps',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'pause_ad',
        params: {},
        reason: `R$${camp.metrics.spend.toFixed(0)} gastos sem nenhuma instalacao em ${camp.daysRunning} dias. Campanha de app ineficiente.`,
        confidence: 0.85,
        priority: 'critical',
        impact: 'Pausar campanha de app sem resultado',
      })
    }

    if (camp.metrics.conversions >= 3) {
      const cpi = camp.metrics.spend / camp.metrics.conversions
      if (cpi > ctx.avgCPA * cpiAboveMult && ctx.avgCPA > 0) {
        decisions.push({
          agent: 'apps',
          campaignId: camp.id,
          campaignName: camp.name,
          action: 'adjust_budget',
          params: { multiplier: 0.6 },
          reason: `Custo por instalacao de R$${cpi.toFixed(2)} — 2x acima da media. App nao esta convertendo bem nessa segmentacao.`,
          confidence: 0.8,
          priority: 'high',
          impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.6).toFixed(0)}`,
        })
      }
    }

    if (camp.metrics.conversions >= 8) {
      const cpi = camp.metrics.spend / camp.metrics.conversions
      if (cpi < ctx.avgCPA * (1 - cpiBelowPct) && ctx.avgCPA > 0 && camp.daysRunning >= 4) {
        decisions.push({
          agent: 'apps',
          campaignId: camp.id,
          campaignName: camp.name,
          action: 'scale_campaign',
          params: { multiplier: scaleMult },
          reason: `CPI de R$${cpi.toFixed(2)} — metade da media. Volume alto de instalacoes para escalar.`,
          confidence: 0.85,
          priority: 'high',
          impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.3).toFixed(0)}`,
        })
      }
    }
  }

  return decisions
}

// Awareness: analisa alcance, CPM e eficiencia de marca
export function analyzeAwareness(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const cpmAboveMult = cfg.cpmAboveAvgMultiplier ?? 2.5
  const cpmBelowPct = (cfg.cpmBelowAvgPercent ?? 50) / 100
  const minReach = cfg.minReachToScale ?? 1000
  const maxSpendLow = cfg.maxSpendLowReach ?? 50

  const decisions: AgentDecision[] = []
  const active = ctx.campaigns.filter(c => c.status === 'ACTIVE' && c.metrics.impressions > 0)
  if (active.length === 0) return decisions

  const avgCPM = active.reduce((s, c) => s + c.metrics.cpm, 0) / active.length

  for (const camp of active) {
    if (camp.metrics.cpm > avgCPM * cpmAboveMult && avgCPM > 0 && camp.metrics.spend > 20) {
      decisions.push({
        agent: 'awareness',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CPM de R$${camp.metrics.cpm.toFixed(2)} esta ${((camp.metrics.cpm / avgCPM - 1) * 100).toFixed(0)}% acima da media. Alcance muito caro.` },
        reason: `CPM elevado indica segmentacao muito restrita ou leilao competitivo. Custo por mil impressoes acima do sustentavel.`,
        confidence: 0.8,
        priority: 'high',
        impact: 'Revisar segmentacao para reduzir CPM',
      })
    }

    if (camp.metrics.reach > minReach && camp.metrics.cpm < avgCPM * (1 - cpmBelowPct) && avgCPM > 0) {
      decisions.push({
        agent: 'awareness',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'scale_campaign',
        params: { multiplier: 1.25 },
        reason: `CPM de R$${camp.metrics.cpm.toFixed(2)} com alcance de ${camp.metrics.reach.toLocaleString()} pessoas. Awareness eficiente para escalar.`,
        confidence: 0.8,
        priority: 'medium',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.25).toFixed(0)}`,
      })
    }

    if (camp.metrics.reach < 200 && camp.metrics.spend > maxSpendLow && camp.daysRunning >= 5) {
      decisions.push({
        agent: 'awareness',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.5 },
        reason: `Apenas ${camp.metrics.reach} pessoas alcancadas com R$${camp.metrics.spend.toFixed(0)} gastos. Publico muito pequeno ou esgotado.`,
        confidence: 0.85,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.5).toFixed(0)}`,
      })
    }
  }

  return decisions
}

// Engagement: analisa interacao e engajamento do publico
export function analyzeEngagement(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const minImpNoClicks = cfg.minImpressionsNoClicks ?? 2000
  const maxClicks = cfg.maxClicksForAlert ?? 5
  const ctrDrop = cfg.ctrDropPercent ?? 30
  const ctrAboveMult = cfg.ctrAboveAvgMultiplier ?? 2

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 500) continue

    if (camp.metrics.impressions > minImpNoClicks && camp.metrics.clicks < maxClicks) {
      decisions.push({
        agent: 'engagement',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `${camp.metrics.impressions.toLocaleString()} impressoes com apenas ${camp.metrics.clicks} cliques. Conteudo nao gera interacao.` },
        reason: `Taxa de interacao quase zero. Criativo ou mensagem nao ressoa com o publico.`,
        confidence: 0.85,
        priority: 'high',
        impact: 'Trocar criativos e copy para gerar engajamento',
      })
    }

    if (camp.trend.ctrDelta < -ctrDrop && camp.metrics.ctr < ctx.avgCTR * 0.7 && ctx.avgCTR > 0) {
      decisions.push({
        agent: 'engagement',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `Engajamento caiu ${Math.abs(camp.trend.ctrDelta).toFixed(0)}% e esta abaixo da media. Renovar conteudo.` },
        reason: `Fadiga de conteudo detectada. Publico perdendo interesse nos criativos atuais.`,
        confidence: 0.8,
        priority: 'medium',
        impact: 'Criar novos criativos e formatos',
      })
    }

    if (camp.metrics.ctr > ctx.avgCTR * ctrAboveMult && ctx.avgCTR > 0 && camp.metrics.conversions >= 3 && camp.metrics.roas >= 1.5) {
      decisions.push({
        agent: 'engagement',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'scale_campaign',
        params: { multiplier: 1.2 },
        reason: `Engajamento ${((camp.metrics.ctr / ctx.avgCTR - 1) * 100).toFixed(0)}% acima da media com ROAS ${camp.metrics.roas.toFixed(1)}x. Conteudo performando excelente.`,
        confidence: 0.85,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.2).toFixed(0)}`,
      })
    }
  }

  return decisions
}

// Funnel: analisa funil completo e identifica gargalos
export function analyzeFunnel(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const minClicksNoConv = cfg.minClicksNoConversion ?? 40
  const cpaRise = cfg.cpaRisePercent ?? 60
  const minConvRate = cfg.minConvRateToScale ?? 3

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    if (camp.metrics.clicks > minClicksNoConv && camp.metrics.conversions === 0 && camp.metrics.spend > 40 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'funnel',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `Funil vazando: ${camp.metrics.clicks} cliques → 0 conversoes. Problema entre clique e conversao (landing page, checkout, formulario).` },
        reason: `Topo de funil funcionando (${camp.metrics.clicks} cliques) mas fundo quebrado. Investigar landing page e fluxo pos-clique.`,
        confidence: 0.9,
        priority: 'critical',
        impact: 'Diagnosticar e corrigir funil de conversao',
      })
    }

    if (camp.metrics.conversions >= 2 && camp.trend.cpaDelta > cpaRise) {
      decisions.push({
        agent: 'funnel',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'adjust_budget',
        params: { multiplier: 0.7 },
        reason: `CPA subiu ${camp.trend.cpaDelta.toFixed(0)}% — funil degradando. Cada conversao esta custando muito mais.`,
        confidence: 0.8,
        priority: 'high',
        impact: `Budget de R$${camp.budget} → R$${(camp.budget * 0.7).toFixed(0)}`,
      })
    }

    if (camp.metrics.conversions >= 5 && camp.metrics.roas >= 2.5 && camp.trend.roasDelta >= -10 && camp.daysRunning >= 5) {
      const convRate = camp.metrics.clicks > 0 ? (camp.metrics.conversions / camp.metrics.clicks) * 100 : 0
      if (convRate > minConvRate) {
        decisions.push({
          agent: 'funnel',
          campaignId: camp.id,
          campaignName: camp.name,
          action: 'scale_campaign',
          params: { multiplier: 1.25 },
          reason: `Funil saudavel: ${convRate.toFixed(1)}% de conversao com ROAS ${camp.metrics.roas.toFixed(1)}x estavel. Escalar com seguranca.`,
          confidence: 0.85,
          priority: 'high',
          impact: `Budget de R$${camp.budget} → R$${(camp.budget * 1.25).toFixed(0)}`,
        })
      }
    }
  }

  return decisions
}

// Copy: analisa eficacia da copy e mensagem dos anuncios
export function analyzeCopy(ctx: AnalyzerContext, cfg: AgentThresholds = {}): AgentDecision[] {
  const ctrBelowPct = (cfg.ctrBelowAvgPercent ?? 40) / 100
  const ctrDropPct = cfg.ctrDropPercent ?? 35
  const minDaysFatigue = cfg.minDaysCopyFatigue ?? 7

  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 500) continue

    if (camp.metrics.ctr < ctx.avgCTR * (1 - ctrBelowPct) && ctx.avgCTR > 0 && camp.metrics.impressions > 1000) {
      decisions.push({
        agent: 'copy',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR de ${camp.metrics.ctr.toFixed(2)}% — ${((1 - camp.metrics.ctr / ctx.avgCTR) * 100).toFixed(0)}% abaixo da media. Copy nao esta gerando interesse. Testar novas headlines e CTAs.` },
        reason: `Copy fraca: CTR muito abaixo indica que headline, descricao ou CTA nao ressoam com o publico.`,
        confidence: 0.8,
        priority: 'medium',
        impact: 'A/B test com novas copys',
      })
    }

    // Alto CTR mas zero conversao: copy enganosa ou desalinhada
    if (camp.metrics.ctr > ctx.avgCTR * 2 && ctx.avgCTR > 0 && camp.metrics.clicks > 30 && camp.metrics.conversions === 0 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'copy',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR alto (${camp.metrics.ctr.toFixed(1)}%) mas zero conversoes. Copy atrai cliques mas promessa nao se cumpre na landing page.` },
        reason: `Desalinhamento entre promessa do anuncio e experiencia pos-clique. Copy atraente mas enganosa ou landing page nao entrega.`,
        confidence: 0.85,
        priority: 'high',
        impact: 'Alinhar mensagem do anuncio com landing page',
      })
    }

    if (camp.trend.ctrDelta < -ctrDropPct && camp.metrics.ctr < 1.5 && camp.daysRunning >= minDaysFatigue) {
      decisions.push({
        agent: 'copy',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'send_alert',
        params: { message: `CTR caiu ${Math.abs(camp.trend.ctrDelta).toFixed(0)}% em 7+ dias. Copy ja cansou. Hora de testar novas variacoes.` },
        reason: `Desgaste de copy apos ${camp.daysRunning} dias. Publico ja viu a mesma mensagem muitas vezes.`,
        confidence: 0.8,
        priority: 'medium',
        impact: 'Criar novas variacoes de copy',
      })
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
