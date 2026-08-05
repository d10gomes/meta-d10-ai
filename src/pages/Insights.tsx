import { Brain, TrendingUp, AlertTriangle, Lightbulb, Target, Zap, CheckCircle } from 'lucide-react'

const insights = [
  {
    type: 'oportunidade', icon: TrendingUp, color: 'text-green-600 bg-green-50',
    title: 'Escalar Lookalike — Vida Nova Imobiliaria',
    description: 'Campanha "Lookalike - Compradores" tem ROAS consistente de 4.7x nos ultimos 7 dias. Aumento de 30% no budget pode gerar +R$2.100 em retorno adicional sem perda de performance.',
    confidence: 94, impact: 'Alto', action: 'Aumentar budget para R$156/dia',
  },
  {
    type: 'alerta', icon: AlertTriangle, color: 'text-red-600 bg-red-50',
    title: 'Fadiga de Criativo — Saber Digital',
    description: 'Os 3 criativos principais do funil MOFU tem mais de 15 dias sem rotacao. Frequencia subiu de 1.8 para 2.9. Conversao caiu 15%. Novos criativos sao urgentes.',
    confidence: 91, impact: 'Critico', action: 'Pausar criativos antigos e ativar novos',
  },
  {
    type: 'sugestao', icon: Lightbulb, color: 'text-blue-600 bg-blue-50',
    title: 'Segmentacao por Genero — Todas as Empresas',
    description: 'Analise cruzada mostra que publico feminino 25-34 converte 40% mais em campanhas de leads e 28% mais em vendas. Recomendo criar conjuntos especificos para esse segmento em todas as contas.',
    confidence: 88, impact: 'Medio', action: 'Criar adsets segmentados por genero',
  },
  {
    type: 'oportunidade', icon: Target, color: 'text-purple-600 bg-purple-50',
    title: 'Horario de Ouro — Bella Moda',
    description: 'Vendas da Bella Moda concentram 62% das conversoes entre 19h e 23h. Ajustar dayparting para concentrar 70% do budget nesse horario pode reduzir CPA em ate 25%.',
    confidence: 86, impact: 'Alto', action: 'Ativar dayparting 19h-23h',
  },
  {
    type: 'sugestao', icon: Zap, color: 'text-yellow-600 bg-yellow-50',
    title: 'Video > Imagem — Todas as Contas',
    description: 'Criativos em video de 15-30 segundos tem CTR 2.3x maior e CPC 35% menor que imagens estaticas em todas as contas. Priorizar producao de video para proxima sprint.',
    confidence: 92, impact: 'Alto', action: 'Migrar 60% dos criativos para video',
  },
]

export default function Insights() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Insights Gerados</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{insights.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Confianca Media</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{Math.round(insights.reduce((s, i) => s + i.confidence, 0) / insights.length)}%</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Alto Impacto</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{insights.filter(i => i.impact === 'Alto' || i.impact === 'Critico').length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${insight.color}`}>
                <insight.icon size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-semibold uppercase ${insight.color.split(' ')[0]}`}>{insight.type}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    insight.impact === 'Critico' ? 'bg-red-100 text-red-700' :
                    insight.impact === 'Alto' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  }`}>Impacto: {insight.impact}</span>
                  <span className="text-xs text-gray-400">Confianca: {insight.confidence}%</span>
                </div>
                <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <button className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700">
                    <CheckCircle size={14} />
                    {insight.action}
                  </button>
                  <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Ignorar</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
