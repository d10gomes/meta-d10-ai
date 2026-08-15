import { useState, useEffect, useCallback } from 'react'
import { Crown, MessageCircle, ShoppingCart, ExternalLink, UserPlus, Smartphone, Eye, Heart, Filter, Palette, Users, DollarSign, PenTool, BarChart3, ArrowRight, Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight, Zap, Play, Loader2, RefreshCw } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { AGENT_ROLES, type AgentRole } from '../types/company'
import { fetchRecentTasks, journeyLog, type Task } from '../lib/supabase-data'

const iconMap: Record<string, React.ElementType> = {
  Crown, MessageCircle, ShoppingCart, ExternalLink, UserPlus, Smartphone,
  Eye, Heart, Filter, Palette, Users, DollarSign, PenTool, BarChart3,
}

const statusColors = {
  active: 'bg-green-500',
  working: 'bg-blue-500 animate-pulse',
  idle: 'bg-gray-400',
  alert: 'bg-red-500 animate-pulse',
}

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  working: 'Trabalhando',
  idle: 'Inativo',
  alert: 'Alerta',
}

const taskStatusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  created: { icon: Clock, color: 'text-gray-500 bg-gray-100', label: 'Criada' },
  running: { icon: Loader2, color: 'text-blue-600 bg-blue-50', label: 'Executando' },
  completed: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Concluida' },
  failed: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Falhou' },
  cancelled: { icon: XCircle, color: 'text-gray-500 bg-gray-100', label: 'Cancelada' },
}

const stepTypeLabels: Record<string, { label: string; color: string }> = {
  data_loaded: { label: 'Dados carregados', color: 'text-blue-600 bg-blue-50' },
  skill_executed: { label: 'Analise executada', color: 'text-purple-600 bg-purple-50' },
  decision_made: { label: 'Decisao tomada', color: 'text-amber-600 bg-amber-50' },
  permission_checked: { label: 'Permissao verificada', color: 'text-cyan-600 bg-cyan-50' },
  action_executed: { label: 'Acao executada', color: 'text-green-600 bg-green-50' },
  action_failed: { label: 'Acao falhou', color: 'text-red-600 bg-red-50' },
  conflict_resolved: { label: 'Conflito resolvido', color: 'text-orange-600 bg-orange-50' },
  rule_triggered: { label: 'Regra ativada', color: 'text-indigo-600 bg-indigo-50' },
  guardrail_applied: { label: 'Guardrails aplicados', color: 'text-emerald-600 bg-emerald-50' },
}

interface JourneyStep {
  step_order: number
  step_type: string
  agent_role: string | null
  skill_id: string | null
  capability_id: string | null
  campaign_id: string | null
  reasoning: string | null
  confidence: number | null
  error: string | null
  duration_ms: number | null
  created_at: string
}

type ViewTab = 'agents' | 'tasks'

export default function Agents() {
  const { companies, selectedCompanyId, messages } = useApp()
  const [activeTab, setActiveTab] = useState<ViewTab>('agents')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [journeySteps, setJourneySteps] = useState<Record<string, JourneyStep[]>>({})
  const [loadingJourney, setLoadingJourney] = useState<string | null>(null)

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const allAgents = filteredCompanies.flatMap((c) =>
    c.agents.map((a) => ({ ...a, companyName: c.name, companyId: c.id }))
  )

  const roleGroups = allAgents.reduce((acc, agent) => {
    if (!acc[agent.type]) acc[agent.type] = []
    acc[agent.type].push(agent)
    return acc
  }, {} as Record<AgentRole, typeof allAgents>)

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true)
    try {
      const data = await fetchRecentTasks(selectedCompanyId || undefined, 30)
      setTasks(data)
    } catch (err) {
      console.error('Erro ao carregar tasks:', err)
    } finally {
      setLoadingTasks(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    if (activeTab === 'tasks') loadTasks()
  }, [activeTab, loadTasks])

  const toggleJourney = async (taskId: string) => {
    if (expandedTask === taskId) {
      setExpandedTask(null)
      return
    }
    setExpandedTask(taskId)
    if (!journeySteps[taskId]) {
      setLoadingJourney(taskId)
      try {
        const steps = await journeyLog.getJourney(taskId)
        setJourneySteps(prev => ({ ...prev, [taskId]: steps as JourneyStep[] }))
      } catch (err) {
        console.error('Erro ao carregar journey:', err)
      } finally {
        setLoadingJourney(null)
      }
    }
  }

  const totalDecisionsProposed = tasks.reduce((s, t) => s + t.decisionsProposed, 0)
  const totalDecisionsExecuted = tasks.reduce((s, t) => s + t.decisionsExecuted, 0)
  const totalDecisionsRejected = tasks.reduce((s, t) => s + t.decisionsRejected, 0)
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const failedTasks = tasks.filter(t => t.status === 'failed').length

  const companyNameMap = new Map(companies.map(c => [c.id, c.name]))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total de Agentes</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{allAgents.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Trabalhando Agora</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{allAgents.filter(a => a.status === 'working').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Ciclos Executados</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{completedTasks}</p>
          {failedTasks > 0 && <p className="text-xs text-red-500 mt-1">{failedTasks} falharam</p>}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Decisoes (Propostas / Executadas)</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{totalDecisionsProposed} / {totalDecisionsExecuted}</p>
          {totalDecisionsRejected > 0 && <p className="text-xs text-red-500 mt-1">{totalDecisionsRejected} rejeitadas</p>}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'agents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Agentes ({allAgents.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'tasks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historico de Tarefas ({tasks.length})
        </button>
      </div>

      {activeTab === 'agents' && (
        <>
          {/* COMUNICACAO RECENTE */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">Comunicacao entre Agentes</h3>
            <p className="text-sm text-gray-500 mb-4">Ultimas mensagens trocadas na orquestra</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {messages.slice(-4).map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    msg.priority === 'critical' ? 'bg-red-100 text-red-700' :
                    msg.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{msg.priority}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{msg.from}</span>
                      <ArrowRight size={10} />
                      <span className="font-medium text-gray-700">{msg.to}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{msg.subject}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem ainda.</p>
              )}
            </div>
          </div>

          {/* GRID DE AGENTES POR ROLE */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(roleGroups).map(([role, agents]) => {
              const config = AGENT_ROLES[role as AgentRole]
              if (!config) return null
              const Icon = iconMap[config.icon] || Users

              return (
                <div key={role} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${config.color} text-white`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {agents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[agent.status]}`}></span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{agent.companyName}</p>
                            <p className="text-xs text-gray-500 truncate">{agent.lastAction}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs font-bold text-gray-900">{agent.performance}%</p>
                          <p className="text-xs text-gray-500">{agent.actionsToday} acoes</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {config.capabilities.slice(0, 3).map((cap) => (
                      <span key={cap} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cap}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Ultimas tarefas executadas pelo motor de agentes</p>
            <button
              onClick={loadTasks}
              disabled={loadingTasks}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={12} className={loadingTasks ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          {loadingTasks && tasks.length === 0 && (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
              <Loader2 size={32} className="mx-auto text-gray-300 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Carregando tarefas...</p>
            </div>
          )}

          {!loadingTasks && tasks.length === 0 && (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
              <Play size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Nenhuma tarefa registrada ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Ative o motor de agentes para comecar a ver o historico aqui.</p>
            </div>
          )}

          {tasks.map((task) => {
            const cfg = taskStatusConfig[task.status] || taskStatusConfig.created
            const StatusIcon = cfg.icon
            const isExpanded = expandedTask === task.id
            const steps = journeySteps[task.id]
            const isLoadingThis = loadingJourney === task.id

            return (
              <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleJourney(task.id)}
                  className="w-full p-5 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${cfg.color}`}>
                      <StatusIcon size={18} className={task.status === 'running' ? 'animate-spin' : ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {task.taskType === 'cycle' ? 'Ciclo do Motor' :
                           task.taskType === 'rule_evaluation' ? 'Avaliacao de Regras' :
                           task.taskType === 'manual_action' ? 'Acao Manual' :
                           task.taskType === 'sync' ? 'Sincronizacao' : task.taskType}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{task.triggerType}</span>
                      </div>
                      {task.companyId && (
                        <p className="text-xs text-gray-500 mt-0.5">{companyNameMap.get(task.companyId) || 'Empresa desconhecida'}</p>
                      )}
                      {task.error && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {task.error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {(task.decisionsProposed > 0 || task.decisionsExecuted > 0) && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{task.decisionsProposed} propostas</span>
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{task.decisionsExecuted} executadas</span>
                          {task.decisionsRejected > 0 && (
                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{task.decisionsRejected} rejeitadas</span>
                          )}
                        </div>
                      )}
                      <div className="text-right text-xs text-gray-400">
                        <p>{new Date(task.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                        {task.startedAt && task.completedAt && (
                          <p>{Math.round((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000)}s</p>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    {isLoadingThis && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 size={14} className="animate-spin" />
                        Carregando journey...
                      </div>
                    )}
                    {!isLoadingThis && steps && steps.length === 0 && (
                      <p className="text-sm text-gray-400">Nenhum passo registrado para esta tarefa.</p>
                    )}
                    {!isLoadingThis && steps && steps.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Journey Log — {steps.length} passos</p>
                        {steps.map((step, i) => {
                          const stepCfg = stepTypeLabels[step.step_type] || { label: step.step_type, color: 'text-gray-600 bg-gray-100' }
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <div className="flex flex-col items-center flex-shrink-0">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stepCfg.color}`}>
                                  {step.step_order}
                                </div>
                                {i < steps.length - 1 && <div className="w-px h-6 bg-gray-200 mt-1" />}
                              </div>
                              <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stepCfg.color}`}>{stepCfg.label}</span>
                                  {step.agent_role && (
                                    <span className="text-xs text-gray-500">{step.agent_role}</span>
                                  )}
                                  {step.confidence != null && (
                                    <span className="text-xs text-gray-400">{Math.round(step.confidence * 100)}% confianca</span>
                                  )}
                                  {step.duration_ms != null && (
                                    <span className="text-xs text-gray-400">{step.duration_ms}ms</span>
                                  )}
                                </div>
                                {step.reasoning && (
                                  <p className="text-xs text-gray-600 mt-0.5">{step.reasoning}</p>
                                )}
                                {step.error && (
                                  <p className="text-xs text-red-500 mt-0.5">{step.error}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
