import { useState, useEffect } from 'react'
import { Key, Zap, Shield, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { fetchMetaConfig, saveMetaConfig, type MetaConfig } from '../lib/supabase-data'
import { validateAccessToken, getAdAccounts, syncCampaignsToSupabase } from '../lib/meta-api'

export default function Settings() {
  const { companies, refresh } = useApp()
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id || '')
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    accessToken: '',
    adAccountId: '',
    pixelId: '',
    pageId: '',
    whatsappBusinessId: '',
  })
  const [status, setStatus] = useState<MetaConfig['status']>('disconnected')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [adAccounts, setAdAccounts] = useState<{ id: string; name: string }[]>([])
  const [autonomousMode, setAutonomousMode] = useState(true)
  const [sharedLearnings, setSharedLearnings] = useState(true)
  const [realTimeAlerts, setRealTimeAlerts] = useState(true)
  const [maxDailyBudget, setMaxDailyBudget] = useState('500')
  const [maxBudgetIncrease, setMaxBudgetIncrease] = useState('30')
  const [minRoas, setMinRoas] = useState('2.0')

  useEffect(() => {
    if (!selectedCompanyId) return
    fetchMetaConfig(selectedCompanyId).then((data) => {
      if (data) {
        setConfig({
          appId: data.appId,
          appSecret: data.appSecret,
          accessToken: data.accessToken,
          adAccountId: data.adAccountId,
          pixelId: data.pixelId,
          pageId: data.pageId,
          whatsappBusinessId: data.whatsappBusinessId,
        })
        setStatus(data.status)
      } else {
        setConfig({ appId: '', appSecret: '', accessToken: '', adAccountId: '', pixelId: '', pageId: '', whatsappBusinessId: '' })
        setStatus('disconnected')
      }
    })
  }, [selectedCompanyId])

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

      await saveMetaConfig({
        companyId: selectedCompanyId,
        ...config,
        adAccountId,
        status: 'connected',
      })

      setConfig((prev) => ({ ...prev, adAccountId }))
      setStatus('connected')
      setMessage({ type: 'success', text: `Conectado! Usuario: ${validation.name}. ${accounts.length} conta(s) de anuncio encontrada(s).` })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao conectar: ${err instanceof Error ? err.message : 'Erro desconhecido'}` })
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (status !== 'connected' || !config.adAccountId) {
      setMessage({ type: 'error', text: 'Conecte a API do Meta primeiro' })
      return
    }

    setSyncing(true)
    setMessage(null)

    try {
      await syncCampaignsToSupabase(selectedCompanyId, {
        accessToken: config.accessToken,
        adAccountId: config.adAccountId,
      })
      await refresh()
      setMessage({ type: 'success', text: 'Campanhas sincronizadas com sucesso!' })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao sincronizar: ${err instanceof Error ? err.message : 'Erro desconhecido'}` })
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
      {companies.length > 1 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-sm text-gray-600 mb-2">Empresa</label>
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
            <h3 className="font-semibold text-gray-900">API do Meta Ads</h3>
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
            <input
              type="password"
              value={config.accessToken}
              onChange={(e) => setConfig((p) => ({ ...p, accessToken: e.target.value }))}
              placeholder="Cole seu Access Token aqui"
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Gere em developers.facebook.com &gt; Ferramentas &gt; Graph API Explorer</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Meta App ID</label>
              <input
                type="text"
                value={config.appId}
                onChange={(e) => setConfig((p) => ({ ...p, appId: e.target.value }))}
                placeholder="Seu App ID"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">App Secret</label>
              <input
                type="password"
                value={config.appSecret}
                onChange={(e) => setConfig((p) => ({ ...p, appSecret: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Conta de Anuncio</label>
              {adAccounts.length > 0 ? (
                <select
                  value={config.adAccountId}
                  onChange={(e) => setConfig((p) => ({ ...p, adAccountId: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {adAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.adAccountId}
                  onChange={(e) => setConfig((p) => ({ ...p, adAccountId: e.target.value }))}
                  placeholder="act_123456789"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Pixel ID</label>
              <input
                type="text"
                value={config.pixelId}
                onChange={(e) => setConfig((p) => ({ ...p, pixelId: e.target.value }))}
                placeholder="ID do Pixel"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Page ID (Facebook)</label>
              <input
                type="text"
                value={config.pageId}
                onChange={(e) => setConfig((p) => ({ ...p, pageId: e.target.value }))}
                placeholder="ID da Pagina"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">WhatsApp Business ID</label>
              <input
                type="text"
                value={config.whatsappBusinessId}
                onChange={(e) => setConfig((p) => ({ ...p, whatsappBusinessId: e.target.value }))}
                placeholder="ID do WhatsApp Business"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConnect}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {status === 'connected' ? 'Reconectar' : 'Conectar Meta API'}
            </button>
            {status === 'connected' && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Sincronizar Campanhas
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={20} className="text-yellow-500" />
          <h3 className="font-semibold text-gray-900">Configuracoes dos Agentes</h3>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer" onClick={() => setAutonomousMode(!autonomousMode)}>
            <div>
              <p className="text-sm font-medium text-gray-900">Modo Autonomo</p>
              <p className="text-xs text-gray-500">Agentes executam acoes sem aprovacao manual</p>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-colors ${autonomousMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${autonomousMode ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer" onClick={() => setSharedLearnings(!sharedLearnings)}>
            <div>
              <p className="text-sm font-medium text-gray-900">Compartilhar Aprendizados</p>
              <p className="text-xs text-gray-500">Agentes compartilham insights entre empresas</p>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-colors ${sharedLearnings ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${sharedLearnings ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer" onClick={() => setRealTimeAlerts(!realTimeAlerts)}>
            <div>
              <p className="text-sm font-medium text-gray-900">Alertas em Tempo Real</p>
              <p className="text-xs text-gray-500">Notificacoes push para alertas criticos</p>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-colors ${realTimeAlerts ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${realTimeAlerts ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} className="text-green-600" />
          <h3 className="font-semibold text-gray-900">Limites de Seguranca</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Budget maximo por dia (por empresa)</label>
            <input
              type="number"
              value={maxDailyBudget}
              onChange={(e) => setMaxDailyBudget(e.target.value)}
              placeholder="500"
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Aumento maximo de budget (%)</label>
            <input
              type="number"
              value={maxBudgetIncrease}
              onChange={(e) => setMaxBudgetIncrease(e.target.value)}
              placeholder="30"
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">ROAS minimo para manter campanha ativa</label>
            <input
              type="number"
              value={minRoas}
              onChange={(e) => setMinRoas(e.target.value)}
              placeholder="2.0"
              step="0.1"
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
