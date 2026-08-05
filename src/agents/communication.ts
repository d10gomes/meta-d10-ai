import type { AgentMessage, AgentAction, AgentMemory } from '../types/agent'
import type { AgentRole } from '../types/company'

class AgentCommunicationHub {
  private messages: AgentMessage[] = []
  private actions: AgentAction[] = []
  private memories: AgentMemory[] = []
  private listeners: Map<string, ((msg: AgentMessage) => void)[]> = new Map()

  send(message: Omit<AgentMessage, 'id' | 'timestamp' | 'read'>): AgentMessage {
    const msg: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    }
    this.messages.push(msg)

    if (msg.to === 'broadcast') {
      this.listeners.forEach((cbs) => cbs.forEach((cb) => cb(msg)))
    } else {
      const cbs = this.listeners.get(msg.to) || []
      cbs.forEach((cb) => cb(msg))
    }

    return msg
  }

  subscribe(role: AgentRole, callback: (msg: AgentMessage) => void) {
    const existing = this.listeners.get(role) || []
    this.listeners.set(role, [...existing, callback])
    return () => {
      const cbs = this.listeners.get(role) || []
      this.listeners.set(role, cbs.filter((cb) => cb !== callback))
    }
  }

  getMessages(role?: AgentRole, limit = 50): AgentMessage[] {
    let msgs = this.messages
    if (role) {
      msgs = msgs.filter((m) => m.to === role || m.to === 'broadcast' || m.from === role)
    }
    return msgs.slice(-limit)
  }

  getUnreadCount(role: AgentRole): number {
    return this.messages.filter((m) => (m.to === role || m.to === 'broadcast') && !m.read).length
  }

  logAction(action: Omit<AgentAction, 'id' | 'timestamp'>): AgentAction {
    const a: AgentAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    this.actions.push(a)
    return a
  }

  getActions(companyId?: string, limit = 50): AgentAction[] {
    let acts = this.actions
    if (companyId) acts = acts.filter((a) => a.companyId === companyId)
    return acts.slice(-limit)
  }

  addMemory(memory: Omit<AgentMemory, 'id' | 'createdAt' | 'usageCount'>): AgentMemory {
    const m: AgentMemory = {
      ...memory,
      id: crypto.randomUUID(),
      usageCount: 0,
      createdAt: new Date().toISOString(),
    }
    this.memories.push(m)
    return m
  }

  getMemories(role?: AgentRole, type?: AgentMemory['type']): AgentMemory[] {
    let mems = this.memories
    if (role) mems = mems.filter((m) => m.agentRole === role)
    if (type) mems = mems.filter((m) => m.type === type)
    return mems
  }

  getSharedLearnings(): AgentMemory[] {
    return this.memories.filter((m) => m.type === 'learning' && m.confidence >= 0.8)
  }
}

export const hub = new AgentCommunicationHub()
