import { Brain, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react'

const insights = [
  {
    icon: TrendingUp,
    type: 'Oportunidade',
    color: 'text-green-600 bg-green-50',
    message: 'Campanha "Lookalike" tem ROAS 4.7x. Recomendo aumentar orcamento em 30% para escalar resultados.',
  },
  {
    icon: AlertTriangle,
    type: 'Alerta',
    color: 'text-yellow-600 bg-yellow-50',
    message: 'CPL da campanha "Awareness" subiu 18% nos ultimos 3 dias. Considere pausar e revisar criativos.',
  },
  {
    icon: Lightbulb,
    type: 'Sugestao',
    color: 'text-blue-600 bg-blue-50',
    message: 'Publico feminino 25-34 tem 40% mais conversao. Crie um conjunto de anuncios segmentado.',
  },
]

export default function AIInsights() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain size={18} className="text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">IA Insights</h3>
          <p className="text-xs text-gray-500">Analise automatica das campanhas</p>
        </div>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
            <div className={`p-1.5 rounded-lg h-fit ${insight.color}`}>
              <insight.icon size={14} />
            </div>
            <div>
              <span className={`text-xs font-semibold ${insight.color.split(' ')[0]}`}>{insight.type}</span>
              <p className="text-sm text-gray-700 mt-0.5">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
