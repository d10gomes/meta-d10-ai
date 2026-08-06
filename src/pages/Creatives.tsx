import { useMemo } from 'react'
import { Image, Video, LayoutGrid, AlertTriangle, Package } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import type { Ad } from '../types/meta'

const typeIcons: Record<string, React.ElementType> = {
  VIDEO: Video, IMAGE: Image, CAROUSEL: LayoutGrid, COLLECTION: Package,
}

function getCreativeStatus(ad: Ad): 'winning' | 'stable' | 'losing' | 'fatigue' {
  if (ad.metrics.frequency > 3) return 'fatigue'
  if (ad.metrics.ctr >= 3 && ad.metrics.roas >= 2) return 'winning'
  if (ad.metrics.ctr < 1 || (ad.metrics.roas > 0 && ad.metrics.roas < 1)) return 'losing'
  return 'stable'
}

const statusConfig = {
  winning: { label: 'Vencedor', color: 'bg-green-50 text-green-700' },
  stable: { label: 'Estavel', color: 'bg-blue-50 text-blue-700' },
  losing: { label: 'Perdendo', color: 'bg-red-50 text-red-700' },
  fatigue: { label: 'Fadiga', color: 'bg-yellow-50 text-yellow-700' },
}

export default function Creatives() {
  const { companies, selectedCompanyId } = useApp()

  const filteredCompanies = selectedCompanyId
    ? companies.filter(c => c.id === selectedCompanyId)
    : companies

  const creatives = useMemo(() => {
    const result: Array<Ad & { companyName: string; campaignName: string; status: string }> = []

    for (const company of filteredCompanies) {
      for (const camp of company.campaigns) {
        for (const ad of camp.ads) {
          result.push({
            ...ad,
            companyName: company.name,
            campaignName: camp.name,
            status: getCreativeStatus(ad),
          })
        }
      }
    }

    return result.sort((a, b) => b.metrics.ctr - a.metrics.ctr)
  }, [filteredCompanies])

  const winning = creatives.filter(c => c.status === 'winning').length
  const fatigued = creatives.filter(c => c.status === 'fatigue' || c.status === 'losing').length
  const avgCtr = creatives.length > 0
    ? creatives.reduce((s, c) => s + c.metrics.ctr, 0) / creatives.length
    : 0

  if (creatives.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Criativos</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Vencedores</p>
            <p className="text-3xl font-bold text-green-600 mt-1">0</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Precisam Atencao</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">0</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">CTR Medio</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">0%</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Image size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum criativo encontrado.</p>
          <p className="text-sm text-gray-400 mt-1">Conecte a Meta API nas Configuracoes para sincronizar seus criativos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Criativos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{creatives.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Vencedores</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{winning}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-yellow-500" />
            <p className="text-sm text-gray-500">Precisam Atencao</p>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{fatigued}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">CTR Medio</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{avgCtr.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {creatives.map((creative) => {
          const TypeIcon = typeIcons[creative.creative.type] || Image
          const st = statusConfig[creative.status as keyof typeof statusConfig]
          return (
            <div key={creative.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <TypeIcon size={48} className="text-gray-400" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{creative.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${st.color}`}>{st.label}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{creative.companyName} — {creative.campaignName}</p>
                {creative.creative.headline && (
                  <p className="text-xs text-gray-400 mt-1 truncate">"{creative.creative.headline}"</p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">CTR</p>
                    <p className={`text-sm font-bold ${creative.metrics.ctr >= 3 ? 'text-green-600' : creative.metrics.ctr >= 1.5 ? 'text-yellow-600' : 'text-red-600'}`}>{creative.metrics.ctr.toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">CPC</p>
                    <p className="text-sm font-bold text-gray-900">R${creative.metrics.cpc.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Conv.</p>
                    <p className="text-sm font-bold text-gray-900">{creative.metrics.conversions}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>Freq: {creative.metrics.frequency.toFixed(1)}</span>
                  <span>R$ {creative.metrics.spend.toLocaleString('pt-BR')} gasto</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
