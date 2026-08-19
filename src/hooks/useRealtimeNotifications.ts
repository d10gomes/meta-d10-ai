import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface RealtimeNotification {
  id: string
  type: 'action' | 'message' | 'alert'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  agentRole: string
  timestamp: string
  dismissed: boolean
}

const AGENT_LABELS: Record<string, string> = {
  orchestrator: 'Orquestrador',
  budget: 'Budget',
  performance: 'Performance',
  audience: 'Audiencia',
  creative: 'Criativos',
  leads: 'Leads',
  sales: 'Vendas',
  traffic: 'Trafego',
  registration: 'Cadastro',
  apps: 'Apps',
  awareness: 'Awareness',
  engagement: 'Engajamento',
  funnel: 'Funil',
  copy: 'Copy',
}

function agentLabel(role: string): string {
  return AGENT_LABELS[role] || role
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])

  useEffect(() => {
    const actionsChannel = supabase
      .channel('realtime-actions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_actions' },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const notification: RealtimeNotification = {
            id: `action-${row.id}`,
            type: 'action',
            title: `Agente ${agentLabel(row.agent_role as string)}`,
            description: row.description as string,
            priority: 'medium',
            agentRole: row.agent_role as string,
            timestamp: new Date().toISOString(),
            dismissed: false,
          }
          setNotifications(prev => [notification, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    const messagesChannel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_messages' },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const priority = row.priority as string
          const notification: RealtimeNotification = {
            id: `msg-${row.id}`,
            type: priority === 'critical' || priority === 'high' ? 'alert' : 'message',
            title: `${agentLabel(row.from_agent as string)}: ${row.subject}`,
            description: row.content as string,
            priority: priority as RealtimeNotification['priority'],
            agentRole: row.from_agent as string,
            timestamp: new Date().toISOString(),
            dismissed: false,
          }
          setNotifications(prev => [notification, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(actionsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n))
  }, [])

  const dismissAll = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, dismissed: true })))
  }, [])

  const activeNotifications = notifications.filter(n => !n.dismissed)

  return { notifications, activeNotifications, dismiss, dismissAll }
}
