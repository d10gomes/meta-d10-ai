import type { Campaign, MetaObjective } from './meta'

export interface Company {
  id: string
  name: string
  logo?: string
  industry: string
  website?: string
  whatsapp?: string
  metaAccountId?: string
  pixelId?: string
  monthlyBudget: number
  goals: CompanyGoal[]
  campaigns: Campaign[]
  agents: CompanyAgent[]
  status: 'active' | 'paused' | 'setup'
  createdAt: string
}

export interface CompanyGoal {
  id: string
  objective: MetaObjective
  target: number
  metric: string
  currentValue: number
  deadline: string
  status: 'on_track' | 'behind' | 'ahead' | 'completed'
}

export interface CompanyAgent {
  id: string
  type: AgentRole
  status: 'active' | 'idle' | 'working' | 'alert'
  lastAction: string
  lastActionAt: string
  actionsToday: number
  performance: number
}

export type AgentRole =
  | 'orchestrator'
  | 'leads'
  | 'sales'
  | 'traffic'
  | 'registration'
  | 'apps'
  | 'awareness'
  | 'engagement'
  | 'funnel'
  | 'creative'
  | 'audience'
  | 'budget'
  | 'copy'
  | 'analytics'

export interface AgentRoleConfig {
  id: AgentRole
  name: string
  description: string
  icon: string
  color: string
  capabilities: string[]
}

export const AGENT_ROLES: Record<AgentRole, AgentRoleConfig> = {
  orchestrator: {
    id: 'orchestrator',
    name: 'Diretor',
    description: 'Coordena todos os agentes, distribui tarefas e resolve conflitos',
    icon: 'Crown',
    color: 'bg-yellow-500',
    capabilities: ['Distribuir orcamento', 'Priorizar campanhas', 'Resolver conflitos', 'Relatorios executivos'],
  },
  leads: {
    id: 'leads',
    name: 'Agente de Leads',
    description: 'Especialista em gerar leads qualificados para WhatsApp',
    icon: 'MessageCircle',
    color: 'bg-green-500',
    capabilities: ['Otimizar CPL', 'Qualificar leads', 'A/B test formularios', 'Segmentar publico quente'],
  },
  sales: {
    id: 'sales',
    name: 'Agente de Vendas',
    description: 'Especialista em campanhas de venda direta de produtos',
    icon: 'ShoppingCart',
    color: 'bg-blue-500',
    capabilities: ['Maximizar ROAS', 'Otimizar catalogo', 'Dynamic ads', 'Retargeting de carrinho'],
  },
  traffic: {
    id: 'traffic',
    name: 'Agente de Trafego',
    description: 'Especialista em direcionar trafego qualificado',
    icon: 'ExternalLink',
    color: 'bg-purple-500',
    capabilities: ['Reduzir CPC', 'Otimizar CTR', 'Testar landing pages', 'Segmentar por interesse'],
  },
  registration: {
    id: 'registration',
    name: 'Agente de Cadastro',
    description: 'Especialista em capturar cadastros e inscricoes',
    icon: 'UserPlus',
    color: 'bg-indigo-500',
    capabilities: ['Otimizar formularios', 'Instant Forms', 'Lead magnets', 'Nurturing sequence'],
  },
  apps: {
    id: 'apps',
    name: 'Agente de Apps',
    description: 'Especialista em instalacao e engajamento de apps',
    icon: 'Smartphone',
    color: 'bg-cyan-500',
    capabilities: ['Reduzir CPI', 'Deep linking', 'App events', 'Re-engagement'],
  },
  awareness: {
    id: 'awareness',
    name: 'Agente de Awareness',
    description: 'Especialista em reconhecimento de marca',
    icon: 'Eye',
    color: 'bg-orange-500',
    capabilities: ['Maximizar alcance', 'Controlar frequencia', 'Brand lift', 'Video views'],
  },
  engagement: {
    id: 'engagement',
    name: 'Agente de Engajamento',
    description: 'Especialista em interacoes e prova social',
    icon: 'Heart',
    color: 'bg-pink-500',
    capabilities: ['Aumentar engajamento', 'Viralizar conteudo', 'Community building', 'UGC'],
  },
  funnel: {
    id: 'funnel',
    name: 'Agente de Funil',
    description: 'Especialista em estrategia de funil completo',
    icon: 'Filter',
    color: 'bg-amber-500',
    capabilities: ['Funil TOFU/MOFU/BOFU', 'Sequencia de anuncios', 'Pixel events', 'Attribution'],
  },
  creative: {
    id: 'creative',
    name: 'Analista de Criativos',
    description: 'Analisa performance de criativos e sugere variacoes',
    icon: 'Palette',
    color: 'bg-rose-500',
    capabilities: ['A/B testing', 'Creative fatigue', 'Hook analysis', 'Format testing'],
  },
  audience: {
    id: 'audience',
    name: 'Analista de Publico',
    description: 'Especialista em segmentacao e publicos',
    icon: 'Users',
    color: 'bg-teal-500',
    capabilities: ['Lookalike audiences', 'Custom audiences', 'Exclusoes', 'Micro-segmentacao'],
  },
  budget: {
    id: 'budget',
    name: 'Gestor de Orcamento',
    description: 'Otimiza distribuicao de verba entre campanhas',
    icon: 'DollarSign',
    color: 'bg-emerald-500',
    capabilities: ['Budget allocation', 'Bid optimization', 'Scaling rules', 'Waste reduction'],
  },
  copy: {
    id: 'copy',
    name: 'Copywriter IA',
    description: 'Cria e testa copies para anuncios',
    icon: 'PenTool',
    color: 'bg-violet-500',
    capabilities: ['Headlines', 'CTAs', 'Angulos de venda', 'Emotional triggers'],
  },
  analytics: {
    id: 'analytics',
    name: 'Analista de Dados',
    description: 'Monitora metricas e gera relatorios',
    icon: 'BarChart3',
    color: 'bg-sky-500',
    capabilities: ['Dashboards', 'Anomaly detection', 'Trend analysis', 'Forecasting'],
  },
}
