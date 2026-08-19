import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useApp } from './contexts/AppContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import NotificationToast from './components/NotificationToast'
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Campaigns from './pages/Campaigns'
import Agents from './pages/Agents'
import Creatives from './pages/Creatives'
import Performance from './pages/Performance'
import ROITracker from './pages/ROITracker'
import Funnel from './pages/Funnel'
import Automations from './pages/Automations'
import Insights from './pages/Insights'
import Communication from './pages/Communication'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  companies: Companies,
  campaigns: Campaigns,
  agents: Agents,
  creatives: Creatives,
  performance: Performance,
  roi: ROITracker,
  funnel: Funnel,
  automations: Automations,
  insights: Insights,
  communication: Communication,
  settings: Settings,
}

function AppContent() {
  const { activePage, setActivePage } = useApp()
  const { activeNotifications, dismiss, dismissAll } = useRealtimeNotifications()
  const Page = pages[activePage] || Dashboard

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Header />
        <main className="p-8">
          <Page />
        </main>
      </div>
      <NotificationToast
        notifications={activeNotifications}
        onDismiss={dismiss}
        onDismissAll={dismissAll}
        onViewAll={() => { dismissAll(); setActivePage('communication') }}
      />
    </div>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 mt-4">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

export default App
