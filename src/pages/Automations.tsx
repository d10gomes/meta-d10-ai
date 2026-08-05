import { Zap, Play, Pause, AlertTriangle, TrendingDown, TrendingUp, DollarSign, Target } from 'lucide-react'

const automationRules = [
  { id: 1, name: 'Pausar anuncio com CTR baixo', condition: 'Se CTR < 1% por 48h', action: 'Pausar anuncio automaticamente', status: 'active', executions: 23, lastRun: '2h atras', impact: '-32% de gasto desperdicado', icon: TrendingDown, color: 'text-red-600' },
  { id: 2, name: 'Escalar campanha com ROAS alto', condition: 'Se ROAS > 4x por 72h', action: 'Aumentar budget em 20%', status: 'active', executions: 8, lastRun: '5h atras', impact: '+28% de receita', icon: TrendingUp, color: 'text-green-600' },
  { id: 3, name: 'Alerta de CPL acima da meta', condition: 'Se CPL > R$20', action: 'Notificar orquestrador + pausar conjunto', status: 'active', executions: 5, lastRun: '1d atras', impact: 'R$340 economizados', icon: AlertTriangle, color: 'text-yellow-600' },
  { id: 4, name: 'Redistribuir budget por performance', condition: 'Diariamente as 06:00', action: 'Realocar verba pra campanhas com melhor CPA', status: 'active', executions: 15, lastRun: '18h atras', impact: '-18% no CPA medio', icon: DollarSign, color: 'text-blue-600' },
  { id: 5, name: 'Criar lookalike automatico', condition: 'Se campanha atinge 100 conversoes', action: 'Criar lookalike 1% e duplicar adset', status: 'active', executions: 3, lastRun: '3d atras', impact: '+42% de conversoes', icon: Target, color: 'text-purple-600' },
  { id: 6, name: 'Controle de frequencia', condition: 'Se frequencia > 3.0', action: 'Pausar conjunto e notificar criativo', status: 'paused', executions: 12, lastRun: '5d atras', impact: 'Evitou fadiga de anuncio', icon: AlertTriangle, color: 'text-orange-600' },
]

export default function Automations() {
  const activeRules = automationRules.filter(r => r.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Regras Ativas</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeRules}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Execucoes Totais</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{automationRules.reduce((s, r) => s + r.executions, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Economia Estimada</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">R$ 2.840</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Regras de Automacao</h3>
          </div>
          <button className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700">Nova Regra</button>
        </div>

        <div className="divide-y divide-gray-50">
          {automationRules.map((rule) => (
            <div key={rule.id} className="p-5 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl bg-gray-50 ${rule.color}`}>
                    <rule.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{rule.name}</h4>
                    <p className="text-sm text-gray-500 mt-0.5"><span className="font-medium">Se:</span> {rule.condition}</p>
                    <p className="text-sm text-gray-500"><span className="font-medium">Entao:</span> {rule.action}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{rule.executions} execucoes</span>
                      <span>Ultima: {rule.lastRun}</span>
                      <span className={`font-medium ${rule.color}`}>{rule.impact}</span>
                    </div>
                  </div>
                </div>
                <button className={`p-2 rounded-lg ${rule.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {rule.status === 'active' ? <Play size={16} /> : <Pause size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
