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

// Leads: analisa geracao de leads e custo por lead
export function analyzeLeads(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue
    const cpl = camp.metrics.conversions > 0 ? camp.metrics.spend / camp.metrics.conversions : Infinity

    // Muitos cliques sem conversao: problema no formulario/landing page
    if (camp.metrics.clicks > 50 && camp.metrics.conversions === 0 && camp.daysRunning >= 3) {
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

    // Custo por lead 2.5x acima da media: reduzir budget
    if (cpl > ctx.avgCPA * 2.5 && ctx.avgCPA > 0 && camp.metrics.conversions >= 2) {
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

    // Bom volume de leads com custo baixo: escalar
    if (camp.metrics.conversions >= 5 && cpl < ctx.avgCPA * 0.6 && ctx.avgCPA > 0 && camp.daysRunning >= 3) {
      decisions.push({
        agent: 'leads',
        campaignId: camp.id,
        campaignName: camp.name,
        action: 'scale_campaign',
        params: { multiplier: 1.25 },
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
export function analyzeSales(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    // ROAS bom mas conversoes caindo: oportunidade de retargeting
    if (camp.metrics.roas >= 2 && camp.trend.roasDelta < -20 && camp.metrics.conversions >= 3) {
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

    // Alta receita com custo controlado: campanha de vendas top performer
    if (camp.metrics.revenue > 0 && camp.metrics.roas >= 4 && camp.daysRunning >= 5) {
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

    // Gastando muito sem gerar receita: funil quebrado
    if (camp.metrics.spend > 80 && camp.metrics.revenue === 0 && camp.metrics.conversions === 0 && camp.daysRunning >= 4) {
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
export function analyzeTraffic(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 200) continue

    // CTR muito baixo: trafego de ma qualidade ou segmentacao ruim
    if (camp.metrics.ctr < 0.5 && camp.metrics.impressions > 1000) {
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

    // Spend subindo mas CTR caindo: trafego piorando
    if (camp.trend.spendDelta > 20 && camp.trend.ctrDelta < -25 && camp.metrics.spend > 30) {
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

    // CTR excelente acima da media: campanha eficiente em gerar trafego qualificado
    if (camp.metrics.ctr > ctx.avgCTR * 1.8 && ctx.avgCTR > 0 && camp.metrics.clicks > 30) {
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
export function analyzeRegistration(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    // Alto CTR mas zero conversoes: formulario com problema
    if (camp.metrics.ctr > 2 && camp.metrics.clicks > 30 && camp.metrics.conversions === 0 && camp.daysRunning >= 2) {
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

    // Custo por cadastro subindo rapido
    if (camp.trend.cpaDelta > 40 && camp.metrics.conversions >= 3) {
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

    // Bom custo por cadastro estavel: escalar
    if (camp.metrics.conversions >= 5 && camp.trend.cpaDelta <= 10 && camp.trend.cpaDelta >= -30) {
      const cpr = camp.metrics.spend / camp.metrics.conversions
      if (cpr < ctx.avgCPA * 0.7 && ctx.avgCPA > 0) {
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
export function analyzeApps(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    // Alto spend sem installs (conversoes)
    if (camp.metrics.spend > 60 && camp.metrics.conversions === 0 && camp.daysRunning >= 3) {
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

    // CPI (custo por instalacao) muito alto
    if (camp.metrics.conversions >= 3) {
      const cpi = camp.metrics.spend / camp.metrics.conversions
      if (cpi > ctx.avgCPA * 2 && ctx.avgCPA > 0) {
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

    // CPI baixo com volume: escalar
    if (camp.metrics.conversions >= 8) {
      const cpi = camp.metrics.spend / camp.metrics.conversions
      if (cpi < ctx.avgCPA * 0.5 && ctx.avgCPA > 0 && camp.daysRunning >= 4) {
        decisions.push({
          agent: 'apps',
          campaignId: camp.id,
          campaignName: camp.name,
          action: 'scale_campaign',
          params: { multiplier: 1.3 },
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
export function analyzeAwareness(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []
  const active = ctx.campaigns.filter(c => c.status === 'ACTIVE' && c.metrics.impressions > 0)
  if (active.length === 0) return decisions

  const avgCPM = active.reduce((s, c) => s + c.metrics.cpm, 0) / active.length

  for (const camp of active) {
    // CPM muito acima da media: alcance caro
    if (camp.metrics.cpm > avgCPM * 2.5 && avgCPM > 0 && camp.metrics.spend > 20) {
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

    // Bom alcance com CPM baixo: campanha de awareness eficiente
    if (camp.metrics.reach > 1000 && camp.metrics.cpm < avgCPM * 0.5 && avgCPM > 0) {
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

    // Alcance muito baixo com spend alto: publico esgotado
    if (camp.metrics.reach < 200 && camp.metrics.spend > 50 && camp.daysRunning >= 5) {
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
export function analyzeEngagement(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 500) continue

    // Muitas impressoes sem nenhum clique: conteudo nao engaja
    if (camp.metrics.impressions > 2000 && camp.metrics.clicks < 5) {
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

    // Engajamento caindo: fadiga de conteudo
    if (camp.trend.ctrDelta < -30 && camp.metrics.ctr < ctx.avgCTR * 0.7 && ctx.avgCTR > 0) {
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

    // Campanha com alto engajamento e conversao: escalar
    if (camp.metrics.ctr > ctx.avgCTR * 2 && ctx.avgCTR > 0 && camp.metrics.conversions >= 3 && camp.metrics.roas >= 1.5) {
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
export function analyzeFunnel(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.spend === 0) continue

    // Funil vazando: boas impressoes + cliques mas zero conversoes
    if (camp.metrics.clicks > 40 && camp.metrics.conversions === 0 && camp.metrics.spend > 40 && camp.daysRunning >= 3) {
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

    // Taxa de conversao caindo drasticamente
    if (camp.metrics.conversions >= 2 && camp.trend.cpaDelta > 60) {
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

    // Funil saudavel e eficiente: escalar
    if (camp.metrics.conversions >= 5 && camp.metrics.roas >= 2.5 && camp.trend.roasDelta >= -10 && camp.daysRunning >= 5) {
      const convRate = camp.metrics.clicks > 0 ? (camp.metrics.conversions / camp.metrics.clicks) * 100 : 0
      if (convRate > 3) {
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
export function analyzeCopy(ctx: AnalyzerContext): AgentDecision[] {
  const decisions: AgentDecision[] = []

  for (const camp of ctx.campaigns) {
    if (camp.status !== 'ACTIVE' || camp.metrics.impressions < 500) continue

    // CTR muito abaixo da media: copy nao atrai cliques
    if (camp.metrics.ctr < ctx.avgCTR * 0.4 && ctx.avgCTR > 0 && camp.metrics.impressions > 1000) {
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

    // CTR caindo rapido: copy cansou
    if (camp.trend.ctrDelta < -35 && camp.metrics.ctr < 1.5 && camp.daysRunning >= 7) {
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
