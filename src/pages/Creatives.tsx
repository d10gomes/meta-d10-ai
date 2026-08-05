import { Image, Video, LayoutGrid, Eye, MousePointerClick, TrendingUp, AlertTriangle } from 'lucide-react'

const creatives = [
  { id: 1, name: 'Video Terrenos Irece 15s', type: 'VIDEO', company: 'Vida Nova', campaign: 'Leads WhatsApp', ctr: 5.2, cpc: 0.65, conversions: 89, spend: 580, status: 'winning', daysActive: 8 },
  { id: 2, name: 'Carousel Colecao Verao', type: 'CAROUSEL', company: 'Bella Moda', campaign: 'Vendas Colecao', ctr: 4.8, cpc: 0.72, conversions: 145, spend: 1050, status: 'winning', daysActive: 12 },
  { id: 3, name: 'Imagem Aula Gratis', type: 'IMAGE', company: 'Saber Digital', campaign: 'Cadastros', ctr: 3.9, cpc: 0.88, conversions: 210, spend: 820, status: 'stable', daysActive: 15 },
  { id: 4, name: 'Video Depoimento Cliente', type: 'VIDEO', company: 'Vida Nova', campaign: 'Remarketing', ctr: 6.1, cpc: 0.52, conversions: 42, spend: 340, status: 'winning', daysActive: 5 },
  { id: 5, name: 'Banner Promocao 50off', type: 'IMAGE', company: 'Bella Moda', campaign: 'Vendas', ctr: 1.2, cpc: 2.10, conversions: 8, spend: 420, status: 'losing', daysActive: 20 },
  { id: 6, name: 'Video Mentoria Preview', type: 'VIDEO', company: 'Saber Digital', campaign: 'Funil', ctr: 2.1, cpc: 1.45, conversions: 15, spend: 650, status: 'fatigue', daysActive: 22 },
]

const typeIcons = { VIDEO: Video, IMAGE: Image, CAROUSEL: LayoutGrid }
const statusConfig = {
  winning: { label: 'Vencedor', color: 'bg-green-50 text-green-700' },
  stable: { label: 'Estavel', color: 'bg-blue-50 text-blue-700' },
  losing: { label: 'Perdendo', color: 'bg-red-50 text-red-700' },
  fatigue: { label: 'Fadiga', color: 'bg-yellow-50 text-yellow-700' },
}

export default function Creatives() {
  const winning = creatives.filter(c => c.status === 'winning').length
  const fatigued = creatives.filter(c => c.status === 'fatigue' || c.status === 'losing').length

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
          <p className="text-3xl font-bold text-blue-600 mt-1">{(creatives.reduce((s, c) => s + c.ctr, 0) / creatives.length).toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {creatives.map((creative) => {
          const TypeIcon = typeIcons[creative.type as keyof typeof typeIcons] || Image
          const status = statusConfig[creative.status as keyof typeof statusConfig]
          return (
            <div key={creative.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <TypeIcon size={48} className="text-gray-400" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-sm">{creative.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                </div>
                <p className="text-xs text-gray-500">{creative.company} — {creative.campaign}</p>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">CTR</p>
                    <p className={`text-sm font-bold ${creative.ctr >= 4 ? 'text-green-600' : creative.ctr >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>{creative.ctr}%</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">CPC</p>
                    <p className="text-sm font-bold text-gray-900">R${creative.cpc}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Conv.</p>
                    <p className="text-sm font-bold text-gray-900">{creative.conversions}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>{creative.daysActive} dias ativo</span>
                  <span>R$ {creative.spend.toLocaleString('pt-BR')} gasto</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
