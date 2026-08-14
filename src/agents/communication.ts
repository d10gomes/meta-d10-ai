import type { AgentMessage } from '../types/agent'
import type { AgentRole } from '../types/company'
import { createMessage } from '../lib/supabase-data'

type MessageInput = Omit<AgentMessage, 'id' | 'timestamp' | 'read'>

class AgentCommunicationHub {
  private listeners: Map<string, ((msg: AgentMessage) => void)[]> = new Map()
  private queue: MessageInput[] = []
  private flushing = false

  send(message: MessageInput): void {
    this.queue.push(message)
    this.flush()
  }

  private async flush() {
    if (this.flushing) return
    this.flushing = true

    while (this.queue.length > 0) {
      const msg = this.queue.shift()!
      try {
        const saved = await createMessage(msg)
        this.notifyListeners(saved)
      } catch (err) {
        console.error('Hub: falha ao persistir mensagem:', err)
      }
    }

    this.flushing = false
  }

  private notifyListeners(msg: AgentMessage) {
    if (msg.to === 'broadcast') {
      this.listeners.forEach((cbs) => cbs.forEach((cb) => cb(msg)))
    } else {
      const cbs = this.listeners.get(msg.to) || []
      cbs.forEach((cb) => cb(msg))
    }
  }

  subscribe(role: AgentRole, callback: (msg: AgentMessage) => void) {
    const existing = this.listeners.get(role) || []
    this.listeners.set(role, [...existing, callback])
    return () => {
      const cbs = this.listeners.get(role) || []
      this.listeners.set(role, cbs.filter((cb) => cb !== callback))
    }
  }
}

export const hub = new AgentCommunicationHub()
