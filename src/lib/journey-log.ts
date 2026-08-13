import { supabase } from './supabase'

export type StepType =
  | 'data_loaded'
  | 'skill_executed'
  | 'decision_made'
  | 'permission_checked'
  | 'action_executed'
  | 'action_failed'
  | 'conflict_resolved'
  | 'rule_triggered'
  | 'guardrail_applied'

export interface JourneyEntry {
  taskId: string
  companyId?: string
  stepOrder: number
  stepType: StepType
  agentRole?: string
  skillId?: string
  capabilityId?: string
  campaignId?: string
  inputSnapshot?: Record<string, unknown>
  outputSnapshot?: Record<string, unknown>
  stateBefore?: Record<string, unknown>
  stateAfter?: Record<string, unknown>
  reasoning?: string
  confidence?: number
  error?: string
  durationMs?: number
}

class JourneyLog {
  private stepCounters = new Map<string, number>()

  resetCounter(taskId: string) {
    this.stepCounters.set(taskId, 0)
  }

  private nextStep(taskId: string): number {
    const current = this.stepCounters.get(taskId) || 0
    const next = current + 1
    this.stepCounters.set(taskId, next)
    return next
  }

  async log(entry: Omit<JourneyEntry, 'stepOrder'>): Promise<void> {
    const stepOrder = this.nextStep(entry.taskId)

    const { error } = await supabase.from('journey_log').insert({
      task_id: entry.taskId,
      company_id: entry.companyId || null,
      step_order: stepOrder,
      step_type: entry.stepType,
      agent_role: entry.agentRole || null,
      skill_id: entry.skillId || null,
      capability_id: entry.capabilityId || null,
      campaign_id: entry.campaignId || null,
      input_snapshot: entry.inputSnapshot || null,
      output_snapshot: entry.outputSnapshot || null,
      state_before: entry.stateBefore || null,
      state_after: entry.stateAfter || null,
      reasoning: entry.reasoning || null,
      confidence: entry.confidence ?? null,
      error: entry.error || null,
      duration_ms: entry.durationMs ?? null,
    })

    if (error) {
      console.error('Journey log write failed:', error.message)
    }
  }

  async logDataLoaded(taskId: string, companyId: string, campaignCount: number, durationMs: number) {
    await this.log({
      taskId,
      companyId,
      stepType: 'data_loaded',
      agentRole: 'orchestrator',
      outputSnapshot: { campaignCount },
      reasoning: `Carregou ${campaignCount} campanhas com metricas e trends`,
      durationMs,
    })
  }

  async logSkillExecuted(
    taskId: string,
    companyId: string,
    skillId: string,
    agentRole: string,
    decisionsCount: number,
    durationMs: number
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'skill_executed',
      agentRole,
      skillId,
      outputSnapshot: { decisionsCount },
      reasoning: `Analyzer ${skillId} gerou ${decisionsCount} decisoes`,
      durationMs,
    })
  }

  async logDecisionMade(
    taskId: string,
    companyId: string,
    agentRole: string,
    capabilityId: string,
    campaignId: string,
    reasoning: string,
    confidence: number
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'decision_made',
      agentRole,
      capabilityId,
      campaignId,
      reasoning,
      confidence,
    })
  }

  async logPermissionChecked(
    taskId: string,
    companyId: string,
    agentRole: string,
    capabilityId: string,
    campaignId: string,
    allowed: boolean,
    reason: string
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'permission_checked',
      agentRole,
      capabilityId,
      campaignId,
      outputSnapshot: { allowed },
      reasoning: reason,
    })
  }

  async logActionExecuted(
    taskId: string,
    companyId: string,
    agentRole: string,
    capabilityId: string,
    campaignId: string,
    stateBefore: Record<string, unknown>,
    stateAfter: Record<string, unknown>,
    durationMs: number
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'action_executed',
      agentRole,
      capabilityId,
      campaignId,
      stateBefore,
      stateAfter,
      reasoning: `Acao ${capabilityId} executada com sucesso`,
      durationMs,
    })
  }

  async logActionFailed(
    taskId: string,
    companyId: string,
    agentRole: string,
    capabilityId: string,
    campaignId: string,
    errorMsg: string
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'action_failed',
      agentRole,
      capabilityId,
      campaignId,
      error: errorMsg,
      reasoning: `Acao ${capabilityId} falhou`,
    })
  }

  async logGuardrailApplied(
    taskId: string,
    companyId: string,
    proposed: number,
    approved: number,
    rejected: number
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'guardrail_applied',
      agentRole: 'orchestrator',
      outputSnapshot: { proposed, approved, rejected },
      reasoning: `Guardrails: ${proposed} propostas, ${approved} aprovadas, ${rejected} rejeitadas`,
    })
  }

  async logConflictResolved(
    taskId: string,
    companyId: string,
    beforeCount: number,
    afterCount: number,
    removedActions: string[]
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'conflict_resolved',
      agentRole: 'orchestrator',
      outputSnapshot: { beforeCount, afterCount, removedActions },
      reasoning: `Dedup: ${beforeCount} -> ${afterCount} decisoes (${removedActions.join(', ')} removidas)`,
    })
  }

  async logRuleTriggered(
    taskId: string,
    companyId: string,
    ruleId: string,
    ruleName: string,
    campaignId: string,
    metricValue: number,
    threshold: number
  ) {
    await this.log({
      taskId,
      companyId,
      stepType: 'rule_triggered',
      agentRole: 'orchestrator',
      campaignId,
      inputSnapshot: { ruleId, metricValue, threshold },
      reasoning: `Regra "${ruleName}" ativada: valor ${metricValue} atingiu threshold ${threshold}`,
    })
  }

  async getJourney(taskId: string) {
    const { data, error } = await supabase
      .from('journey_log')
      .select('*')
      .eq('task_id', taskId)
      .order('step_order', { ascending: true })

    if (error) throw error
    return data || []
  }
}

export const journeyLog = new JourneyLog()
