import { useState, useEffect } from 'react'
import { Zap, Play, Pause, AlertTriangle, TrendingDown, TrendingUp, DollarSign, Target, Plus, X, Loader2, Trash2, Pencil, Copy, Check } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { fetchAutomationRules, createAutomationRule, toggleAutomationRule, updateAutomationRule, deleteAutomationRule } from '../lib/supabase-data'

interface Rule {
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
  lastTriggered: string | null
}

interface RuleForm {
  name: string
  companyId: string
  agentRole: string
  metric: string
  operator: string
  threshold: number
  action: string
  actionParams: Record<string, unknown>
}

const metricIcons: Record<string, { icon: React.ElementType; color: string }> = {
  ctr: { icon: TrendingDown, color: 'text-red-600' },
  roas: { icon: TrendingUp, color: 'text-green-600' },
  cpa: { icon: AlertTriangle, color: 'text-yellow-600' },
  cpc: { icon: DollarSign, color: 'text-blue-600' },
  frequency: { icon: AlertTriangle, color: 'text-orange-600' },
  conversions: { icon: Target, color: 'text-purple-600' },
  spend: { icon: DollarSign, color: 'text-blue-600' },
}

const metricLabels: Record<string, string> = {
  ctr: 'CTR (%)', roas: 'ROAS (x)', cpa: 'CPA (R$)', cpc: 'CPC (R$)', cpm: 'CPM (R$)',
  frequency: 'Frequencia', conversions: 'Conversoes', spend: 'Gasto (R$)',
  impressions: 'Impressoes', clicks: 'Cliques',
}

const actionLabels: Record<string, string> = {
  pause_ad: 'Pausar campanha', activate_ad: 'Ativar campanha',
  adjust_budget: 'Ajustar budget', scale_campaign: 'Escalar campanha',
  kill_campaign: 'Encerrar campanha', send_alert: 'Enviar alerta',
}

const actionsWithMultiplier = ['adjust_budget', 'scale_campaign']

const operatorLabels: Record<string, string> = {
  '>': 'maior que', '<': 'menor que', '>=': 'maior ou igual a',
  '<=': 'menor ou igual a', '==': 'igual a', '!=': 'diferente de',
}

const agentOptions = [
  { value: 'analytics', label: 'Analista de Dados' },
  { value: 'budget', label: 'Gestor de Orcamento' },
  { value: 'creative', label: 'Analista de Criativos' },
  { value: 'audience', label: 'Analista de Publico' },
  { value: 'orchestrator', label: 'Diretor' },
  { value: 'traffic', label: 'Agente de Trafego' },
  { value: 'leads', label: 'Agente de Leads' },
]

const templates: { name: string; description: string; form: Omit<RuleForm, 'companyId'> }[] = [
  {
    name: 'Pausar CTR baixo',
    description: 'Pausa campanhas com CTR abaixo de 1%',
    form: { name: 'Pausar CTR baixo', agentRole: 'analytics', metric: 'ctr', operator: '<', threshold: 1, action: 'pause_ad', actionParams: {} },
  },
  {
    name: 'Escalar ROAS alto',
    description: 'Escala 20% campanhas com ROAS acima de 3x',
    form: { name: 'Escalar ROAS alto', agentRole: 'budget', metric: 'roas', operator: '>', threshold: 3, action: 'scale_campaign', actionParams: { multiplier: 1.2 } },
  },
  {
    name: 'Alerta CPA alto',
    description: 'Alerta quando CPA ultrapassa R$50',
    form: { name: 'Alerta CPA alto', agentRole: 'analytics', metric: 'cpa', operator: '>', threshold: 50, action: 'send_alert', actionParams: {} },
  },
  {
    name: 'Reduzir budget sem conversoes',
    description: 'Reduz 40% o budget de campanhas sem conversoes',
    form: { name: 'Reduzir budget sem conversoes', agentRole: 'budget', metric: 'conversions', operator: '==', threshold: 0, action: 'adjust_budget', actionParams: { multiplier: 0.6 } },
  },
  {
    name: 'Pausar frequencia alta',
    description: 'Pausa campanhas com frequencia acima de 6',
    form: { name: 'Pausar frequencia alta', agentRole: 'audience', metric: 'frequency', operator: '>', threshold: 6, action: 'pause_ad', actionParams: {} },
  },
  {
    name: 'Cortar gasto excessivo',
    description: 'Encerra campanhas gastando mais de R$500 sem retorno',
    form: { name: 'Cortar gasto excessivo', agentRole: 'orchestrator', metric: 'spend', operator: '>', threshold: 500, action: 'kill_campaign', actionParams: {} },
  },
]

const emptyForm = (companyId: string): RuleForm => ({
  name: '', companyId, agentRole: 'analytics',
  metric: 'ctr', operator: '<', threshold: 1, action: 'pause_ad', actionParams: {},
})

export default function Automations() {
  const { companies, selectedCompanyId } = useApp()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [form, setForm] = useState<RuleForm>(emptyForm(companies[0]?.id || ''))

  useEffect(() => { loadRules() }, [selectedCompanyId])

  const loadRules = async () => {
    setLoading(true)
    try {
      const data = await fetchAutomationRules(selectedCompanyId || undefined)
      setRules(data as Rule[])
    } catch (err) {
      console.error('Erro ao carregar regras:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      await toggleAutomationRule(id, !currentEnabled)
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !currentEnabled } : r))
    } catch (err) {
      console.error('Erro ao alternar regra:', err)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm(selectedCompanyId || companies[0]?.id || ''))
    setShowForm(true)
    setShowTemplates(false)
  }

  const openEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setForm({
      name: rule.name,
      companyId: rule.companyId,
      agentRole: rule.agentRole,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      action: rule.action,
      actionParams: rule.actionParams || {},
    })
    setShowForm(true)
    setShowTemplates(false)
  }

  const applyTemplate = (tpl: typeof templates[0]) => {
    setEditingId(null)
    setForm({ ...tpl.form, companyId: selectedCompanyId || companies[0]?.id || '' })
    setShowTemplates(false)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editingId) {
        await updateAutomationRule(editingId, {
          name: form.name,
          agentRole: form.agentRole,
          metric: form.metric,
          operator: form.operator,
          threshold: form.threshold,
          action: form.action,
          actionParams: form.actionParams,
        })
      } else {
        await createAutomationRule({
          companyId: form.companyId,
          name: form.name,
          agentRole: form.agentRole,
          metric: form.metric,
          operator: form.operator,
          threshold: form.threshold,
          action: form.action,
          actionParams: form.actionParams,
        })
      }
      await loadRules()
      setShowForm(false)
      setEditingId(null)
    } catch (err) {
      console.error('Erro ao salvar regra:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteAutomationRule(id)
      setRules(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('Erro ao deletar regra:', err)
    } finally {
      setDeleting(null)
    }
  }

  const handleDuplicate = (rule: Rule) => {
    setEditingId(null)
    setForm({
      name: `${rule.name} (copia)`,
      companyId: rule.companyId,
      agentRole: rule.agentRole,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      action: rule.action,
      actionParams: rule.actionParams || {},
    })
    setShowForm(true)
  }

  const updateField = <K extends keyof RuleForm>(key: K, value: RuleForm[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'action') {
        if (actionsWithMultiplier.includes(value as string) && !next.actionParams.multiplier) {
          next.actionParams = { ...next.actionParams, multiplier: value === 'scale_campaign' ? 1.2 : 0.7 }
        } else if (!actionsWithMultiplier.includes(value as string)) {
          const { multiplier: _, ...rest } = next.actionParams
          next.actionParams = rest
        }
      }
      return next
    })
  }

  const activeRules = rules.filter(r => r.enabled).length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Regras Ativas</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeRules}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total de Regras</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{rules.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Regras Pausadas</p>
          <p className="text-3xl font-bold text-gray-400 mt-1">{rules.length - activeRules}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Empresas Monitoradas</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{new Set(rules.map(r => r.companyId)).size}</p>
        </div>
      </div>

      {/* Templates */}
      {showTemplates && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Templates Prontos</h3>
            <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => applyTemplate(tpl)}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <p className="font-medium text-gray-900 text-sm">{tpl.name}</p>
                <p className="text-xs text-gray-500 mt-1">{tpl.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{metricLabels[tpl.form.metric]}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{actionLabels[tpl.form.action]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {editingId ? 'Editar Regra' : 'Nova Regra de Automacao'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nome da Regra</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Ex: Pausar CTR baixo"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Empresa</label>
              <select
                value={form.companyId}
                onChange={e => updateField('companyId', e.target.value)}
                disabled={!!editingId}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Metrica</label>
              <select value={form.metric} onChange={e => updateField('metric', e.target.value)} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(metricLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Operador</label>
                <select value={form.operator} onChange={e => updateField('operator', e.target.value)} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(operatorLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Valor</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.threshold}
                  onChange={e => updateField('threshold', Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Acao</label>
              <select value={form.action} onChange={e => updateField('action', e.target.value)} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Agente Responsavel</label>
              <select value={form.agentRole} onChange={e => updateField('agentRole', e.target.value)} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {agentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {actionsWithMultiplier.includes(form.action) && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Multiplicador de Budget
                  <span className="text-gray-400 ml-1">
                    ({((form.actionParams.multiplier as number || 1) * 100 - 100).toFixed(0)}%)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="3"
                  value={(form.actionParams.multiplier as number) || 1}
                  onChange={e => updateField('actionParams', { ...form.actionParams, multiplier: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {((form.actionParams.multiplier as number) || 1) > 1
                    ? `Aumenta o budget em ${(((form.actionParams.multiplier as number || 1) - 1) * 100).toFixed(0)}%`
                    : `Reduz o budget em ${((1 - (form.actionParams.multiplier as number || 1)) * 100).toFixed(0)}%`
                  }
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            <strong>Regra:</strong> Se {metricLabels[form.metric] || form.metric} for {operatorLabels[form.operator]} {form.threshold}, entao {actionLabels[form.action] || form.action}
            {actionsWithMultiplier.includes(form.action) && form.actionParams.multiplier && (
              <> ({((form.actionParams.multiplier as number) > 1 ? '+' : '')}{(((form.actionParams.multiplier as number) - 1) * 100).toFixed(0)}%)</>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {editingId ? 'Salvar Alteracoes' : 'Criar Regra'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Regras de Automacao</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowTemplates(!showTemplates); setShowForm(false) }}
              className="text-sm bg-purple-50 text-purple-600 px-4 py-2 rounded-xl font-medium hover:bg-purple-100 flex items-center gap-2 border border-purple-200"
            >
              <Copy size={14} />
              Templates
            </button>
            <button
              onClick={openCreate}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={14} />
              Nova Regra
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Carregando regras...
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center">
            <Zap size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">Nenhuma regra criada ainda</p>
            <p className="text-sm text-gray-400 mb-4">Use templates prontos ou crie regras personalizadas</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setShowTemplates(true); setShowForm(false) }}
                className="text-sm bg-purple-50 text-purple-600 px-4 py-2 rounded-xl font-medium hover:bg-purple-100 border border-purple-200"
              >
                Ver Templates
              </button>
              <button
                onClick={openCreate}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700"
              >
                Criar Regra
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rules.map((rule) => {
              const iconConfig = metricIcons[rule.metric] || { icon: Zap, color: 'text-gray-600' }
              const Icon = iconConfig.icon
              const companyName = companies.find(c => c.id === rule.companyId)?.name || ''
              const isDeleting = deleting === rule.id

              return (
                <div key={rule.id} className={`p-5 hover:bg-gray-50/50 transition-colors ${!rule.enabled ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-xl bg-gray-50 ${iconConfig.color}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{rule.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {rule.enabled ? 'Ativa' : 'Pausada'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{companyName} • {agentOptions.find(a => a.value === rule.agentRole)?.label || rule.agentRole}</p>
                        <p className="text-sm text-gray-600">
                          Se <span className="font-medium text-gray-800">{metricLabels[rule.metric] || rule.metric}</span>{' '}
                          {operatorLabels[rule.operator] || rule.operator}{' '}
                          <span className="font-medium text-gray-800">{rule.threshold}</span>
                          {' → '}<span className="font-medium text-blue-600">{actionLabels[rule.action] || rule.action}</span>
                          {actionsWithMultiplier.includes(rule.action) && rule.actionParams?.multiplier && (
                            <span className="text-gray-500">
                              {' '}({((rule.actionParams.multiplier as number) > 1 ? '+' : '')}{(((rule.actionParams.multiplier as number) - 1) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </p>
                        {rule.lastTriggered && (
                          <p className="text-xs text-gray-400 mt-1">
                            Ultima execucao: {new Date(rule.lastTriggered).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(rule)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(rule)}
                        className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Duplicar"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => handleToggle(rule.id, rule.enabled)}
                        className={`p-2 rounded-lg transition-colors ${rule.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={rule.enabled ? 'Pausar' : 'Ativar'}
                      >
                        {rule.enabled ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={isDeleting}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
