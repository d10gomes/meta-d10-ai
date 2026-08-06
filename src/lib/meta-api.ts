import { supabase } from './supabase'

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0'

interface MetaApiOptions {
  accessToken: string
  adAccountId: string
}

// ==================== CAMPANHAS ====================

export async function getMetaCampaigns(opts: MetaApiOptions) {
  const { accessToken, adAccountId } = opts
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

  let allCampaigns: Record<string, unknown>[] = []
  let url: string | null = `${META_GRAPH_URL}/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,buying_type,bid_strategy,special_ad_categories&limit=100&access_token=${accessToken}`

  while (url) {
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new MetaApiError(data.error)
    allCampaigns = allCampaigns.concat(data.data || [])
    url = data.paging?.next || null
  }

  return allCampaigns
}

export async function createMetaCampaign(opts: MetaApiOptions, campaign: {
  name: string
  objective: string
  status?: string
  dailyBudget?: number
  lifetimeBudget?: number
  bidStrategy?: string
  specialAdCategories?: string[]
}) {
  const { accessToken, adAccountId } = opts
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

  const body: Record<string, string> = {
    name: campaign.name,
    objective: mapObjectiveToMeta(campaign.objective),
    status: campaign.status || 'PAUSED',
    access_token: accessToken,
  }

  if (campaign.dailyBudget) body.daily_budget = String(Math.round(campaign.dailyBudget * 100))
  if (campaign.lifetimeBudget) body.lifetime_budget = String(Math.round(campaign.lifetimeBudget * 100))
  if (campaign.bidStrategy) body.bid_strategy = campaign.bidStrategy
  if (campaign.specialAdCategories) body.special_ad_categories = JSON.stringify(campaign.specialAdCategories)

  const res = await fetch(`${META_GRAPH_URL}/${accountId}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data
}

export async function updateMetaCampaign(opts: MetaApiOptions, campaignId: string, updates: {
  name?: string
  status?: string
  dailyBudget?: number
  bidStrategy?: string
}) {
  const body: Record<string, string> = { access_token: opts.accessToken }
  if (updates.name) body.name = updates.name
  if (updates.status) body.status = updates.status
  if (updates.dailyBudget) body.daily_budget = String(Math.round(updates.dailyBudget * 100))
  if (updates.bidStrategy) body.bid_strategy = updates.bidStrategy

  const res = await fetch(`${META_GRAPH_URL}/${campaignId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data
}

export async function deleteMetaCampaign(opts: MetaApiOptions, campaignId: string) {
  const res = await fetch(`${META_GRAPH_URL}/${campaignId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ access_token: opts.accessToken }),
  })
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data
}

// ==================== AD SETS ====================

export async function getMetaAdSets(opts: MetaApiOptions, campaignId?: string) {
  const { accessToken, adAccountId } = opts
  const parentId = campaignId || (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`)
  const endpoint = campaignId ? `${campaignId}/adsets` : `${parentId}/adsets`

  const res = await fetch(
    `${META_GRAPH_URL}/${endpoint}?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time&access_token=${accessToken}`
  )
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data.data || []
}

export async function createMetaAdSet(opts: MetaApiOptions, adSet: {
  campaignId: string
  name: string
  optimizationGoal: string
  billingEvent?: string
  dailyBudget?: number
  bidAmount?: number
  targeting: Record<string, unknown>
  status?: string
  startTime?: string
  endTime?: string
}) {
  const { accessToken, adAccountId } = opts
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

  const body: Record<string, string> = {
    campaign_id: adSet.campaignId,
    name: adSet.name,
    optimization_goal: adSet.optimizationGoal,
    billing_event: adSet.billingEvent || 'IMPRESSIONS',
    targeting: JSON.stringify(adSet.targeting),
    status: adSet.status || 'PAUSED',
    access_token: accessToken,
  }

  if (adSet.dailyBudget) body.daily_budget = String(Math.round(adSet.dailyBudget * 100))
  if (adSet.bidAmount) body.bid_amount = String(Math.round(adSet.bidAmount * 100))
  if (adSet.startTime) body.start_time = adSet.startTime
  if (adSet.endTime) body.end_time = adSet.endTime

  const res = await fetch(`${META_GRAPH_URL}/${accountId}/adsets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data
}

export async function updateMetaAdSet(opts: MetaApiOptions, adSetId: string, updates: {
  name?: string
  status?: string
  dailyBudget?: number
  bidAmount?: number
  targeting?: Record<string, unknown>
}) {
  const body: Record<string, string> = { access_token: opts.accessToken }
  if (updates.name) body.name = updates.name
  if (updates.status) body.status = updates.status
  if (updates.dailyBudget) body.daily_budget = String(Math.round(updates.dailyBudget * 100))
  if (updates.bidAmount) body.bid_amount = String(Math.round(updates.bidAmount * 100))
  if (updates.targeting) body.targeting = JSON.stringify(updates.targeting)

  const res = await fetch(`${META_GRAPH_URL}/${adSetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data
}

// ==================== ANÚNCIOS ====================

export async function getMetaAds(opts: MetaApiOptions, adSetId?: string) {
  const { accessToken, adAccountId } = opts
  const parentId = adSetId || (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`)
  const endpoint = adSetId ? `${adSetId}/ads` : `${parentId}/ads`

  const res = await fetch(
    `${META_GRAPH_URL}/${endpoint}?fields=id,name,status,creative{id,title,body,image_url,video_id,call_to_action_type,thumbnail_url}&access_token=${accessToken}`
  )
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data.data || []
}

// ==================== INSIGHTS / MÉTRICAS ====================

export async function getMetaInsights(opts: MetaApiOptions, params: {
  objectId?: string
  level?: 'campaign' | 'adset' | 'ad' | 'account'
  datePreset?: string
  timeRange?: { since: string; until: string }
  breakdowns?: string[]
  fields?: string[]
}) {
  const { accessToken, adAccountId } = opts
  const objectId = params.objectId || (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`)

  const defaultFields = [
    'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm', 'spend',
    'actions', 'action_values', 'cost_per_action_type', 'frequency',
    'conversions', 'cost_per_conversion', 'purchase_roas',
  ]

  const queryParams = new URLSearchParams({
    access_token: accessToken,
    fields: (params.fields || defaultFields).join(','),
  })

  if (params.level) queryParams.set('level', params.level)
  if (params.datePreset) queryParams.set('date_preset', params.datePreset)
  if (params.timeRange) queryParams.set('time_range', JSON.stringify(params.timeRange))
  if (params.breakdowns) queryParams.set('breakdowns', params.breakdowns.join(','))
  queryParams.set('limit', '100')

  let allInsights: Record<string, unknown>[] = []
  let url: string | null = `${META_GRAPH_URL}/${objectId}/insights?${queryParams}`

  while (url) {
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new MetaApiError(data.error)
    allInsights = allInsights.concat(data.data || [])
    url = data.paging?.next || null
  }

  return allInsights
}

export async function getAccountInsights(opts: MetaApiOptions, datePreset = 'last_7d') {
  return getMetaInsights(opts, {
    level: 'account',
    datePreset,
    fields: [
      'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm', 'spend',
      'actions', 'action_values', 'cost_per_action_type', 'frequency',
      'purchase_roas',
    ],
  })
}

export async function getCampaignInsights(opts: MetaApiOptions, campaignId: string, datePreset = 'last_7d') {
  return getMetaInsights(opts, {
    objectId: campaignId,
    datePreset,
    fields: [
      'campaign_name', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm',
      'spend', 'actions', 'action_values', 'cost_per_action_type', 'frequency',
      'conversions', 'cost_per_conversion', 'purchase_roas',
    ],
  })
}

// ==================== PÚBLICOS ====================

export async function getCustomAudiences(opts: MetaApiOptions) {
  const { accessToken, adAccountId } = opts
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

  const res = await fetch(
    `${META_GRAPH_URL}/${accountId}/customaudiences?fields=id,name,subtype,approximate_count,delivery_status,operation_status&access_token=${accessToken}`
  )
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data.data || []
}

export async function createLookalikeAudience(opts: MetaApiOptions, params: {
  name: string
  sourceAudienceId: string
  country: string
  ratio: number
}) {
  const { accessToken, adAccountId } = opts
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

  const body: Record<string, string> = {
    name: params.name,
    subtype: 'LOOKALIKE',
    origin_audience_id: params.sourceAudienceId,
    lookalike_spec: JSON.stringify({
      type: 'similarity',
      country: params.country,
      ratio: params.ratio,
    }),
    access_token: accessToken,
  }

  const res = await fetch(`${META_GRAPH_URL}/${accountId}/customaudiences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data
}

// ==================== PIXEL ====================

export async function getPixelStats(opts: MetaApiOptions, pixelId: string) {
  const res = await fetch(
    `${META_GRAPH_URL}/${pixelId}?fields=id,name,is_unavailable,last_fired_time&access_token=${opts.accessToken}`
  )
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data
}

// ==================== VALIDAÇÃO DE TOKEN ====================

export async function validateAccessToken(accessToken: string) {
  const res = await fetch(
    `${META_GRAPH_URL}/me?fields=id,name&access_token=${accessToken}`
  )
  const data = await res.json()
  if (data.error) return { valid: false, error: data.error.message }
  return { valid: true, userId: data.id, name: data.name }
}

export async function getAdAccounts(accessToken: string) {
  const res = await fetch(
    `${META_GRAPH_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent&access_token=${accessToken}`
  )
  const data = await res.json()
  if (data.error) throw new MetaApiError(data.error)
  return data.data || []
}

// ==================== SYNC: META -> SUPABASE ====================

export async function syncCampaignsToSupabase(companyId: string, opts: MetaApiOptions) {
  const validStatuses = ['ACTIVE', 'PAUSED', 'DRAFT', 'ARCHIVED', 'DELETED', 'IN_PROCESS']

  const metaCampaigns = await getMetaCampaigns(opts)

  for (const mc of metaCampaigns) {
    const rawStatus = (mc.status || 'PAUSED').toUpperCase()
    const status = validStatuses.includes(rawStatus) ? rawStatus : 'PAUSED'

    const mapped = {
      company_id: companyId,
      meta_campaign_id: mc.id,
      name: mc.name || `Campanha ${mc.id}`,
      objective: mapObjectiveFromMeta(mc.objective || ''),
      status,
      budget: mc.daily_budget ? Number(mc.daily_budget) / 100 : (mc.lifetime_budget ? Number(mc.lifetime_budget) / 100 : 0),
      budget_type: mc.daily_budget ? 'DAILY' : 'LIFETIME',
      start_date: mc.start_time ? mc.start_time.split('T')[0] : null,
      end_date: mc.stop_time ? mc.stop_time.split('T')[0] : null,
      automation_enabled: false,
    }

    const { error } = await supabase
      .from('campaigns')
      .upsert(mapped, { onConflict: 'meta_campaign_id' })

    if (error) console.error(`Erro ao upsert campanha ${mc.id}:`, error.message)
  }

  try {
    const insights = await getMetaInsights(opts, {
      level: 'campaign',
      datePreset: 'last_30d',
      fields: ['campaign_id', 'campaign_name', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm', 'spend', 'actions', 'action_values', 'purchase_roas', 'frequency'],
    })

    for (const insight of insights) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('meta_campaign_id', insight.campaign_id)
        .maybeSingle()

      if (!campaign) continue

      const conversionTypes = [
        'offsite_conversion', 'lead', 'purchase', 'complete_registration', 'app_install',
        'onsite_conversion.messaging_conversation_started_7d',
        'offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead',
        'offsite_conversion.fb_pixel_complete_registration',
        'omni_purchase', 'web_in_store_purchase',
      ]
      const conversions = (insight.actions || [])
        .filter((a: Record<string, string>) => conversionTypes.includes(a.action_type))
        .reduce((sum: number, a: Record<string, string>) => sum + Number(a.value || 0), 0)

      const revenueTypes = [
        'offsite_conversion.fb_pixel_purchase', 'purchase',
        'onsite_web_app_purchase', 'onsite_web_purchase', 'omni_purchase', 'web_in_store_purchase',
      ]
      let revenue = (insight.action_values || [])
        .filter((a: Record<string, string>) => revenueTypes.includes(a.action_type))
        .reduce((sum: number, a: Record<string, string>) => sum + Number(a.value || 0), 0)

      if (revenue === 0 && insight.purchase_roas) {
        const roasVal = Array.isArray(insight.purchase_roas)
          ? Number(insight.purchase_roas[0]?.value || 0)
          : Number(insight.purchase_roas || 0)
        if (roasVal > 0) revenue = roasVal * Number(insight.spend || 0)
      }

      await supabase.from('campaign_metrics').upsert({
        campaign_id: campaign.id,
        date: new Date().toISOString().split('T')[0],
        impressions: Number(insight.impressions || 0),
        reach: Number(insight.reach || 0),
        clicks: Number(insight.clicks || 0),
        ctr: Number(insight.ctr || 0),
        cpc: Number(insight.cpc || 0),
        cpm: Number(insight.cpm || 0),
        spend: Number(insight.spend || 0),
        conversions,
        revenue,
        frequency: Number(insight.frequency || 0),
      }, { onConflict: 'campaign_id,date' })
    }
  } catch (insightErr) {
    console.error('Erro ao buscar insights (campanhas salvas sem metricas):', insightErr)
  }
}

// ==================== HELPERS ====================

function mapObjectiveToMeta(objective: string): string {
  const map: Record<string, string> = {
    LEADS: 'OUTCOME_LEADS',
    SALES: 'OUTCOME_SALES',
    TRAFFIC: 'OUTCOME_TRAFFIC',
    REGISTRATION: 'OUTCOME_LEADS',
    APP_INSTALL: 'OUTCOME_APP_PROMOTION',
    AWARENESS: 'OUTCOME_AWARENESS',
    ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
    FUNNEL: 'OUTCOME_SALES',
  }
  return map[objective] || 'OUTCOME_TRAFFIC'
}

function mapObjectiveFromMeta(metaObjective: string): string {
  const map: Record<string, string> = {
    OUTCOME_LEADS: 'LEADS',
    OUTCOME_SALES: 'SALES',
    OUTCOME_TRAFFIC: 'TRAFFIC',
    OUTCOME_APP_PROMOTION: 'APP_INSTALL',
    OUTCOME_AWARENESS: 'AWARENESS',
    OUTCOME_ENGAGEMENT: 'ENGAGEMENT',
    LEAD_GENERATION: 'LEADS',
    LINK_CLICKS: 'TRAFFIC',
    CONVERSIONS: 'SALES',
    REACH: 'AWARENESS',
    POST_ENGAGEMENT: 'ENGAGEMENT',
    APP_INSTALLS: 'APP_INSTALL',
    BRAND_AWARENESS: 'AWARENESS',
    VIDEO_VIEWS: 'ENGAGEMENT',
    MESSAGES: 'LEADS',
  }
  return map[metaObjective] || 'TRAFFIC'
}

class MetaApiError extends Error {
  code: number
  type: string
  fbTraceId: string

  constructor(error: { message: string; code: number; type: string; fbtrace_id: string }) {
    super(error.message)
    this.name = 'MetaApiError'
    this.code = error.code
    this.type = error.type
    this.fbTraceId = error.fbtrace_id
  }
}

export { MetaApiError }
