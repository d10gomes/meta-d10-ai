import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Company } from '../types/company'
import type { AgentMessage, AgentAction } from '../types/agent'
import { mockCompanies, mockMessages, mockActions } from '../lib/mock-data'
import * as db from '../lib/supabase-data'

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
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  dataSource: 'supabase' | 'mock'
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [messages, setMessages] = useState<AgentMessage[]>(mockMessages)
  const [actions, setActions] = useState<AgentAction[]>(mockActions)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'supabase' | 'mock'>('mock')

  const loadFromSupabase = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [companiesData, messagesData, actionsData] = await Promise.all([
        db.fetchCompanies(),
        db.fetchMessages(),
        db.fetchActions(),
      ])

      if (companiesData.length > 0) {
        setCompanies(companiesData)
        setMessages(messagesData)
        setActions(actionsData)
        setDataSource('supabase')
      } else {
        setDataSource('mock')
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err)
      setError('Usando dados demo. Verifique a conexao com o Supabase.')
      setDataSource('mock')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFromSupabase()
  }, [loadFromSupabase])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null

  const addCompany = (company: Company) => setCompanies((prev) => [...prev, company])

  const updateCompany = (id: string, data: Partial<Company>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    if (dataSource === 'supabase') {
      db.updateCompanyData(id, data).catch(console.error)
    }
  }

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
        loading,
        error,
        refresh: loadFromSupabase,
        dataSource,
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
