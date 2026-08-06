import { useState, useEffect } from 'react'
import { Zap, Play, Pause, AlertTriangle, TrendingDown, TrendingUp, DollarSign, Target, Plus, X, Loader2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { fetchAutomationRules, toggleAutomationRule } from '../lib/supabase-data'
import { supabase } from '../lib/supabase'

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
  ctr: 'CTR', roas: 'ROAS', cpa: 'CPA', cpc: 'CPC', cpm: 'CPM',
  frequency: 'Frequencia', conversions: 'Conversoes', spend: 'Gasto',
  impressions: 'Impressoes', clicks: 'Cliques',
}

const actionLabels: Record<string, string> = {
  pause_ad: 'Pausar campanha', activate_ad: 'Ativar campanha',
  adjust_budget: 'Ajustar budget', scale_campaign: 'Escalar campanha',
  kill_campaign: 'Encerrar campanha', send_alert: 'Enviar alerta',
}

const operatorLabels: Record<string, string> = {
  '>': 'maior que', '<': 'menor que', '>=': 'maior ou igual a',
  '<=': 'menor ou igual a', '==': 'igual a', '!=': 'diferente de',
}

export default function Automations() {
  const { companies, selectedCompanyId } = useApp()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '', companyId: companies[0]?.id || '', agentRole: 'analytics',
    metric: 'ctr', operator: '<', threshold: 1, action: 'pause_ad',
  })

  useEffect(() => {
    loadRules()
  }, [selectedCompanyId])

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

  const handleCreate = async () => {
    if (!newRule.name) return
    setSaving(true)
    try {
      const { error } = await supabase.from('automation_rules').insert({
        company_id: newRule.companyId,
        name: newRule.name,
        agent_role: newRule.agentRole,
        condition_type: `${newRule.metric} ${newRule.operator} ${newRule.threshold}`,
        metric: newRule.metric,
        operator: newRule.operator,
        threshold: newRule.threshold,
        action_type: newRule.action,
        action_params: {},
        enabled: true,
      })
      if (error) throw error
      await loadRules()
      setShowForm(false)
      setNewRule({ name: '', companyId: companies[0]?.id || '', agentRole: 'analytics', metric: 'ctr', operator: '<', threshold: 1, action: 'pause_ad' })
    } catch (err) {
      console.error('Erro ao criar regra:', err)
    } finally {
      setSaving(false)
    }
  }

  const activeRules = rules.filter(r => r.enabled).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Regras Ativas</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeRules}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total de Regras</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{rules.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Empresas Monitoradas</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{new Set(rules.map(r => r.companyId)).size}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Nova Regra de Automacao</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nome da Regra</label>
              <input type="text" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Pausar CTR baixo" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Empresa</label>
              <select value={newRule.companyId} onChange={e => setNewRule(p => ({ ...p, companyId: e.target.value }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Metrica</label>
              <select value={newRule.metric} onChange={e => setNewRule(p => ({ ...p, metric: e.target.value }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(metricLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Operador</label>
                <select value={newRule.operator} onChange={e => setNewRule(p => ({ ...p, operator: e.target.value }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(operatorLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Valor</label>
                <input type="number" step="0.1" value={newRule.threshold} onChange={e => setNewRule(p => ({ ...p, threshold: Number(e.target.value) }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Acao</label>
              <select value={newRule.action} onChange={e => setNewRule(p => ({ ...p, action: e.target.value }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Agente Responsavel</label>
              <select value={newRule.agentRole} onChange={e => setNewRule(p => ({ ...p, agentRole: e.target.value }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="analytics">Analista de Dados</option>
                <option value="budget">Gestor de Orcamento</option>
                <option value="creative">Analista de Criativos</option>
                <option value="audience">Analista de Publico</option>
                <option value="orchestrator">Diretor</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            <strong>Regra:</strong> Se {metricLabels[newRule.metric] || newRule.metric} for {operatorLabels[newRule.operator]} {newRule.threshold}, entao {actionLabels[newRule.action] || newRule.action}
          </div>
          <button onClick={handleCreate} disabled={saving || !newRule.name} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Criar Regra
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Regras de Automacao</h3>
          </div>
          <button onClick={() => setShowForm(true)} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus size={14} />
            Nova Regra
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Carregando regras...
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            Nenhuma regra criada ainda. Clique em "Nova Regra" para comecar.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rules.map((rule) => {
              const iconConfig = metricIcons[rule.metric] || { icon: Zap, color: 'text-gray-600' }
              const Icon = iconConfig.icon
              const companyName = companies.find(c => c.id === rule.companyId)?.name || ''

              return (
                <div key={rule.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-xl bg-gray-50 ${iconConfig.color}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{rule.name}</h4>
                        <p className="text-xs text-gray-400 mb-1">{companyName}</p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Se:</span> {metricLabels[rule.metric] || rule.metric} {operatorLabels[rule.operator] || rule.operator} {rule.threshold}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Entao:</span> {actionLabels[rule.action] || rule.action}
                        </p>
                        {rule.lastTriggered && (
                          <p className="text-xs text-gray-400 mt-1">
                            Ultima execucao: {new Date(rule.lastTriggered).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(rule.id, rule.enabled)}
                      className={`p-2 rounded-lg transition-colors ${rule.enabled ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {rule.enabled ? <Play size={16} /> : <Pause size={16} />}
                    </button>
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
