import { supabase } from '../lib/supabase'
import { hub } from './communication'
import * as db from '../lib/supabase-data'
import * as metaApi from '../lib/meta-api'
import { createTask, startTask, completeTask, failTask } from '../lib/task-engine'
import { checkPermission, setCooldown } from '../lib/permission-engine'
import { journeyLog } from '../lib/journey-log'
import type { AgentRole } from '../types/company'
import type { ActionType } from '../types/agent'
import {
  type CampaignData,
  type AgentDecision,
  type AnalyzerContext,
  analyzeBudget,
  analyzePerformance,
  analyzeAudience,
  analyzeCreatives,
  analyzeOrchestrator,
  analyzeLeads,
  analyzeSales,
  analyzeTraffic,
  analyzeRegistration,
  analyzeApps,
  analyzeAwareness,
  analyzeEngagement,
  analyzeFunnel,
  analyzeCopy,
  deduplicateDecisions,
} from './analyzers'
import type { AgentThresholds } from '../lib/supabase-data'

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

const analyzerNames: Record<string, string> = {
  budget: 'Gestor de Orcamento',
  analytics: 'Analista de Dados',
  audience: 'Analista de Publico',
  creative: 'Analista de Criativos',
  orchestrator: 'Diretor',
  leads: 'Agente de Leads',
  sales: 'Agente de Vendas',
  traffic: 'Agente de Trafego',
  registration: 'Agente de Cadastros',
  apps: 'Agente de Apps',
  awareness: 'Agente de Awareness',
  engagement: 'Agente de Engajamento',
  funnel: 'Agente de Funil',
  copy: 'Agente de Copy',
}

export class AgentEngine {
  private running = false
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastCycleDecisions: AgentDecision[] = []

  getLastDecisions(): AgentDecision[] {
    return this.lastCycleDecisions
  }

  isRunning(): boolean {
    return this.running
  }

  async start(intervalMs = 300000) {
    if (this.running) return
    this.running = true

    hub.send({
      from: 'orchestrator',
      to: 'broadcast',
      type: 'alert',
      priority: 'medium',
      subject: 'Orquestra IA ativada',
      content: `Motor autonomo iniciado. 14 agentes analisando campanhas a cada ${Math.round(intervalMs / 60000)} minutos.`,
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
      subject: 'Orquestra IA pausada',
      content: 'Motor autonomo pausado. Agentes em standby.',
    })
  }

  async runCycle() {
    const taskId = await createTask('cycle', 'interval')
    await startTask(taskId)
    journeyLog.resetCounter(taskId)

    const cycleStart = Date.now()
    let totalDecisions = 0
    let totalExecuted = 0
    let totalRejected = 0

    try {
      const companies = await db.fetchCompanies()

      for (const company of companies) {
        if (company.status !== 'active') continue

        const config = await db.fetchMetaConfig(company.id)
        if (!config || config.status !== 'connected') continue

        const loadStart = Date.now()
        const campaigns = await this.loadCampaignData(company.id)
        if (campaigns.length === 0) continue

        await journeyLog.logDataLoaded(taskId, company.id, campaigns.length, Date.now() - loadStart)

        // 1. Regras manuais do usuario
        const rules = await db.fetchAutomationRules(company.id)
        const enabledRules = rules.filter((r: AutomationRule) => r.enabled)
        for (const rule of enabledRules) {
          await this.evaluateRule(taskId, rule, campaigns, config, company.id)
        }

        // 2. Analyzers autonomos
        const ctx = this.buildContext(campaigns)
        const agentConfigs = await db.fetchAgentConfigs(company.id)

        const analyzerRuns: Array<{ id: string; role: string; fn: (ctx: AnalyzerContext, cfg?: AgentThresholds) => AgentDecision[] }> = [
          { id: 'analyzeBudget', role: 'budget', fn: analyzeBudget },
          { id: 'analyzePerformance', role: 'analytics', fn: analyzePerformance },
          { id: 'analyzeAudience', role: 'audience', fn: analyzeAudience },
          { id: 'analyzeCreatives', role: 'creative', fn: analyzeCreatives },
          { id: 'analyzeOrchestrator', role: 'orchestrator', fn: analyzeOrchestrator },
          { id: 'analyzeLeads', role: 'leads', fn: analyzeLeads },
          { id: 'analyzeSales', role: 'sales', fn: analyzeSales },
          { id: 'analyzeTraffic', role: 'traffic', fn: analyzeTraffic },
          { id: 'analyzeRegistration', role: 'registration', fn: analyzeRegistration },
          { id: 'analyzeApps', role: 'apps', fn: analyzeApps },
          { id: 'analyzeAwareness', role: 'awareness', fn: analyzeAwareness },
          { id: 'analyzeEngagement', role: 'engagement', fn: analyzeEngagement },
          { id: 'analyzeFunnel', role: 'funnel', fn: analyzeFunnel },
          { id: 'analyzeCopy', role: 'copy', fn: analyzeCopy },
        ]

        const rawDecisions: AgentDecision[] = []
        for (const analyzer of analyzerRuns) {
          const { thresholds, enabled } = db.getAgentConfigWithDefaults(agentConfigs, analyzer.role)
          if (!enabled) continue
          const t0 = Date.now()
          const decisions = analyzer.fn(ctx, thresholds)
          rawDecisions.push(...decisions)
          await journeyLog.logSkillExecuted(taskId, company.id, analyzer.id, analyzer.role, decisions.length, Date.now() - t0)
        }

        // 3. Dedup
        const beforeDedup = rawDecisions.length
        const decisions = deduplicateDecisions(rawDecisions)
        if (beforeDedup !== decisions.length) {
          const removed = rawDecisions
            .filter(d => !decisions.includes(d))
            .map(d => `${d.action}:${d.campaignName}`)
          await journeyLog.logConflictResolved(taskId, company.id, beforeDedup, decisions.length, removed)
        }

        totalDecisions += decisions.length

        // 4. Permission check (substitui guardrails hardcoded)
        const approved: AgentDecision[] = []
        for (const decision of decisions) {
          const campaign = campaigns.find(c => c.id === decision.campaignId)
          if (!campaign) continue

          let budgetChangePercent: number | undefined
          if (decision.action === 'adjust_budget' || decision.action === 'scale_campaign') {
            const multiplier = (decision.params.multiplier as number) || 1
            budgetChangePercent = Math.abs(multiplier - 1) * 100
          }

          const permission = await checkPermission(
            company.id,
            decision.action,
            decision.agent,
            {
              confidence: decision.confidence,
              campaignId: decision.campaignId,
              daysRunning: campaign.daysRunning,
              totalSpend: campaign.metrics.spend,
              budgetChangePercent,
            }
          )

          await journeyLog.logPermissionChecked(
            taskId, company.id, decision.agent, decision.action,
            decision.campaignId, permission.allowed, permission.reason
          )

          if (permission.allowed) {
            approved.push(decision)
            await journeyLog.logDecisionMade(
              taskId, company.id, decision.agent, decision.action,
              decision.campaignId, decision.reason, decision.confidence
            )
          } else {
            totalRejected++
          }
        }

        await journeyLog.logGuardrailApplied(taskId, company.id, decisions.length, approved.length, decisions.length - approved.length)

        // 5. Executar acoes aprovadas (max 5 por empresa por ciclo)
        let actionsThisCycle = 0
        for (const decision of approved) {
          if (actionsThisCycle >= 5) break

          const campaign = campaigns.find(c => c.id === decision.campaignId)
          if (!campaign) continue

          hub.send({
            from: decision.agent,
            to: 'orchestrator',
            type: decision.action === 'send_alert' ? 'alert' : 'recommendation',
            priority: decision.priority,
            subject: `[${analyzerNames[decision.agent] || decision.agent}] ${decision.campaignName}`,
            content: decision.reason,
            data: {
              campaignId: decision.campaignId,
              action: decision.action,
              confidence: decision.confidence,
              impact: decision.impact,
            },
          })

          await this.executeDecision(taskId, decision, campaign, config, company.id)
          actionsThisCycle++
          totalExecuted++
        }

        this.lastCycleDecisions = approved
      }

      const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1)

      await completeTask(taskId, { elapsed, companies: 'all' }, {
        proposed: totalDecisions,
        executed: totalExecuted,
        rejected: totalRejected,
      })

      if (totalDecisions > 0) {
        hub.send({
          from: 'orchestrator',
          to: 'broadcast',
          type: 'report',
          priority: 'low',
          subject: `Ciclo concluido em ${elapsed}s`,
          content: `${totalDecisions} decisoes analisadas, ${totalExecuted} executadas, ${totalRejected} rejeitadas por policy.`,
        })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      await failTask(taskId, errorMsg)

      console.error('Erro no ciclo do motor:', err)
      hub.send({
        from: 'orchestrator',
        to: 'broadcast',
        type: 'alert',
        priority: 'critical',
        subject: 'Erro no motor de agentes',
        content: `Ocorreu um erro: ${errorMsg}`,
      })
    }
  }

  private async loadCampaignData(companyId: string): Promise<CampaignData[]> {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('company_id', companyId)

    if (!campaigns || campaigns.length === 0) return []

    const campaignIds = campaigns.map((c: Record<string, unknown>) => c.id as string)
    const { data: allMetrics } = await supabase
      .from('campaign_metrics')
      .select('*')
      .in('campaign_id', campaignIds)
      .order('date', { ascending: false })

    const result: CampaignData[] = []

    for (const camp of campaigns) {
      const metrics = (allMetrics || []).filter(
        (m: Record<string, unknown>) => m.campaign_id === camp.id
      )

      const recent = metrics.slice(0, 7)
      const older = metrics.slice(7, 14)

      const totals = this.sumMetrics(recent)
      const oldTotals = this.sumMetrics(older)

      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
      const oldCtr = oldTotals.impressions > 0 ? (oldTotals.clicks / oldTotals.impressions) * 100 : 0
      const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0
      const oldCpa = oldTotals.conversions > 0 ? oldTotals.spend / oldTotals.conversions : 0
      const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0
      const oldRoas = oldTotals.spend > 0 ? oldTotals.revenue / oldTotals.spend : 0

      const startDate = camp.start_date ? new Date(camp.start_date) : new Date(camp.created_at)
      const daysRunning = Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000))

      result.push({
        id: camp.id,
        companyId,
        name: camp.name,
        objective: camp.objective,
        status: camp.status,
        budget: camp.budget || 0,
        metaCampaignId: camp.meta_campaign_id || null,
        metrics: {
          impressions: totals.impressions,
          clicks: totals.clicks,
          spend: totals.spend,
          conversions: totals.conversions,
          ctr,
          cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
          cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
          roas,
          frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
          reach: totals.reach,
          revenue: totals.revenue,
        },
        trend: {
          spendDelta: oldTotals.spend > 0 ? ((totals.spend - oldTotals.spend) / oldTotals.spend) * 100 : 0,
          ctrDelta: oldCtr > 0 ? ((ctr - oldCtr) / oldCtr) * 100 : 0,
          cpaDelta: oldCpa > 0 ? ((cpa - oldCpa) / oldCpa) * 100 : 0,
          roasDelta: oldRoas > 0 ? ((roas - oldRoas) / oldRoas) * 100 : 0,
        },
        daysRunning,
      })
    }

    return result
  }

  private sumMetrics(rows: Record<string, unknown>[]) {
    return rows.reduce(
      (acc, r) => ({
        impressions: acc.impressions + ((r.impressions as number) || 0),
        clicks: acc.clicks + ((r.clicks as number) || 0),
        spend: acc.spend + ((r.spend as number) || 0),
        conversions: acc.conversions + ((r.conversions as number) || 0),
        revenue: acc.revenue + ((r.revenue as number) || 0),
        reach: acc.reach + ((r.reach as number) || 0),
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0, reach: 0 }
    )
  }

  private buildContext(campaigns: CampaignData[]) {
    const active = campaigns.filter(c => c.status === 'ACTIVE' && c.metrics.spend > 0)
    const totalBudget = active.reduce((s, c) => s + c.budget, 0)
    const avgROAS = active.length > 0
      ? active.reduce((s, c) => s + c.metrics.roas, 0) / active.length
      : 0
    const avgCTR = active.length > 0
      ? active.reduce((s, c) => s + c.metrics.ctr, 0) / active.length
      : 0
    const withConversions = active.filter(c => c.metrics.conversions > 0)
    const avgCPA = withConversions.length > 0
      ? withConversions.reduce((s, c) => s + c.metrics.spend / c.metrics.conversions, 0) / withConversions.length
      : 0

    return { campaigns, totalBudget, avgROAS, avgCTR, avgCPA }
  }

  private async executeDecision(
    taskId: string,
    decision: AgentDecision,
    campaign: CampaignData,
    config: db.MetaConfig,
    companyId: string
  ) {
    const t0 = Date.now()
    const stateBefore = { status: campaign.status, budget: campaign.budget }

    try {
      await this.executeAction(decision.action, campaign, config, decision.agent, companyId, decision.params)

      const stateAfter = { ...stateBefore }
      if (decision.action === 'pause_ad' || decision.action === 'kill_campaign') stateAfter.status = 'PAUSED'
      if (decision.action === 'activate_ad') stateAfter.status = 'ACTIVE'
      if (decision.action === 'adjust_budget' || decision.action === 'scale_campaign') {
        stateAfter.budget = Math.round(campaign.budget * ((decision.params.multiplier as number) || 1.2) * 100) / 100
      }

      await journeyLog.logActionExecuted(
        taskId, companyId, decision.agent, decision.action,
        decision.campaignId, stateBefore, stateAfter, Date.now() - t0
      )

      const policy = await this.getPolicyCooldown(companyId, decision.action)
      await setCooldown(companyId, decision.campaignId, decision.action, policy)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      await journeyLog.logActionFailed(taskId, companyId, decision.agent, decision.action, decision.campaignId, errorMsg)
    }
  }

  private async getPolicyCooldown(companyId: string, capabilityId: string): Promise<number> {
    const { data } = await supabase
      .from('policies')
      .select('cooldown_minutes')
      .eq('company_id', companyId)
      .eq('capability_id', capabilityId)
      .single()
    return (data?.cooldown_minutes as number) || 60
  }

  private async evaluateRule(
    taskId: string,
    rule: AutomationRule,
    campaigns: CampaignData[],
    config: db.MetaConfig,
    companyId: string
  ) {
    for (const campaign of campaigns) {
      if (campaign.status !== 'ACTIVE') continue
      const metricValue = this.getMetricValue(campaign, rule.metric)
      if (metricValue === null) continue

      const triggered = this.checkCondition(metricValue, rule.operator, rule.threshold)
      if (!triggered) continue

      await journeyLog.logRuleTriggered(taskId, companyId, rule.id, rule.name, campaign.id, metricValue, rule.threshold)

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

  private async executeAction(
    actionType: ActionType,
    campaign: CampaignData,
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
          description = `Alerta: "${campaign.name}"`
          result = (params.message as string) || 'Alerta enviado'
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
        impact: actionType !== 'send_alert' ? {
          metric: actionType === 'adjust_budget' || actionType === 'scale_campaign' ? 'budget' : 'status',
          before: campaign.budget,
          after: actionType === 'adjust_budget' || actionType === 'scale_campaign'
            ? Math.round(campaign.budget * ((params.multiplier as number) || 1.2) * 100) / 100
            : 0,
          change: 0,
          changePercent: actionType === 'adjust_budget' || actionType === 'scale_campaign'
            ? (((params.multiplier as number) || 1.2) - 1) * 100
            : 0,
        } : undefined,
      })

      hub.send({
        from: agentRole,
        to: 'broadcast',
        type: 'report',
        priority: 'medium',
        subject: `[${analyzerNames[agentRole] || agentRole}] Acao executada`,
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

      throw err
    }
  }

  private getMetricValue(campaign: CampaignData, metric: string): number | null {
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
