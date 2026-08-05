import { Eye, MousePointerClick, UserPlus, ShoppingCart, ArrowDown } from 'lucide-react'

const funnelStages = [
  { name: 'Awareness (TOFU)', icon: Eye, color: 'bg-orange-500', people: 150000, budget: 'R$ 3.000', cpm: 'R$ 8,50', desc: 'Alcance e reconhecimento de marca' },
  { name: 'Consideracao (MOFU)', icon: MousePointerClick, color: 'bg-purple-500', people: 28000, budget: 'R$ 4.500', cpc: 'R$ 0,95', desc: 'Trafego e engajamento qualificado' },
  { name: 'Conversao (BOFU)', icon: UserPlus, color: 'bg-blue-500', people: 4200, budget: 'R$ 5.000', cpa: 'R$ 12,50', desc: 'Leads, cadastros e vendas' },
  { name: 'Retencao', icon: ShoppingCart, color: 'bg-green-500', people: 1800, budget: 'R$ 2.500', roas: '6.2x', desc: 'Remarketing e fidelizacao' },
]

export default function Funnel() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-2">Estrategia de Funil Completo</h3>
        <p className="text-sm text-gray-500 mb-8">Acompanhe a jornada do cliente do primeiro contato ate a compra</p>

        <div className="max-w-2xl mx-auto space-y-4">
          {funnelStages.map((stage, i) => {
            const widthPercent = 100 - (i * 20)
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
                      <p className="text-2xl font-bold">{stage.people.toLocaleString('pt-BR')}</p>
                      <p className="text-sm opacity-80">pessoas</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-lg">Budget: {stage.budget}</span>
                    {stage.cpm && <span className="bg-white/20 px-3 py-1 rounded-lg">CPM: {stage.cpm}</span>}
                    {stage.cpc && <span className="bg-white/20 px-3 py-1 rounded-lg">CPC: {stage.cpc}</span>}
                    {stage.cpa && <span className="bg-white/20 px-3 py-1 rounded-lg">CPA: {stage.cpa}</span>}
                    {stage.roas && <span className="bg-white/20 px-3 py-1 rounded-lg">ROAS: {stage.roas}</span>}
                  </div>
                </div>
                {i < funnelStages.length - 1 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown size={20} className="text-gray-300" />
                    <span className="text-xs text-gray-400">
                      {Math.round((funnelStages[i + 1].people / stage.people) * 100)}% conversao
                    </span>
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
          <p className="text-3xl font-bold text-green-600 mt-1">1.2%</p>
          <p className="text-xs text-gray-500 mt-1">Do topo ao fundo do funil</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">CAC (Custo de Aquisicao)</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">R$ 83,33</p>
          <p className="text-xs text-gray-500 mt-1">Budget total / clientes convertidos</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">LTV Estimado</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">R$ 516,67</p>
          <p className="text-xs text-gray-500 mt-1">Lifetime value medio por cliente</p>
        </div>
      </div>
    </div>
  )
}
