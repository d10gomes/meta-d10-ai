import { useState } from 'react'
import { ArrowRight, Brain, AlertTriangle, TrendingUp, Lightbulb, FileText, Send, CheckCheck, Filter } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { markMessageAsRead, markAllMessagesAsRead } from '../lib/supabase-data'

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

const typeLabels: Record<string, string> = {
  insight: 'Insight',
  alert: 'Alerta',
  recommendation: 'Recomendacao',
  request: 'Solicitacao',
  report: 'Relatorio',
}

export default function Communication() {
  const { messages, refresh } = useApp()
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  let filtered = messages
  if (filterType !== 'all') filtered = filtered.filter(m => m.type === filterType)
  if (filterPriority !== 'all') filtered = filtered.filter(m => m.priority === filterPriority)
  if (showUnreadOnly) filtered = filtered.filter(m => !m.read)

  const sortedMessages = [...filtered].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const unreadCount = messages.filter(m => !m.read).length
  const criticalCount = messages.filter(m => m.priority === 'critical' && !m.read).length
  const highCount = messages.filter(m => m.priority === 'high' && !m.read).length

  const handleMarkAsRead = async (id: string) => {
    await markMessageAsRead(id)
    await refresh()
  }

  const handleMarkAllAsRead = async () => {
    await markAllMessagesAsRead()
    await refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total de Mensagens</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{messages.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Nao Lidas</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{unreadCount}</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-purple-600" />
              <h3 className="font-semibold text-gray-900">Canal de Comunicacao — Orquestra IA</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os tipos</option>
                <option value="alert">Alertas</option>
                <option value="recommendation">Recomendacoes</option>
                <option value="insight">Insights</option>
                <option value="report">Relatorios</option>
                <option value="request">Solicitacoes</option>
              </select>
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas prioridades</option>
              <option value="critical">Critica</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baixa</option>
            </select>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">Apenas nao lidas</span>
            </label>
          </div>
        </div>

        {sortedMessages.length === 0 ? (
          <div className="p-12 text-center">
            <Brain size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              {messages.length === 0
                ? 'Nenhuma mensagem ainda. Ative o motor de agentes para comecar.'
                : 'Nenhuma mensagem com esses filtros.'}
            </p>
          </div>
        ) : (
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                          {typeLabels[msg.type] || msg.type}
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
                        {!msg.read && (
                          <button
                            onClick={() => handleMarkAsRead(msg.id)}
                            className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                          >
                            <CheckCheck size={12} />
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
