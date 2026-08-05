import { ArrowRight, Brain, AlertTriangle, TrendingUp, Lightbulb, FileText, Send } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

const typeIcons = {
  insight: TrendingUp,
  alert: AlertTriangle,
  recommendation: Lightbulb,
  request: Send,
  report: FileText,
}

const typeColors = {
  insight: 'text-green-600 bg-green-50',
  alert: 'text-red-600 bg-red-50',
  recommendation: 'text-blue-600 bg-blue-50',
  request: 'text-purple-600 bg-purple-50',
  report: 'text-gray-600 bg-gray-100',
}

const priorityColors = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function Communication() {
  const { messages } = useApp()

  const sortedMessages = [...messages].reverse()
  const criticalCount = messages.filter(m => m.priority === 'critical' && !m.read).length
  const highCount = messages.filter(m => m.priority === 'high' && !m.read).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total de Mensagens</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{messages.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Nao Lidas</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{messages.filter(m => !m.read).length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Alertas Criticos</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{criticalCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Alta Prioridade</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{highCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">Canal de Comunicacao — Orquestra IA</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">Todas as mensagens trocadas entre os agentes</p>
        </div>

        <div className="divide-y divide-gray-50">
          {sortedMessages.map((msg) => {
            const TypeIcon = typeIcons[msg.type]
            return (
              <div key={msg.id} className={`p-5 hover:bg-gray-50/50 transition-colors ${!msg.read ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${typeColors[msg.type]}`}>
                    <TypeIcon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priorityColors[msg.priority]}`}>
                        {msg.priority}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="font-semibold text-gray-700">{msg.from}</span>
                        <ArrowRight size={10} />
                        <span className="font-semibold text-gray-700">{msg.to}</span>
                      </span>
                      {!msg.read && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                    </div>

                    <h4 className="font-medium text-gray-900">{msg.subject}</h4>
                    <p className="text-sm text-gray-600 mt-1">{msg.content}</p>

                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-gray-400">
                        {new Date(msg.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                      <button className="text-xs text-blue-600 font-medium hover:text-blue-700">Responder</button>
                      <button className="text-xs text-gray-500 hover:text-gray-700">Marcar como lida</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
