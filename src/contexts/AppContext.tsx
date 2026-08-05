import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Company } from '../types/company'
import type { AgentMessage, AgentAction } from '../types/agent'
import { mockCompanies, mockMessages, mockActions } from '../lib/mock-data'

interface AppContextType {
  companies: Company[]
  selectedCompanyId: string | null
  selectedCompany: Company | null
  setSelectedCompanyId: (id: string | null) => void
  addCompany: (company: Company) => void
  updateCompany: (id: string, data: Partial<Company>) => void
  messages: AgentMessage[]
  actions: AgentAction[]
  activePage: string
  setActivePage: (page: string) => void
  totalBudget: number
  totalLeads: number
  totalROAS: number
  activeAgents: number
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [messages] = useState<AgentMessage[]>(mockMessages)
  const [actions] = useState<AgentAction[]>(mockActions)

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null

  const addCompany = (company: Company) => setCompanies((prev) => [...prev, company])

  const updateCompany = (id: string, data: Partial<Company>) =>
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))

  const totalBudget = companies.reduce((sum, c) => sum + c.monthlyBudget, 0)
  const totalLeads = companies.reduce(
    (sum, c) => sum + c.campaigns.reduce((s, camp) => s + camp.metrics.conversions, 0),
    0
  )
  const avgROAS =
    companies.length > 0
      ? companies.reduce(
          (sum, c) =>
            sum +
            (c.campaigns.length > 0
              ? c.campaigns.reduce((s, camp) => s + camp.metrics.roas, 0) / c.campaigns.length
              : 0),
          0
        ) / companies.length
      : 0
  const activeAgents = companies.reduce((sum, c) => sum + c.agents.filter((a) => a.status !== 'idle').length, 0)

  return (
    <AppContext.Provider
      value={{
        companies,
        selectedCompanyId,
        selectedCompany,
        setSelectedCompanyId,
        addCompany,
        updateCompany,
        messages,
        actions,
        activePage,
        setActivePage,
        totalBudget,
        totalLeads,
        totalROAS: avgROAS,
        activeAgents,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
