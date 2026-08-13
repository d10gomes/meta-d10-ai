import { supabase } from './supabase'

export type AutonomyLevel = 'auto' | 'limited' | 'approval' | 'prohibited'

export interface Policy {
  id: string
  companyId: string
  capabilityId: string
  autonomyLevel: AutonomyLevel
  maxValue: number | null
  cooldownMinutes: number
  minConfidence: number
  minDaysRunning: number
  minSpend: number
  enabled: boolean
}

export interface PermissionResult {
  allowed: boolean
  reason: string
  autonomyLevel: AutonomyLevel
}

const DEFAULT_POLICY: Omit<Policy, 'id' | 'companyId' | 'capabilityId'> = {
  autonomyLevel: 'limited',
  maxValue: 50,
  cooldownMinutes: 60,
  minConfidence: 0.6,
  minDaysRunning: 2,
  minSpend: 10,
  enabled: true,
}

export async function checkPermission(
  companyId: string,
  capabilityId: string,
  agentRole: string,
  params: {
    confidence: number
    campaignId: string
    daysRunning?: number
    totalSpend?: number
    budgetChangePercent?: number
  }
): Promise<PermissionResult> {
  const policy = await getPolicy(companyId, capabilityId)

  if (!policy.enabled) {
    return { allowed: false, reason: 'Policy desabilitada', autonomyLevel: policy.autonomyLevel }
  }

  if (policy.autonomyLevel === 'prohibited') {
    return { allowed: false, reason: `${capabilityId} proibido para execucao automatica`, autonomyLevel: 'prohibited' }
  }

  if (params.confidence < policy.minConfidence) {
    return {
      allowed: false,
      reason: `Confianca ${(params.confidence * 100).toFixed(0)}% abaixo do minimo ${(policy.minConfidence * 100).toFixed(0)}%`,
      autonomyLevel: policy.autonomyLevel,
    }
  }

  if (params.daysRunning !== undefined && params.daysRunning < policy.minDaysRunning) {
    return {
      allowed: false,
      reason: `Campanha rodando ha ${params.daysRunning} dias, minimo ${policy.minDaysRunning}`,
      autonomyLevel: policy.autonomyLevel,
    }
  }

  if (params.totalSpend !== undefined && params.totalSpend < policy.minSpend) {
    return {
      allowed: false,
      reason: `Gasto total R$${params.totalSpend.toFixed(2)} abaixo do minimo R$${policy.minSpend.toFixed(2)}`,
      autonomyLevel: policy.autonomyLevel,
    }
  }

  if (policy.maxValue !== null && params.budgetChangePercent !== undefined) {
    if (Math.abs(params.budgetChangePercent) > policy.maxValue) {
      return {
        allowed: false,
        reason: `Mudanca de ${params.budgetChangePercent.toFixed(0)}% excede limite de ${policy.maxValue}%`,
        autonomyLevel: policy.autonomyLevel,
      }
    }
  }

  const cooldownOk = await checkCooldown(companyId, params.campaignId, capabilityId)
  if (!cooldownOk) {
    return {
      allowed: false,
      reason: `Cooldown ativo para ${capabilityId} nesta campanha (${policy.cooldownMinutes}min)`,
      autonomyLevel: policy.autonomyLevel,
    }
  }

  if (policy.autonomyLevel === 'approval') {
    return { allowed: false, reason: `${capabilityId} requer aprovacao manual`, autonomyLevel: 'approval' }
  }

  return { allowed: true, reason: 'Aprovado por policy', autonomyLevel: policy.autonomyLevel }
}

export async function setCooldown(
  companyId: string,
  campaignId: string,
  actionType: string,
  cooldownMinutes: number
): Promise<void> {
  const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60000).toISOString()

  const { error } = await supabase
    .from('action_cooldowns')
    .upsert(
      {
        company_id: companyId,
        campaign_id: campaignId,
        action_type: actionType,
        executed_at: new Date().toISOString(),
        cooldown_until: cooldownUntil,
      },
      { onConflict: 'company_id,campaign_id,action_type' }
    )

  if (error) console.error('Cooldown write failed:', error.message)
}

async function checkCooldown(
  companyId: string,
  campaignId: string,
  actionType: string
): Promise<boolean> {
  const { data } = await supabase
    .from('action_cooldowns')
    .select('cooldown_until')
    .eq('company_id', companyId)
    .eq('campaign_id', campaignId)
    .eq('action_type', actionType)
    .single()

  if (!data) return true
  return new Date(data.cooldown_until as string) < new Date()
}

async function getPolicy(companyId: string, capabilityId: string): Promise<Policy> {
  const { data } = await supabase
    .from('policies')
    .select('*')
    .eq('company_id', companyId)
    .eq('capability_id', capabilityId)
    .single()

  if (!data) {
    return {
      id: '',
      companyId,
      capabilityId,
      ...DEFAULT_POLICY,
    }
  }

  return {
    id: data.id as string,
    companyId: data.company_id as string,
    capabilityId: data.capability_id as string,
    autonomyLevel: data.autonomy_level as AutonomyLevel,
    maxValue: data.max_value as number | null,
    cooldownMinutes: (data.cooldown_minutes as number) || 60,
    minConfidence: (data.min_confidence as number) || 0.6,
    minDaysRunning: (data.min_days_running as number) || 2,
    minSpend: (data.min_spend as number) || 10,
    enabled: data.enabled as boolean,
  }
}

export async function fetchPolicies(companyId: string): Promise<Policy[]> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('company_id', companyId)
    .order('capability_id')

  if (error) throw error

  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    companyId: r.company_id as string,
    capabilityId: r.capability_id as string,
    autonomyLevel: r.autonomy_level as AutonomyLevel,
    maxValue: r.max_value as number | null,
    cooldownMinutes: (r.cooldown_minutes as number) || 60,
    minConfidence: (r.min_confidence as number) || 0.6,
    minDaysRunning: (r.min_days_running as number) || 2,
    minSpend: (r.min_spend as number) || 10,
    enabled: r.enabled as boolean,
  }))
}

export async function updatePolicy(
  id: string,
  updates: Partial<Pick<Policy, 'autonomyLevel' | 'maxValue' | 'cooldownMinutes' | 'minConfidence' | 'minDaysRunning' | 'minSpend' | 'enabled'>>
): Promise<void> {
  const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.autonomyLevel !== undefined) mapped.autonomy_level = updates.autonomyLevel
  if (updates.maxValue !== undefined) mapped.max_value = updates.maxValue
  if (updates.cooldownMinutes !== undefined) mapped.cooldown_minutes = updates.cooldownMinutes
  if (updates.minConfidence !== undefined) mapped.min_confidence = updates.minConfidence
  if (updates.minDaysRunning !== undefined) mapped.min_days_running = updates.minDaysRunning
  if (updates.minSpend !== undefined) mapped.min_spend = updates.minSpend
  if (updates.enabled !== undefined) mapped.enabled = updates.enabled

  const { error } = await supabase.from('policies').update(mapped).eq('id', id)
  if (error) throw error
}
