import { useEffect, useState } from 'react'
import { X, AlertTriangle, Zap, MessageSquare, Bell } from 'lucide-react'
import type { RealtimeNotification } from '../hooks/useRealtimeNotifications'

interface Props {
  notifications: RealtimeNotification[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onViewAll: () => void
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  high: 'border-l-orange-500 bg-orange-50',
  medium: 'border-l-blue-500 bg-blue-50',
  low: 'border-l-gray-400 bg-gray-50',
}

const PRIORITY_ICONS: Record<string, typeof AlertTriangle> = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: Zap,
  low: MessageSquare,
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return 'agora'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function ToastItem({ notification, onDismiss }: { notification: RealtimeNotification; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)
  const Icon = PRIORITY_ICONS[notification.priority] || Bell

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, notification.priority === 'critical' ? 10000 : 5000)
    return () => clearTimeout(timer)
  }, [notification.priority, onDismiss])

  return (
    <div
      className={`
        max-w-sm w-full border-l-4 rounded-xl shadow-lg p-4
        transition-all duration-300 ease-out
        ${PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.low}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className={notification.priority === 'critical' ? 'text-red-500 mt-0.5' : 'text-blue-500 mt-0.5'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{notification.title}</p>
            <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.description}</p>
          <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notification.timestamp)}</p>
        </div>
      </div>
    </div>
  )
}

export default function NotificationToast({ notifications, onDismiss, onDismissAll, onViewAll }: Props) {
  const visible = notifications.slice(0, 3)

  if (visible.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {visible.map(n => (
        <ToastItem key={n.id} notification={n} onDismiss={() => onDismiss(n.id)} />
      ))}
      {notifications.length > 3 && (
        <div className="flex items-center justify-between max-w-sm w-full bg-white rounded-xl shadow-lg px-4 py-2 border border-gray-100">
          <span className="text-xs text-gray-500">+{notifications.length - 3} notificacoes</span>
          <div className="flex gap-2">
            <button onClick={onViewAll} className="text-xs text-blue-600 font-medium hover:text-blue-700">Ver todas</button>
            <button onClick={onDismissAll} className="text-xs text-gray-400 hover:text-gray-600">Limpar</button>
          </div>
        </div>
      )}
    </div>
  )
}
