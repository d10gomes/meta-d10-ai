export type MetaObjective =
  | 'LEADS'
  | 'SALES'
  | 'TRAFFIC'
  | 'REGISTRATION'
  | 'APP_INSTALL'
  | 'AWARENESS'
  | 'ENGAGEMENT'
  | 'FUNNEL'

export interface MetaObjectiveConfig {
  id: MetaObjective
  name: string
  description: string
  icon: string
  color: string
  kpis: string[]
  optimizationGoal: string
  bidStrategy: string[]
  placements: string[]
}

export const META_OBJECTIVES: Record<MetaObjective, MetaObjectiveConfig> = {
  LEADS: {
    id: 'LEADS',
    name: 'Leads WhatsApp',
    description: 'Gerar leads qualificados direto no WhatsApp',
    icon: 'MessageCircle',
    color: 'bg-green-500',
    kpis: ['CPL', 'Taxa de Resposta', 'Leads Qualificados', 'Custo por Conversa'],
    optimizationGoal: 'LEAD_GENERATION',
    bidStrategy: ['LOWEST_COST', 'COST_CAP', 'BID_CAP'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'INSTAGRAM_STORIES', 'FACEBOOK_STORIES'],
  },
  SALES: {
    id: 'SALES',
    name: 'Vendas de Produtos',
    description: 'Vender produtos via catalogo ou loja',
    icon: 'ShoppingCart',
    color: 'bg-blue-500',
    kpis: ['ROAS', 'CPA', 'Ticket Medio', 'Receita Total', 'Conversoes'],
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    bidStrategy: ['LOWEST_COST', 'TARGET_ROAS', 'COST_CAP'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'INSTAGRAM_STORIES', 'AUDIENCE_NETWORK', 'INSTAGRAM_SHOP'],
  },
  TRAFFIC: {
    id: 'TRAFFIC',
    name: 'Trafego Direto',
    description: 'Enviar pessoas pro seu site ou landing page',
    icon: 'ExternalLink',
    color: 'bg-purple-500',
    kpis: ['CPC', 'CTR', 'Cliques', 'Sessoes', 'Taxa de Rejeicao'],
    optimizationGoal: 'LINK_CLICKS',
    bidStrategy: ['LOWEST_COST', 'COST_CAP'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'INSTAGRAM_STORIES', 'AUDIENCE_NETWORK', 'SEARCH'],
  },
  REGISTRATION: {
    id: 'REGISTRATION',
    name: 'Cadastros e Inscricoes',
    description: 'Capturar cadastros em formularios e landing pages',
    icon: 'UserPlus',
    color: 'bg-indigo-500',
    kpis: ['CPR', 'Taxa de Conversao', 'Cadastros', 'Custo por Cadastro'],
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    bidStrategy: ['LOWEST_COST', 'COST_CAP', 'BID_CAP'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'FACEBOOK_INSTANT_FORMS'],
  },
  APP_INSTALL: {
    id: 'APP_INSTALL',
    name: 'Instalacao de Apps',
    description: 'Aumentar downloads do aplicativo',
    icon: 'Smartphone',
    color: 'bg-cyan-500',
    kpis: ['CPI', 'Instalacoes', 'Custo por Instalacao', 'ROAS in-app'],
    optimizationGoal: 'APP_INSTALLS',
    bidStrategy: ['LOWEST_COST', 'COST_CAP', 'BID_CAP'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'INSTAGRAM_STORIES', 'AUDIENCE_NETWORK', 'INSTAGRAM_REELS'],
  },
  AWARENESS: {
    id: 'AWARENESS',
    name: 'Reconhecimento de Marca',
    description: 'Fazer mais pessoas conhecerem sua marca',
    icon: 'Eye',
    color: 'bg-orange-500',
    kpis: ['CPM', 'Alcance', 'Frequencia', 'Impressoes', 'Recall de Marca'],
    optimizationGoal: 'REACH',
    bidStrategy: ['LOWEST_COST'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'INSTAGRAM_STORIES', 'INSTAGRAM_REELS', 'FACEBOOK_VIDEO'],
  },
  ENGAGEMENT: {
    id: 'ENGAGEMENT',
    name: 'Engajamento',
    description: 'Aumentar curtidas, comentarios e compartilhamentos',
    icon: 'Heart',
    color: 'bg-pink-500',
    kpis: ['CPE', 'Engajamentos', 'Taxa de Engajamento', 'Compartilhamentos', 'Comentarios'],
    optimizationGoal: 'POST_ENGAGEMENT',
    bidStrategy: ['LOWEST_COST', 'COST_CAP'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'INSTAGRAM_STORIES', 'INSTAGRAM_REELS'],
  },
  FUNNEL: {
    id: 'FUNNEL',
    name: 'Funil Completo',
    description: 'Estrategia de funil: topo, meio e fundo',
    icon: 'Filter',
    color: 'bg-amber-500',
    kpis: ['ROAS Geral', 'CAC', 'LTV', 'Taxa de Conversao por Etapa'],
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    bidStrategy: ['LOWEST_COST', 'TARGET_ROAS', 'COST_CAP'],
    placements: ['FACEBOOK_FEED', 'INSTAGRAM_FEED', 'INSTAGRAM_STORIES', 'INSTAGRAM_REELS', 'AUDIENCE_NETWORK'],
  },
}

export interface AdSet {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  budget: number
  budgetType: 'DAILY' | 'LIFETIME'
  targeting: Targeting
  placements: string[]
  bidStrategy: string
  bidAmount?: number
  startDate: string
  endDate?: string
}

export interface Targeting {
  ageMin: number
  ageMax: number
  genders: ('male' | 'female' | 'all')[]
  locations: Location[]
  interests: Interest[]
  customAudiences: string[]
  lookalikeAudiences: string[]
  excludedAudiences: string[]
}

export interface Location {
  name: string
  type: 'city' | 'state' | 'country' | 'radius'
  radius?: number
}

export interface Interest {
  id: string
  name: string
  category: string
}

export interface Ad {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  creative: Creative
  metrics: AdMetrics
}

export interface Creative {
  id: string
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'COLLECTION'
  headline: string
  description: string
  callToAction: string
  mediaUrl: string
  thumbnailUrl?: string
}

export interface AdMetrics {
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  spend: number
  conversions: number
  costPerConversion: number
  roas: number
  frequency: number
}

export interface Campaign {
  id: string
  companyId: string
  metaCampaignId?: string
  name: string
  objective: MetaObjective
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ARCHIVED'
  budget: number
  budgetType: 'DAILY' | 'LIFETIME'
  startDate: string
  endDate?: string
  adSets: AdSet[]
  ads: Ad[]
  metrics: AdMetrics
  agentId: string
  automationEnabled: boolean
  rules: AutomationRule[]
}

export interface AutomationRule {
  id: string
  name: string
  condition: string
  action: string
  threshold: number
  enabled: boolean
}
