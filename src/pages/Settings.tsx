import { useState, useEffect, useCallback } from 'react'
import { Key, Shield, CheckCircle, AlertCircle, Loader2, RefreshCw, Rocket, Save } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { fetchMetaConfig, saveMetaConfig, createCompany, type MetaConfig } from '../lib/supabase-data'
import { fetchPolicies, updatePolicy, type Policy, type AutonomyLevel } from '../lib/permission-engine'
import { validateAccessToken, getAdAccounts, syncCampaignsToSupabase } from '../lib/meta-api'
import { supabase } from '../lib/supabase'
import type { AgentRole } from '../types/company'

const defaultAgentRoles: AgentRole[] = [
  'orchestrator', 'leads', 'sales', 'traffic', 'registration',
  'apps', 'awareness', 'engagement', 'funnel',
  'creative', 'audience', 'budget', 'copy', 'analytics',
]

const capabilityLabels: Record<string, { name: string; desc: string }> = {
  pause_ad: { name: 'Pausar Campanha', desc: 'Pausar campanhas com performance ruim' },
  activate_ad: { name: 'Ativar Campanha', desc: 'Reativar campanhas pausadas' },
  adjust_budget: { name: 'Ajustar Budget', desc: 'Aumentar ou reduzir orcamento diario' },
  scale_campaign: { name: 'Escalar Campanha', desc: 'Escalar campanhas com ROAS alto' },
  kill_campaign: { name: 'Encerrar Campanha', desc: 'Arquivar campanhas sem resultado' },
  send_alert: { name: 'Enviar Alerta', desc: 'Enviar notificacoes sobre anomalias' },
}

const autonomyLabels: Record<AutonomyLevel, { label: string; color: string; bg: string }> = {
  auto: { label: 'Automatico', color: 'text-green-700', bg: 'bg-green-100' },
  limited: { label: 'Limitado', color: 'text-blue-700', bg: 'bg-blue-100' },
  approval: { label: 'Aprovacao', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  prohibited: { label: 'Proibido', color: 'text-red-700', bg: 'bg-red-100' },
}

export default function Settings() {
  const { companies, refresh, selectedCompanyId: globalCompanyId } = useApp()
  const [localCompanyId, setLocalCompanyId] = useState(globalCompanyId || companies[0]?.id || '')
  const selectedCompanyId = localCompanyId
  const setSelectedCompanyId = setLocalCompanyId
  const [config, setConfig] = useState({
    appId: '', appSecret: '', accessToken: '', adAccountId: '',
    pixelId: '', pageId: '', whatsappBusinessId: '',
  })
  const [status, setStatus] = useState<MetaConfig['status']>('disconnected')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [adAccounts, setAdAccounts] = useState<{ id: string; name: string }[]>([])
  const [discoveryToken, setDiscoveryToken] = useState('')
  const [discoveryLog, setDiscoveryLog] = useState<string[]>([])

  const [policies, setPolicies] = useState<Policy[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [savingPolicies, setSavingPolicies] = useState(false)
  const [policyMessage, setPolicyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editedPolicies, setEditedPolicies] = useState<Record<string, Partial<Policy>>>({})

  useEffect(() => {
    if (globalCompanyId) setLocalCompanyId(globalCompanyId)
  }, [globalCompanyId])

  const loadPolicies = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoadingPolicies(true)
    try {
      const data = await fetchPolicies(selectedCompanyId)
      setPolicies(data)
      setEditedPolicies({})
      setPolicyMessage(null)
    } catch {
      setPolicyMessage({ type: 'error', text: 'Erro ao carregar policies' })
    } finally {
      setLoadingPolicies(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    if (!selectedCompanyId) return
    fetchMetaConfig(selectedCompanyId).then((data) => {
      if (data) {
        setConfig({
          appId: data.appId, appSecret: data.appSecret, accessToken: data.accessToken,
          adAccountId: data.adAccountId, pixelId: data.pixelId, pageId: data.pageId,
          whatsappBusinessId: data.whatsappBusinessId,
        })
        setStatus(data.status)
      } else {
        setConfig({ appId: '', appSecret: '', accessToken: '', adAccountId: '', pixelId: '', pageId: '', whatsappBusinessId: '' })
        setStatus('disconnected')
      }
    })
    loadPolicies()
  }, [selectedCompanyId, loadPolicies])

  const updateLocalPolicy = (policyId: string, field: string, value: unknown) => {
    setEditedPolicies(prev => ({
      ...prev,
      [policyId]: { ...prev[policyId], [field]: value },
    }))
  }

  const getPolicyValue = (policy: Policy, field: keyof Policy) => {
    const edited = editedPolicies[policy.id]
    if (edited && field in edited) return edited[field as keyof typeof edited]
    return policy[field]
  }

  const hasChanges = Object.keys(editedPolicies).length > 0

  const handleSavePolicies = async () => {
    setSavingPolicies(true)
    setPolicyMessage(null)
    try {
      for (const [policyId, changes] of Object.entries(editedPolicies)) {
        await updatePolicy(policyId, changes)
      }
      await loadPolicies()
      setPolicyMessage({ type: 'success', text: 'Policies salvas com sucesso! O engine agora usa esses limites.' })
    } catch {
      setPolicyMessage({ type: 'error', text: 'Erro ao salvar policies' })
    } finally {
      setSavingPolicies(false)
    }
  }

  const addLog = (msg: string) => setDiscoveryLog(prev => [...prev, msg])

  const handleAutoDiscovery = async () => {
    if (!discoveryToken.trim()) {
      setMessage({ type: 'error', text: 'Cole seu Access Token primeiro' })
      return
    }

    setDiscovering(true)
    setDiscoveryLog([])
    setMessage(null)

    try {
      addLog('Validando token...')
      const validation = await validateAccessToken(discoveryToken)
      if (!validation.valid) {
        setMessage({ type: 'error', text: `Token invalido: ${validation.error}` })
        setDiscovering(false)
        return
      }
      addLog(`Token valido! Usuario: ${validation.name}`)

      addLog('Buscando contas de anuncio...')
      const accounts = await getAdAccounts(discoveryToken)

      if (!accounts || accounts.length === 0) {
        setMessage({ type: 'error', text: 'Nenhuma conta de anuncio encontrada neste token.' })
        setDiscovering(false)
        return
      }

      addLog(`${accounts.length} conta(s) encontrada(s)`)

      for (const account of accounts) {
        const accountName = account.name || `Conta ${account.id}`
        const accountId = account.id

        addLog(`Criando empresa: ${accountName}...`)

        const existing = companies.find(c => c.name === accountName)
        let companyId: string

        if (existing) {
          companyId = existing.id
          addLog(`Empresa "${accountName}" ja existe, atualizando...`)
        } else {
          const result = await createCompany({
            name: accountName,
            industry: 'Trafego Pago',
            monthlyBudget: 0,
            status: 'active',
          })
          companyId = result.id
          addLog(`Empresa "${accountName}" criada!`)

          addLog(`Criando 14 agentes IA para ${accountName}...`)
          const agentInserts = defaultAgentRoles.map(role => ({
            company_id: companyId,
            role,
            status: 'idle',
            performance_score: 0,
            actions_today: 0,
          }))
          await supabase.from('agents').insert(agentInserts)
          addLog(`14 agentes criados!`)

          addLog(`Criando policies padrao para ${accountName}...`)
          const defaultPolicies = [
            { company_id: companyId, capability_id: 'pause_ad', autonomy_level: 'limited', max_value: null, cooldown_minutes: 60, min_confidence: 0.6 },
            { company_id: companyId, capability_id: 'activate_ad', autonomy_level: 'approval', max_value: null, cooldown_minutes: 60, min_confidence: 0.7 },
            { company_id: companyId, capability_id: 'adjust_budget', autonomy_level: 'limited', max_value: 50, cooldown_minutes: 60, min_confidence: 0.7 },
            { company_id: companyId, capability_id: 'scale_campaign', autonomy_level: 'limited', max_value: 50, cooldown_minutes: 120, min_confidence: 0.8 },
            { company_id: companyId, capability_id: 'kill_campaign', autonomy_level: 'approval', max_value: null, cooldown_minutes: 180, min_confidence: 0.9 },
            { company_id: companyId, capability_id: 'send_alert', autonomy_level: 'auto', max_value: null, cooldown_minutes: 5, min_confidence: 0.3 },
          ]
          await supabase.from('policies').upsert(defaultPolicies, { onConflict: 'company_id,capability_id' })
          addLog(`Policies criadas!`)
        }

        addLog(`Salvando configuracao Meta para ${accountName}...`)
        await saveMetaConfig({
          companyId,
          accessToken: discoveryToken,
          appId: '', appSecret: '',
          adAccountId: accountId,
          pixelId: '', pageId: '', whatsappBusinessId: '',
          status: 'connected',
        })

        addLog(`Sincronizando campanhas de ${accountName}...`)
        try {
          await syncCampaignsToSupabase(companyId, {
            accessToken: discoveryToken,
            adAccountId: accountId,
          })
          addLog(`Campanhas sincronizadas!`)
        } catch (syncErr) {
          addLog(`Aviso: erro ao sincronizar campanhas de ${accountName} — ${syncErr instanceof Error ? syncErr.message : 'erro'}`)
        }
      }

      addLog('Setup completo! Recarregando dados...')
      await refresh()
      setMessage({ type: 'success', text: `${accounts.length} conta(s) configurada(s) com sucesso! Todas as campanhas foram sincronizadas.` })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}` })
    } finally {
      setDiscovering(false)
    }
  }

  const handleConnect = async () => {
    if (!config.accessToken) {
      setMessage({ type: 'error', text: 'Informe o Access Token' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const validation = await validateAccessToken(config.accessToken)
      if (!validation.valid) {
        setMessage({ type: 'error', text: `Token invalido: ${validation.error}` })
        setSaving(false)
        return
      }
      const accounts = await getAdAccounts(config.accessToken)
      setAdAccounts(accounts.map((a: Record<string, string>) => ({ id: a.id, name: a.name })))
      const adAccountId = config.adAccountId || (accounts[0]?.id as string) || ''
      await saveMetaConfig({ companyId: selectedCompanyId, ...config, adAccountId, status: 'connected' })
      setConfig((prev) => ({ ...prev, adAccountId }))
      setStatus('connected')
      setMessage({ type: 'success', text: `Conectado! ${accounts.length} conta(s) encontrada(s).` })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}` })
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (status !== 'connected' || !config.adAccountId) {
      setMessage({ type: 'error', text: 'Conecte a API primeiro' })
      return
    }
    setSyncing(true)
    setMessage(null)
    try {
      await syncCampaignsToSupabase(selectedCompanyId, { accessToken: config.accessToken, adAccountId: config.adAccountId })
      await refresh()
      setMessage({ type: 'success', text: 'Campanhas sincronizadas com sucesso!' })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}` })
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    setMessage(null)
    let synced = 0
    let errors = 0

    try {
      for (const company of companies) {
        const metaConfig = await fetchMetaConfig(company.id)
        if (!metaConfig || metaConfig.status !== 'connected') continue

        try {
          await syncCampaignsToSupabase(company.id, {
            accessToken: metaConfig.accessToken,
            adAccountId: metaConfig.adAccountId,
          })
          synced++
        } catch {
          errors++
        }
      }
      await refresh()
      setMessage({ type: 'success', text: `${synced} empresa(s) sincronizada(s)${errors > 0 ? `, ${errors} com erro` : ''}!` })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}` })
    } finally {
      setSyncing(false)
    }
  }

  const statusBadge = {
    connected: { bg: 'bg-green-100', text: 'text-green-700', label: 'Conectado', icon: CheckCircle },
    disconnected: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Desconectado', icon: AlertCircle },
    expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Token Expirado', icon: AlertCircle },
  }
  const badge = statusBadge[status]
  const BadgeIcon = badge.icon

  return (
    <div className="space-y-6 max-w-3xl">
      {/* AUTO DISCOVERY */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 shadow-sm border border-blue-200">
        <div className="flex items-center gap-3 mb-2">
          <Rocket size={20} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Setup Automatico</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Cole seu token do Meta e o sistema descobre automaticamente todas as suas contas de anuncio,
          cria as empresas com os nomes reais e sincroniza todas as campanhas.
        </p>

        <div className="flex gap-3">
          <input
            type="password"
            value={discoveryToken}
            onChange={(e) => setDiscoveryToken(e.target.value)}
            placeholder="Cole seu Access Token aqui"
            className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAutoDiscovery}
            disabled={discovering || !discoveryToken.trim()}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {discovering ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {discovering ? 'Descobrindo...' : 'Descobrir Contas'}
          </button>
        </div>

        {discoveryLog.length > 0 && (
          <div className="mt-4 bg-gray-900 rounded-xl p-4 text-sm font-mono text-green-400 max-h-48 overflow-y-auto">
            {discoveryLog.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500 select-none">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
            {discovering && (
              <div className="flex gap-2 items-center">
                <span className="text-gray-500 select-none">&gt;</span>
                <Loader2 size={12} className="animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SYNC ALL */}
      {companies.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{companies.length} empresa(s) cadastrada(s)</p>
            <p className="text-xs text-gray-500">Sincronize todas de uma vez</p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Sincronizar Todas
          </button>
        </div>
      )}

      {/* PER-COMPANY CONFIG */}
      {companies.length > 0 && (
        <>
          {companies.length > 1 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <label className="block text-sm text-gray-600 mb-2">Configurar empresa especifica</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Key size={20} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  Meta API {companies.find(c => c.id === selectedCompanyId)?.name ? `— ${companies.find(c => c.id === selectedCompanyId)?.name}` : ''}
                </h3>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                <BadgeIcon size={14} />
                {badge.label}
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Access Token</label>
                <input type="password" value={config.accessToken} onChange={(e) => setConfig((p) => ({ ...p, accessToken: e.target.value }))} placeholder="Cole seu Access Token aqui" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Conta de Anuncio</label>
                  {adAccounts.length > 0 ? (
                    <select value={config.adAccountId} onChange={(e) => setConfig((p) => ({ ...p, adAccountId: e.target.value }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {adAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                    </select>
                  ) : (
                    <input type="text" value={config.adAccountId} onChange={(e) => setConfig((p) => ({ ...p, adAccountId: e.target.value }))} placeholder="act_123456789" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Pixel ID</label>
                  <input type="text" value={config.pixelId} onChange={(e) => setConfig((p) => ({ ...p, pixelId: e.target.value }))} placeholder="ID do Pixel" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleConnect} disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {status === 'connected' ? 'Reconectar' : 'Conectar'}
                </button>
                {status === 'connected' && (
                  <button onClick={handleSync} disabled={syncing} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                    {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Sincronizar
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* POLICIES — PERMISSION ENGINE */}
      {companies.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Permissoes dos Agentes</h3>
                <p className="text-xs text-gray-500">Controla o que os agentes podem fazer automaticamente</p>
              </div>
            </div>
            {hasChanges && (
              <button
                onClick={handleSavePolicies}
                disabled={savingPolicies}
                className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingPolicies ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar Alteracoes
              </button>
            )}
          </div>

          {policyMessage && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${policyMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {policyMessage.text}
            </div>
          )}

          {loadingPolicies ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : policies.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Nenhuma policy encontrada para esta empresa.</p>
          ) : (
            <div className="space-y-3">
              {policies.map(policy => {
                const cap = capabilityLabels[policy.capabilityId] || { name: policy.capabilityId, desc: '' }
                const currentLevel = (getPolicyValue(policy, 'autonomyLevel') as AutonomyLevel) || policy.autonomyLevel
                const levelInfo = autonomyLabels[currentLevel]
                const enabled = getPolicyValue(policy, 'enabled') as boolean
                const showMaxValue = policy.capabilityId === 'adjust_budget' || policy.capabilityId === 'scale_campaign'

                return (
                  <div key={policy.id} className={`p-4 rounded-xl border transition-colors ${enabled ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{cap.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${levelInfo.bg} ${levelInfo.color}`}>
                            {levelInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{cap.desc}</p>
                      </div>
                      <div
                        onClick={() => updateLocalPolicy(policy.id, 'enabled', !enabled)}
                        className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </div>

                    {enabled && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nivel</label>
                          <select
                            value={currentLevel}
                            onChange={(e) => updateLocalPolicy(policy.id, 'autonomyLevel', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="auto">Automatico</option>
                            <option value="limited">Limitado</option>
                            <option value="approval">Aprovacao</option>
                            <option value="prohibited">Proibido</option>
                          </select>
                        </div>

                        {showMaxValue && (
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Max Mudanca %</label>
                            <input
                              type="number"
                              value={(getPolicyValue(policy, 'maxValue') as number) ?? ''}
                              onChange={(e) => updateLocalPolicy(policy.id, 'maxValue', Number(e.target.value) || null)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="50"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cooldown (min)</label>
                          <input
                            type="number"
                            value={(getPolicyValue(policy, 'cooldownMinutes') as number) || ''}
                            onChange={(e) => updateLocalPolicy(policy.id, 'cooldownMinutes', Number(e.target.value) || 5)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Confianca Min</label>
                          <input
                            type="number"
                            value={(getPolicyValue(policy, 'minConfidence') as number) || ''}
                            onChange={(e) => updateLocalPolicy(policy.id, 'minConfidence', Math.min(1, Math.max(0, Number(e.target.value) || 0)))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            max="1"
                            step="0.1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
