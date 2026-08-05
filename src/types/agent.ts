import type { AgentRole } from './company'

export interface AgentMessage {
  id: string
  from: AgentRole
  to: AgentRole | 'broadcast'
  type: 'insight' | 'alert' | 'recommendation' | 'request' | 'report'
  priority: 'low' | 'medium' | 'high' | 'critical'
  subject: string
  content: string
  data?: Record<string, unknown>
  timestamp: string
  read: boolean
}

export interface AgentAction {
  id: string
  agentRole: AgentRole
  companyId: string
  campaignId?: string
  type: ActionType
  description: string
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
  result?: string
  impact?: ActionImpact
  timestamp: string
}

export type ActionType =
  | 'pause_ad'
  | 'activate_ad'
  | 'adjust_budget'
  | 'adjust_bid'
  | 'change_targeting'
  | 'create_audience'
  | 'duplicate_adset'
  | 'create_campaign'
  | 'send_alert'
  | 'generate_report'
  | 'suggest_creative'
  | 'optimize_placement'
  | 'scale_campaign'
  | 'kill_campaign'

export interface ActionImpact {
  metric: string
  before: number
  after: number
  change: number
  changePercent: number
}

export interface AgentMemory {
  id: string
  agentRole: AgentRole
  companyId?: string
  type: 'learning' | 'pattern' | 'rule' | 'warning'
  content: string
  confidence: number
  validatedAt?: string
  usageCount: number
  createdAt: string
}

export interface AgentStrategy {
  id: string
  objective: string
  rules: StrategyRule[]
  priority: number
  enabled: boolean
}

export interface StrategyRule {
  condition: string
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  value: number
  timeWindow: string
  action: ActionType
  actionParams: Record<string, unknown>
}

export interface OrchestratorDecision {
  id: string
  type: 'budget_allocation' | 'priority_shift' | 'conflict_resolution' | 'emergency'
  description: string
  affectedAgents: AgentRole[]
  affectedCompanies: string[]
  reasoning: string
  decision: string
  timestamp: string
}
