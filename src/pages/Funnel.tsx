import { useMemo } from 'react'
import { Eye, MousePointerClick, UserPlus, ShoppingCart, ArrowDown, Filter } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import type { MetaObjective } from '../types/meta'

const tofuObjectives: MetaObjective[] = ['AWARENESS', 'ENGAGEMENT']
const mofuObjectives: MetaObjective[] = ['TRAFFIC', 'APP_INSTALL']
const bofuObjectives: MetaObjective[] = ['LEADS', 'REGISTRATION', 'FUNNEL']
const retentionObjectives: MetaObjective[] = ['SALES']

interface FunnelStage {
  name: string
  icon: React.ElementType
  color: string
  desc: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  campaigns: number
}

export default function Funnel() {
  const { companies, selectedCompanyId } = useApp()

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const allCampaigns = filteredCompanies.flatMap(c => c.campaigns.filter(camp => camp.status === 'ACTIVE' || camp.status === 'PAUSED'))

  const stages = useMemo(() => {
    const aggregate = (objectives: MetaObjective[]) => {
      const camps = allCampaigns.filter(c => objectives.includes(c.objective))
      return {
        impressions: camps.reduce((s, c) => s + c.metrics.impressions, 0),
        clicks: camps.reduce((s, c) => s + c.metrics.clicks, 0),
        conversions: camps.reduce((s, c) => s + c.metrics.conversions, 0),
        spend: camps.reduce((s, c) => s + c.metrics.spend, 0),
        campaigns: camps.length,
      }
    }

    const tofu = aggregate(tofuObjectives)
    const mofu = aggregate(mofuObjectives)
    const bofu = aggregate(bofuObjectives)
    const retention = aggregate(retentionObjectives)

    const result: FunnelStage[] = [
      { name: 'Awareness (TOFU)', icon: Eye, color: 'bg-orange-500', desc: 'Alcance e reconhecimento de marca', ...tofu },
      { name: 'Consideracao (MOFU)', icon: MousePointerClick, color: 'bg-purple-500', desc: 'Trafego e engajamento qualificado', ...mofu },
      { name: 'Conversao (BOFU)', icon: UserPlus, color: 'bg-blue-500', desc: 'Leads, cadastros e vendas', ...bofu },
      { name: 'Retencao', icon: ShoppingCart, color: 'bg-green-500', desc: 'Remarketing e fidelizacao', ...retention },
    ]

    return result
  }, [allCampaigns])

  const totalSpend = stages.reduce((s, st) => s + st.spend, 0)
  const totalConversions = stages.reduce((s, st) => s + st.conversions, 0)
  const totalImpressions = stages.reduce((s, st) => s + st.impressions, 0)
  const conversionRate = totalImpressions > 0 ? ((totalConversions / totalImpressions) * 100).toFixed(2) : '0'
  const cac = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0'

  const bofuRevenue = filteredCompanies.flatMap(c => c.campaigns)
    .filter(c => [...bofuObjectives, ...retentionObjectives].includes(c.objective))
    .reduce((s, c) => s + (c.metrics.roas * c.metrics.spend), 0)
  const ltv = totalConversions > 0 ? (bofuRevenue / totalConversions).toFixed(2) : '0'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={20} className="text-amber-500" />
          <h3 className="font-semibold text-gray-900">Estrategia de Funil Completo</h3>
        </div>
        <p className="text-sm text-gray-500 mb-8">Dados reais das campanhas organizados por etapa do funil</p>

        <div className="max-w-2xl mx-auto space-y-4">
          {stages.map((stage, i) => {
            const widthPercent = 100 - (i * 18)
            const cpm = stage.impressions > 0 ? ((stage.spend / stage.impressions) * 1000).toFixed(2) : '0'
            const cpc = stage.clicks > 0 ? (stage.spend / stage.clicks).toFixed(2) : '0'
            const cpa = stage.conversions > 0 ? (stage.spend / stage.conversions).toFixed(2) : '0'
            const stageRoas = stage.spend > 0
              ? (filteredCompanies.flatMap(c => c.campaigns)
                  .filter(c => {
                    if (i === 0) return tofuObjectives.includes(c.objective)
                    if (i === 1) return mofuObjectives.includes(c.objective)
                    if (i === 2) return bofuObjectives.includes(c.objective)
                    return retentionObjectives.includes(c.objective)
                  })
                  .reduce((s, c) => s + c.metrics.roas * c.metrics.spend, 0) / stage.spend).toFixed(1)
              : '0'

            return (
              <div key={stage.name}>
                <div
                  className={`${stage.color} rounded-2xl p-5 text-white mx-auto transition-all hover:scale-[1.02]`}
                  style={{ width: `${widthPercent}%` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <stage.icon size={24} />
                      <div>
                        <p className="font-semibold">{stage.name}</p>
                        <p className="text-sm opacity-80">{stage.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{stage.impressions > 0 ? stage.impressions.toLocaleString('pt-BR') : '—'}</p>
                      <p className="text-sm opacity-80">{stage.impressions > 0 ? 'impressoes' : 'sem dados'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3 text-sm flex-wrap">
                    <span className="bg-white/20 px-3 py-1 rounded-lg">{stage.campaigns} campanhas</span>
                    <span className="bg-white/20 px-3 py-1 rounded-lg">R$ {stage.spend.toLocaleString('pt-BR')}</span>
                    {stage.impressions > 0 && <span className="bg-white/20 px-3 py-1 rounded-lg">CPM: R${cpm}</span>}
                    {stage.clicks > 0 && <span className="bg-white/20 px-3 py-1 rounded-lg">CPC: R${cpc}</span>}
                    {stage.conversions > 0 && <span className="bg-white/20 px-3 py-1 rounded-lg">CPA: R${cpa}</span>}
                    {Number(stageRoas) > 0 && <span className="bg-white/20 px-3 py-1 rounded-lg">ROAS: {stageRoas}x</span>}
                  </div>
                </div>
                {i < stages.length - 1 && stages[i + 1].impressions > 0 && stage.impressions > 0 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown size={20} className="text-gray-300" />
                    <span className="text-xs text-gray-400">
                      {((stages[i + 1].clicks || stages[i + 1].impressions) / stage.impressions * 100).toFixed(1)}% conversao
                    </span>
                  </div>
                )}
                {i < stages.length - 1 && (stages[i + 1].impressions === 0 || stage.impressions === 0) && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown size={20} className="text-gray-300" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Taxa de Conversao Total</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{conversionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Do topo ao fundo do funil</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">CAC (Custo de Aquisicao)</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">R$ {Number(cac).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-500 mt-1">Budget total / clientes convertidos</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">LTV Estimado</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">R$ {Number(ltv).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-500 mt-1">Receita media por cliente convertido</p>
        </div>
      </div>
    </div>
  )
}
