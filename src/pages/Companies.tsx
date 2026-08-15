import { useState } from 'react'
import { Plus, TrendingUp, Users, Target, Zap, X, Loader2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { createCompany, createDefaultAgents, createDefaultAgentConfigs } from '../lib/supabase-data'

export default function Companies() {
  const { companies, setSelectedCompanyId, setActivePage, refresh, dataSource } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', industry: '', website: '', whatsapp: '', monthlyBudget: 5000,
  })

  const handleCreate = async () => {
    if (!form.name || !form.industry) return
    setSaving(true)
    try {
      const result = await createCompany({
        name: form.name,
        industry: form.industry,
        website: form.website || undefined,
        whatsapp: form.whatsapp || undefined,
        monthlyBudget: form.monthlyBudget,
        status: 'active',
      })

      await createDefaultAgents(result.id)
      await createDefaultAgentConfigs(result.id)

      await refresh()
      setShowForm(false)
      setForm({ name: '', industry: '', website: '', whatsapp: '', monthlyBudget: 5000 })
    } catch (err) {
      console.error('Erro ao criar empresa:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{companies.length} empresas cadastradas</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nova Empresa
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Cadastrar Nova Empresa</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nome da Empresa *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Loja Virtual XYZ" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Segmento *</label>
              <input type="text" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Ex: E-commerce, Imobiliario, Educacao" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Website</label>
              <input type="text" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">WhatsApp</label>
              <input type="text" value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+55 11 99999-9999" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Orcamento Mensal (R$)</label>
              <input type="number" value={form.monthlyBudget} onChange={e => setForm(p => ({ ...p, monthlyBudget: Number(e.target.value) }))} className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">Os 14 agentes IA serao criados automaticamente para esta empresa.</p>
          <button onClick={handleCreate} disabled={saving || !form.name || !form.industry || dataSource === 'mock'} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Cadastrar Empresa
          </button>
          {dataSource === 'mock' && (
            <p className="mt-2 text-xs text-yellow-600">Conecte o Supabase nas Configuracoes para cadastrar empresas reais.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((company) => {
          const totalSpend = company.campaigns.reduce((s, c) => s + c.metrics.spend, 0)
          const totalConversions = company.campaigns.reduce((s, c) => s + c.metrics.conversions, 0)
          const avgRoas = company.campaigns.length > 0 ? company.campaigns.reduce((s, c) => s + c.metrics.roas, 0) / company.campaigns.length : 0
          const activeAgents = company.agents.filter(a => a.status !== 'idle').length
          const goalProgress = company.goals.length > 0
            ? Math.round(company.goals.reduce((s, g) => s + (g.currentValue / g.target) * 100, 0) / company.goals.length)
            : 0

          return (
            <div key={company.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {company.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <p className="text-xs text-gray-500">{company.industry}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${company.status === 'active' ? 'bg-green-50 text-green-700' : company.status === 'setup' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                    {company.status === 'active' ? 'Ativa' : company.status === 'setup' ? 'Configurando' : 'Pausada'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <TrendingUp size={12} />
                      <span className="text-xs">ROAS</span>
                    </div>
                    <p className={`text-lg font-bold ${avgRoas >= 4 ? 'text-green-600' : avgRoas >= 2 ? 'text-yellow-600' : avgRoas > 0 ? 'text-red-600' : 'text-gray-400'}`}>{avgRoas.toFixed(1)}x</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <Users size={12} />
                      <span className="text-xs">Conversoes</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{totalConversions.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <Target size={12} />
                      <span className="text-xs">Campanhas</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{company.campaigns.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                      <Zap size={12} />
                      <span className="text-xs">Agentes</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{activeAgents}/{company.agents.length}</p>
                  </div>
                </div>

                {company.goals.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Progresso das metas</span>
                      <span className="font-medium text-gray-900">{goalProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${goalProgress >= 80 ? 'bg-green-500' : goalProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(goalProgress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Investido: <span className="font-medium text-gray-900">R$ {totalSpend.toLocaleString('pt-BR')}</span></span>
                  <button
                    onClick={() => { setSelectedCompanyId(company.id); setActivePage('campaigns') }}
                    className="text-blue-600 font-medium hover:text-blue-700"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
