import { supabase } from './supabase'
import type { Company, CompanyGoal, CompanyAgent } from '../types/company'
import type { AgentMessage, AgentAction, AgentMemory } from '../types/agent'
import type { Campaign, MetaObjective, AdMetrics, Ad } from '../types/meta'

// ==================== HELPERS ====================

function distributeMetrics(campaignMetrics: AdMetrics, adCount: number): AdMetrics {
  if (adCount <= 0 || campaignMetrics.spend === 0) {
    return { impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, spend: 0, conversions: 0, costPerConversion: 0, roas: 0, frequency: 0 }
  }
  const share = 1 / adCount
  return {
    impressions: Math.round(campaignMetrics.impressions * share),
    reach: Math.round(campaignMetrics.reach * share),
    clicks: Math.round(campaignMetrics.clicks * share),
    ctr: campaignMetrics.ctr,
    cpc: campaignMetrics.cpc,
    cpm: campaignMetrics.cpm,
    spend: campaignMetrics.spend * share,
    conversions: Math.round(campaignMetrics.conversions * share),
    costPerConversion: campaignMetrics.costPerConversion,
    roas: campaignMetrics.roas,
    frequency: campaignMetrics.frequency,
  }
}

// ==================== COMPANIES ====================

export async function fetchCompanies(): Promise<Company[]> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!companies) return []

  const companyIds = companies.map((c: Record<string, unknown>) => c.id as string)

  const [goalsRes, campaignsRes, agentsRes] = await Promise.all([
    supabase.from('company_goals').select('*').in('company_id', companyIds),
    supabase.from('campaigns').select('*').in('company_id', companyIds),
    supabase.from('agents').select('*').in('company_id', companyIds),
  ])

  const campaignIds = (campaignsRes.data || []).map((c: Record<string, unknown>) => c.id as string)
  const [metricsRes, adsRes] = await Promise.all([
    campaignIds.length > 0
      ? supabase.from('campaign_metrics').select('*').in('campaign_id', campaignIds).order('date', { ascending: false })
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? supabase.from('ads').select('*').in('campaign_id', campaignIds)
      : Promise.resolve({ data: [] }),
  ])

  const adIds = (adsRes.data || []).map((a: Record<string, unknown>) => a.id as string)
  const adMetricsRes = adIds.length > 0
    ? await supabase.from('ad_metrics').select('*').in('ad_id', adIds).order('date', { ascending: false })
    : { data: [] }

  return companies.map((c: Record<string, unknown>) => {
    const goals = (goalsRes.data || [])
      .filter((g: Record<string, unknown>) => g.company_id === c.id)
      .map(mapGoal)

    const rawCampaigns = (campaignsRes.data || [])
      .filter((camp: Record<string, unknown>) => camp.company_id === c.id)

    const campaigns = rawCampaigns.map((camp: Record<string, unknown>) => {
      const latestMetrics = (metricsRes.data || [])
        .filter((m: Record<string, unknown>) => m.campaign_id === camp.id)
      const aggregated = aggregateMetrics(latestMetrics)

      const rawCampaignAds = (adsRes.data || [])
        .filter((a: Record<string, unknown>) => a.campaign_id === camp.id)
      const adCount = rawCampaignAds.length || 1
      const campaignAds = rawCampaignAds.map((a: Record<string, unknown>) => {
          const adMets = (adMetricsRes.data || [])
            .filter((m: Record<string, unknown>) => m.ad_id === a.id)
          const ownMetrics = aggregateAdMetrics(adMets)
          const hasOwnMetrics = adMets.length > 0
          return mapAd(a, hasOwnMetrics ? ownMetrics : distributeMetrics(aggregated, adCount))
        })

      return mapCampaign(camp, aggregated, campaignAds)
    })

    const agents = (agentsRes.data || [])
      .filter((a: Record<string, unknown>) => a.company_id === c.id)
      .map(mapAgent)

    return mapCompany(c, goals, campaigns, agents)
  })
}

export async function fetchCompanyById(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const [goalsRes, campaignsRes, agentsRes] = await Promise.all([
    supabase.from('company_goals').select('*').eq('company_id', id),
    supabase.from('campaigns').select('*').eq('company_id', id),
    supabase.from('agents').select('*').eq('company_id', id),
  ])

  const campaignIds = (campaignsRes.data || []).map((c: Record<string, unknown>) => c.id as string)
  const metricsRes = campaignIds.length > 0
    ? await supabase.from('campaign_metrics').select('*').in('campaign_id', campaignIds).order('date', { ascending: false })
    : { data: [] }

  const goals = (goalsRes.data || []).map(mapGoal)
  const campaigns = (campaignsRes.data || []).map((camp: Record<string, unknown>) => {
    const latestMetrics = (metricsRes.data || []).filter((m: Record<string, unknown>) => m.campaign_id === camp.id)
    return mapCampaign(camp, aggregateMetrics(latestMetrics))
  })
  const agents = (agentsRes.data || []).map(mapAgent)

  return mapCompany(data, goals, campaigns, agents)
}

export async function createCompany(company: Omit<Company, 'id' | 'createdAt' | 'goals' | 'campaigns' | 'agents'>) {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: company.name,
      logo: company.logo,
      industry: company.industry,
      website: company.website,
      whatsapp: company.whatsapp,
      meta_account_id: company.metaAccountId,
      pixel_id: company.pixelId,
      monthly_budget: company.monthlyBudget,
      status: company.status,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCompanyData(id: string, updates: Partial<Company>) {
  const mapped: Record<string, unknown> = {}
  if (updates.name !== undefined) mapped.name = updates.name
  if (updates.industry !== undefined) mapped.industry = updates.industry
  if (updates.website !== undefined) mapped.website = updates.website
  if (updates.whatsapp !== undefined) mapped.whatsapp = updates.whatsapp
  if (updates.monthlyBudget !== undefined) mapped.monthly_budget = updates.monthlyBudget
  if (updates.status !== undefined) mapped.status = updates.status

  const { error } = await supabase.from('companies').update(mapped).eq('id', id)
  if (error) throw error
}

// ==================== CAMPAIGNS ====================

export async function fetchCampaigns(companyId?: string) {
  let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false })
  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) throw error

  const campaignIds = (data || []).map((c: Record<string, unknown>) => c.id as string)
  const metricsRes = campaignIds.length > 0
    ? await supabase.from('campaign_metrics').select('*').in('campaign_id', campaignIds).order('date', { ascending: false })
    : { data: [] }

  return (data || []).map((camp: Record<string, unknown>) => {
    const metrics = (metricsRes.data || []).filter((m: Record<string, unknown>) => m.campaign_id === camp.id)
    return mapCampaign(camp, aggregateMetrics(metrics))
  })
}

export async function updateCampaignStatus(id: string, status: string, metaOpts?: { accessToken: string; adAccountId: string; metaCampaignId: string }) {
  if (metaOpts?.metaCampaignId) {
    const { updateMetaCampaign } = await import('./meta-api')
    await updateMetaCampaign(metaOpts, metaOpts.metaCampaignId, { status })
  }
  const { error } = await supabase.from('campaigns').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateCampaignBudget(id: string, budget: number, metaOpts?: { accessToken: string; adAccountId: string; metaCampaignId: string }) {
  if (metaOpts?.metaCampaignId) {
    const { updateMetaCampaign } = await import('./meta-api')
    await updateMetaCampaign(metaOpts, metaOpts.metaCampaignId, { dailyBudget: budget })
  }
  const { error } = await supabase.from('campaigns').update({ budget }).eq('id', id)
  if (error) throw error
}

// ==================== AGENT MESSAGES ====================

export async function fetchMessages(limit = 50): Promise<AgentMessage[]> {
  const { data, error } = await supabase
    .from('agent_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(mapMessage)
}

export async function createMessage(msg: Omit<AgentMessage, 'id' | 'timestamp' | 'read'>) {
  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      from_agent: msg.from,
      to_agent: msg.to,
      type: msg.type,
      priority: msg.priority,
      subject: msg.subject,
      content: msg.content,
      data: msg.data || {},
    })
    .select()
    .single()

  if (error) throw error
  return mapMessage(data)
}

// ==================== AGENT ACTIONS ====================

export async function fetchActions(companyId?: string, limit = 50): Promise<AgentAction[]> {
  let query = supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapAction)
}

export async function createAction(action: Omit<AgentAction, 'id' | 'timestamp'>) {
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      agent_role: action.agentRole,
      company_id: action.companyId,
      campaign_id: action.campaignId,
      type: action.type,
      description: action.description,
      status: action.status,
      result: action.result,
      impact: action.impact || {},
    })
    .select()
    .single()

  if (error) throw error
  return mapAction(data)
}

// ==================== AGENT MEMORIES ====================

export async function fetchMemories(role?: string): Promise<AgentMemory[]> {
  let query = supabase.from('agent_memories').select('*').order('created_at', { ascending: false })
  if (role) query = query.eq('agent_role', role)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapMemory)
}

export async function createMemory(memory: Omit<AgentMemory, 'id' | 'createdAt' | 'usageCount'>) {
  const { data, error } = await supabase
    .from('agent_memories')
    .insert({
      agent_role: memory.agentRole,
      company_id: memory.companyId,
      type: memory.type,
      content: memory.content,
      confidence: memory.confidence,
    })
    .select()
    .single()

  if (error) throw error
  return mapMemory(data)
}

// ==================== META CONFIG ====================

export interface MetaConfig {
  id: string
  companyId: string
  appId: string
  appSecret: string
  accessToken: string
  adAccountId: string
  pixelId: string
  pageId: string
  whatsappBusinessId: string
  tokenExpiresAt: string | null
  status: 'connected' | 'disconnected' | 'expired'
}

export async function fetchMetaConfig(companyId: string): Promise<MetaConfig | null> {
  const { data, error } = await supabase
    .from('meta_config')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error || !data) return null
  return mapMetaConfig(data)
}

export async function saveMetaConfig(config: Partial<MetaConfig> & { companyId: string }) {
  const mapped: Record<string, unknown> = {
    company_id: config.companyId,
  }
  if (config.appId !== undefined) mapped.app_id = config.appId
  if (config.appSecret !== undefined) mapped.app_secret = config.appSecret
  if (config.accessToken !== undefined) mapped.access_token = config.accessToken
  if (config.adAccountId !== undefined) mapped.ad_account_id = config.adAccountId
  if (config.pixelId !== undefined) mapped.pixel_id = config.pixelId
  if (config.pageId !== undefined) mapped.page_id = config.pageId
  if (config.whatsappBusinessId !== undefined) mapped.whatsapp_business_id = config.whatsappBusinessId
  if (config.status !== undefined) mapped.status = config.status

  const { data, error } = await supabase
    .from('meta_config')
    .upsert(mapped, { onConflict: 'company_id' })
    .select()
    .single()

  if (error) throw error
  return mapMetaConfig(data)
}

// ==================== AUTOMATION RULES ====================

export async function fetchAutomationRules(companyId?: string) {
  let query = supabase.from('automation_rules').select('*').order('created_at', { ascending: false })
  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    companyId: r.company_id as string,
    name: r.name as string,
    agentRole: (r.agent_role as string) || 'analytics',
    condition: (r.condition_type as string) || `${r.condition_metric || r.metric || ''} ${r.condition_operator || r.operator || ''} ${r.condition_value ?? r.threshold ?? ''}`,
    metric: (r.metric as string) || (r.condition_metric as string) || '',
    operator: (r.operator as string) || (r.condition_operator as string) || '',
    threshold: (r.threshold as number) ?? (r.condition_value as number) ?? 0,
    action: r.action_type as string,
    actionParams: (r.action_params as Record<string, unknown>) || {},
    enabled: r.enabled as boolean,
    lastTriggered: (r.last_triggered_at as string) || (r.last_run_at as string) || null,
  }))
}

export async function toggleAutomationRule(id: string, enabled: boolean) {
  const { error } = await supabase.from('automation_rules').update({ enabled }).eq('id', id)
  if (error) throw error
}

// ==================== MAPPERS ====================

function mapCompany(
  raw: Record<string, unknown>,
  goals: CompanyGoal[],
  campaigns: Campaign[],
  agents: CompanyAgent[]
): Company {
  return {
    id: raw.id as string,
    name: raw.name as string,
    logo: raw.logo as string | undefined,
    industry: raw.industry as string,
    website: raw.website as string | undefined,
    whatsapp: raw.whatsapp as string | undefined,
    metaAccountId: raw.meta_account_id as string | undefined,
    pixelId: raw.pixel_id as string | undefined,
    monthlyBudget: raw.monthly_budget as number,
    goals,
    campaigns,
    agents,
    status: raw.status as 'active' | 'paused' | 'setup',
    createdAt: raw.created_at as string,
  }
}

function mapGoal(raw: Record<string, unknown>): CompanyGoal {
  return {
    id: raw.id as string,
    objective: raw.objective as MetaObjective,
    target: raw.target as number,
    metric: raw.metric as string,
    currentValue: raw.current_value as number,
    deadline: raw.deadline as string,
    status: raw.status as 'on_track' | 'behind' | 'ahead' | 'completed',
  }
}

function mapCampaign(raw: Record<string, unknown>, metrics: AdMetrics, ads: Ad[] = []): Campaign {
  return {
    id: raw.id as string,
    companyId: raw.company_id as string,
    metaCampaignId: raw.meta_campaign_id as string | undefined,
    name: raw.name as string,
    objective: raw.objective as MetaObjective,
    status: raw.status as 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ARCHIVED',
    budget: raw.budget as number,
    budgetType: (raw.budget_type as string || 'DAILY') as 'DAILY' | 'LIFETIME',
    startDate: raw.start_date as string,
    endDate: raw.end_date as string | undefined,
    adSets: [],
    ads,
    metrics,
    agentId: raw.agent_id as string || '',
    automationEnabled: raw.automation_enabled as boolean || false,
    rules: [],
  }
}

function mapAd(raw: Record<string, unknown>, metrics: AdMetrics): Ad {
  return {
    id: raw.id as string,
    name: raw.name as string || '',
    status: (raw.status as 'ACTIVE' | 'PAUSED' | 'DELETED') || 'ACTIVE',
    creative: {
      id: raw.meta_ad_id as string || '',
      type: (raw.creative_type as 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'COLLECTION') || 'IMAGE',
      headline: raw.headline as string || '',
      description: raw.description as string || '',
      callToAction: raw.call_to_action as string || '',
      mediaUrl: raw.media_url as string || '',
      thumbnailUrl: raw.thumbnail_url as string || '',
    },
    metrics,
  }
}

function aggregateAdMetrics(rows: Record<string, unknown>[]): AdMetrics {
  if (rows.length === 0) {
    return { impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, spend: 0, conversions: 0, costPerConversion: 0, roas: 0, frequency: 0 }
  }
  const totals = rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + (r.impressions as number || 0),
      reach: acc.reach + (r.reach as number || 0),
      clicks: acc.clicks + (r.clicks as number || 0),
      spend: acc.spend + (r.spend as number || 0),
      conversions: acc.conversions + (r.conversions as number || 0),
      revenue: acc.revenue + (r.revenue as number || 0),
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
  )
  return {
    impressions: totals.impressions,
    reach: totals.reach,
    clicks: totals.clicks,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    spend: totals.spend,
    conversions: totals.conversions,
    costPerConversion: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
  }
}

function mapAgent(raw: Record<string, unknown>): CompanyAgent {
  return {
    id: raw.id as string,
    type: raw.role as CompanyAgent['type'],
    status: raw.status as CompanyAgent['status'],
    lastAction: raw.last_action as string || '',
    lastActionAt: raw.last_action_at as string || '',
    actionsToday: raw.actions_today as number || 0,
    performance: raw.performance_score as number || 0,
  }
}

function mapMessage(raw: Record<string, unknown>): AgentMessage {
  return {
    id: raw.id as string,
    from: raw.from_agent as AgentMessage['from'],
    to: raw.to_agent as AgentMessage['to'],
    type: raw.type as AgentMessage['type'],
    priority: raw.priority as AgentMessage['priority'],
    subject: raw.subject as string,
    content: raw.content as string,
    data: raw.data as Record<string, unknown> | undefined,
    timestamp: raw.created_at as string,
    read: raw.read as boolean,
  }
}

function mapAction(raw: Record<string, unknown>): AgentAction {
  return {
    id: raw.id as string,
    agentRole: raw.agent_role as AgentAction['agentRole'],
    companyId: raw.company_id as string,
    campaignId: raw.campaign_id as string | undefined,
    type: raw.type as AgentAction['type'],
    description: raw.description as string,
    status: raw.status as AgentAction['status'],
    result: raw.result as string | undefined,
    impact: raw.impact as AgentAction['impact'] | undefined,
    timestamp: raw.created_at as string,
  }
}

function mapMemory(raw: Record<string, unknown>): AgentMemory {
  return {
    id: raw.id as string,
    agentRole: raw.agent_role as AgentMemory['agentRole'],
    companyId: raw.company_id as string | undefined,
    type: raw.type as AgentMemory['type'],
    content: raw.content as string,
    confidence: raw.confidence as number,
    validatedAt: raw.validated_at as string | undefined,
    usageCount: raw.usage_count as number || 0,
    createdAt: raw.created_at as string,
  }
}

function mapMetaConfig(raw: Record<string, unknown>): MetaConfig {
  return {
    id: raw.id as string,
    companyId: raw.company_id as string,
    appId: raw.app_id as string || '',
    appSecret: raw.app_secret as string || '',
    accessToken: raw.access_token as string || '',
    adAccountId: raw.ad_account_id as string || '',
    pixelId: raw.pixel_id as string || '',
    pageId: raw.page_id as string || '',
    whatsappBusinessId: raw.whatsapp_business_id as string || '',
    tokenExpiresAt: raw.token_expires_at as string | null,
    status: raw.status as MetaConfig['status'],
  }
}

function aggregateMetrics(rows: Record<string, unknown>[]): AdMetrics {
  if (rows.length === 0) {
    return { impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, spend: 0, conversions: 0, costPerConversion: 0, roas: 0, frequency: 0 }
  }

  const totals = rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + (r.impressions as number || 0),
      reach: acc.reach + (r.reach as number || 0),
      clicks: acc.clicks + (r.clicks as number || 0),
      spend: acc.spend + (r.spend as number || 0),
      conversions: acc.conversions + (r.conversions as number || 0),
      revenue: acc.revenue + (r.revenue as number || 0),
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
  )

  return {
    impressions: totals.impressions,
    reach: totals.reach,
    clicks: totals.clicks,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    spend: totals.spend,
    conversions: totals.conversions,
    costPerConversion: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
  }
}
