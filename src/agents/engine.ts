import { supabase } from '../lib/supabase'
import { hub } from './communication'
import * as db from '../lib/supabase-data'
import * as metaApi from '../lib/meta-api'
import type { AgentRole } from '../types/company'
import type { ActionType } from '../types/agent'

interface AutomationRule {
  id: string
  companyId: string
  name: string
  agentRole: string
  condition: string
  metric: string
  operator: string
  threshold: number
  action: string
  actionParams: Record<string, unknown>
  enabled: boolean
}

interface CampaignWithMetrics {
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
  }
}

export class AgentEngine {
  private running = false
  private intervalId: ReturnType<typeof setInterval> | null = null

  async start(intervalMs = 300000) {
    if (this.running) return
    this.running = true

    hub.send({
      from: 'orchestrator',
      to: 'broadcast',
      type: 'alert',
      priority: 'medium',
      subject: 'Motor de agentes iniciado',
      content: 'O motor de automacao foi ativado. Os agentes estao monitorando as campanhas.',
    })

    await this.runCycle()

    this.intervalId = setInterval(() => this.runCycle(), intervalMs)
  }

  stop() {
    this.running = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    hub.send({
      from: 'orchestrator',
      to: 'broadcast',
      type: 'alert',
      priority: 'medium',
      subject: 'Motor de agentes pausado',
      content: 'O motor de automacao foi pausado.',
    })
  }

  async runCycle() {
    try {
      const companies = await db.fetchCompanies()

      for (const company of companies) {
        if (company.status !== 'active') continue

        const config = await db.fetchMetaConfig(company.id)
        if (!config || config.status !== 'connected') continue

        const campaigns = await this.getCampaignsWithMetrics(company.id)
        const rules = await db.fetchAutomationRules(company.id)
        const enabledRules = rules.filter((r: AutomationRule) => r.enabled)

        for (const rule of enabledRules) {
          await this.evaluateRule(rule, campaigns, config, company.id)
        }

        await this.runBuiltInChecks(campaigns, config, company.id)
      }
    } catch (err) {
      console.error('Erro no ciclo do motor:', err)
      hub.send({
        from: 'orchestrator',
        to: 'broadcast',
        type: 'alert',
        priority: 'critical',
        subject: 'Erro no motor de agentes',
        content: `Ocorreu um erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      })
    }
  }

  private async getCampaignsWithMetrics(companyId: string): Promise<CampaignWithMetrics[]> {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'ACTIVE')

    if (!campaigns || campaigns.length === 0) return []

    const result: CampaignWithMetrics[] = []

    for (const camp of campaigns) {
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', camp.id)
        .order('date', { ascending: false })
        .limit(7)

      const totals = (metrics || []).reduce(
        (acc: Record<string, number>, m: Record<string, number>) => ({
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          spend: acc.spend + (m.spend || 0),
          conversions: acc.conversions + (m.conversions || 0),
          revenue: acc.revenue + (m.revenue || 0),
        }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
      )

      result.push({
        id: camp.id,
        companyId,
        name: camp.name,
        objective: camp.objective,
        status: camp.status,
        budget: camp.budget,
        metaCampaignId: camp.meta_campaign_id,
        metrics: {
          impressions: totals.impressions,
          clicks: totals.clicks,
          spend: totals.spend,
          conversions: totals.conversions,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
          cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
          roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
          frequency: 0,
        },
      })
    }

    return result
  }

  private async evaluateRule(
    rule: AutomationRule,
    campaigns: CampaignWithMetrics[],
    config: db.MetaConfig,
    companyId: string
  ) {
    for (const campaign of campaigns) {
      const metricValue = this.getMetricValue(campaign, rule.metric)
      if (metricValue === null) continue

      const triggered = this.checkCondition(metricValue, rule.operator, rule.threshold)
      if (!triggered) continue

      const agentRole = rule.agentRole as AgentRole
      const actionType = rule.action as ActionType

      hub.send({
        from: agentRole,
        to: 'orchestrator',
        type: 'alert',
        priority: 'high',
        subject: `Regra ativada: ${rule.name}`,
        content: `Campanha "${campaign.name}": ${rule.metric} = ${metricValue.toFixed(2)} ${rule.operator} ${rule.threshold}`,
        data: { campaignId: campaign.id, ruleId: rule.id, metricValue, threshold: rule.threshold },
      })

      await this.executeAction(actionType, campaign, config, agentRole, companyId, rule.actionParams)

      await supabase
        .from('automation_rules')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', rule.id)
    }
  }

  private async runBuiltInChecks(
    campaigns: CampaignWithMetrics[],
    config: db.MetaConfig,
    companyId: string
  ) {
    for (const campaign of campaigns) {
      if (campaign.metrics.ctr < 0.5 && campaign.metrics.impressions > 1000) {
        hub.send({
          from: 'analytics',
          to: 'creative',
          type: 'recommendation',
          priority: 'high',
          subject: `CTR baixo: ${campaign.name}`,
          content: `CTR de ${campaign.metrics.ctr.toFixed(2)}% esta abaixo do minimo. Recomendo revisar criativos.`,
          data: { campaignId: campaign.id, ctr: campaign.metrics.ctr },
        })
      }

      if (campaign.metrics.frequency > 3) {
        hub.send({
          from: 'audience',
          to: 'orchestrator',
          type: 'alert',
          priority: 'medium',
          subject: `Frequencia alta: ${campaign.name}`,
          content: `Frequencia de ${campaign.metrics.frequency.toFixed(1)}. Publico pode estar saturado.`,
          data: { campaignId: campaign.id, frequency: campaign.metrics.frequency },
        })
      }

      if (campaign.metrics.roas > 3 && campaign.metrics.spend > 50) {
        hub.send({
          from: 'budget',
          to: 'orchestrator',
          type: 'recommendation',
          priority: 'high',
          subject: `Oportunidade de escalar: ${campaign.name}`,
          content: `ROAS de ${campaign.metrics.roas.toFixed(2)}x com gasto de R$${campaign.metrics.spend.toFixed(2)}. Recomendo aumentar budget em 20%.`,
          data: { campaignId: campaign.id, roas: campaign.metrics.roas, spend: campaign.metrics.spend },
        })
      }

      if (campaign.metrics.conversions > 0 && campaign.metrics.spend / campaign.metrics.conversions > campaign.budget * 0.5) {
        hub.send({
          from: 'analytics',
          to: 'orchestrator',
          type: 'alert',
          priority: 'critical',
          subject: `CPA muito alto: ${campaign.name}`,
          content: `Custo por conversao de R$${(campaign.metrics.spend / campaign.metrics.conversions).toFixed(2)} esta muito alto.`,
          data: { campaignId: campaign.id, cpa: campaign.metrics.spend / campaign.metrics.conversions },
        })
      }
    }
  }

  private async executeAction(
    actionType: ActionType,
    campaign: CampaignWithMetrics,
    config: db.MetaConfig,
    agentRole: AgentRole,
    companyId: string,
    params: Record<string, unknown>
  ) {
    const opts = { accessToken: config.accessToken, adAccountId: config.adAccountId }

    try {
      let description = ''
      let result = ''

      switch (actionType) {
        case 'pause_ad': {
          if (campaign.metaCampaignId) {
            await metaApi.updateMetaCampaign(opts, campaign.metaCampaignId, { status: 'PAUSED' })
          }
          await db.updateCampaignStatus(campaign.id, 'PAUSED')
          description = `Pausou campanha "${campaign.name}"`
          result = 'Campanha pausada com sucesso'
          break
        }

        case 'activate_ad': {
          if (campaign.metaCampaignId) {
            await metaApi.updateMetaCampaign(opts, campaign.metaCampaignId, { status: 'ACTIVE' })
          }
          await db.updateCampaignStatus(campaign.id, 'ACTIVE')
          description = `Ativou campanha "${campaign.name}"`
          result = 'Campanha ativada com sucesso'
          break
        }

        case 'adjust_budget': {
          const multiplier = (params.multiplier as number) || 1.2
          const newBudget = Math.round(campaign.budget * multiplier * 100) / 100

          if (campaign.metaCampaignId) {
            await metaApi.updateMetaCampaign(opts, campaign.metaCampaignId, { dailyBudget: newBudget })
          }
          await db.updateCampaignBudget(campaign.id, newBudget)
          description = `Ajustou budget de "${campaign.name}" de R$${campaign.budget} para R$${newBudget}`
          result = `Budget atualizado: R$${campaign.budget} -> R$${newBudget}`
          break
        }

        case 'scale_campaign': {
          const scaleMultiplier = (params.multiplier as number) || 1.3
          const scaledBudget = Math.round(campaign.budget * scaleMultiplier * 100) / 100

          if (campaign.metaCampaignId) {
            await metaApi.updateMetaCampaign(opts, campaign.metaCampaignId, { dailyBudget: scaledBudget })
          }
          await db.updateCampaignBudget(campaign.id, scaledBudget)
          description = `Escalou campanha "${campaign.name}" com ${((scaleMultiplier - 1) * 100).toFixed(0)}% mais budget`
          result = `Budget escalado para R$${scaledBudget}`
          break
        }

        case 'kill_campaign': {
          if (campaign.metaCampaignId) {
            await metaApi.updateMetaCampaign(opts, campaign.metaCampaignId, { status: 'PAUSED' })
          }
          await db.updateCampaignStatus(campaign.id, 'ARCHIVED')
          description = `Encerrou campanha "${campaign.name}" por baixa performance`
          result = 'Campanha arquivada'
          break
        }

        case 'send_alert': {
          description = `Alerta enviado sobre "${campaign.name}"`
          result = params.message as string || 'Alerta enviado'
          break
        }

        default: {
          description = `Acao ${actionType} em "${campaign.name}"`
          result = 'Acao registrada'
        }
      }

      await db.createAction({
        agentRole,
        companyId,
        campaignId: campaign.id,
        type: actionType,
        description,
        status: 'completed',
        result,
      })

      hub.send({
        from: agentRole,
        to: 'broadcast',
        type: 'report',
        priority: 'medium',
        subject: `Acao executada: ${actionType}`,
        content: description,
        data: { campaignId: campaign.id, result },
      })

    } catch (err) {
      await db.createAction({
        agentRole,
        companyId,
        campaignId: campaign.id,
        type: actionType,
        description: `Falha ao executar ${actionType} em "${campaign.name}"`,
        status: 'failed',
        result: err instanceof Error ? err.message : 'Erro desconhecido',
      })

      hub.send({
        from: agentRole,
        to: 'orchestrator',
        type: 'alert',
        priority: 'critical',
        subject: `Falha na acao: ${actionType}`,
        content: `Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      })
    }
  }

  private getMetricValue(campaign: CampaignWithMetrics, metric: string): number | null {
    const map: Record<string, number> = {
      ctr: campaign.metrics.ctr,
      cpc: campaign.metrics.cpc,
      cpm: campaign.metrics.cpm,
      roas: campaign.metrics.roas,
      spend: campaign.metrics.spend,
      conversions: campaign.metrics.conversions,
      impressions: campaign.metrics.impressions,
      clicks: campaign.metrics.clicks,
      frequency: campaign.metrics.frequency,
      cpa: campaign.metrics.conversions > 0 ? campaign.metrics.spend / campaign.metrics.conversions : 0,
    }
    return map[metric] ?? null
  }

  private checkCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold
      case '<': return value < threshold
      case '>=': return value >= threshold
      case '<=': return value <= threshold
      case '==': return value === threshold
      case '!=': return value !== threshold
      default: return false
    }
  }
}

export const engine = new AgentEngine()
