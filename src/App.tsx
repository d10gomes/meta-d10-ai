import { DollarSign, Users, MousePointerClick, TrendingUp, Bell, Search } from 'lucide-react'
import Sidebar from './components/Sidebar'
import MetricCard from './components/MetricCard'
import CampaignTable from './components/CampaignTable'
import PerformanceChart from './components/PerformanceChart'
import AIInsights from './components/AIInsights'

const metrics = [
  { title: 'Investido Hoje', value: 'R$ 3.300', change: 12, icon: DollarSign, color: 'bg-blue-500' },
  { title: 'Leads Gerados', value: '251', change: 24, icon: Users, color: 'bg-green-500' },
  { title: 'CTR Medio', value: '3.8%', change: 8, icon: MousePointerClick, color: 'bg-purple-500' },
  { title: 'ROAS Geral', value: '4.2x', change: -3, icon: TrendingUp, color: 'bg-orange-500' },
]

function App() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500">Visao geral das campanhas</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar campanhas..."
                className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              DG
            </div>
          </div>
        </header>

        <main className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <MetricCard key={m.title} {...m} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PerformanceChart />
            </div>
            <AIInsights />
          </div>

          <CampaignTable />
        </main>
      </div>
    </div>
  )
}

export default App
