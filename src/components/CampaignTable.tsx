import { MoreVertical, Circle } from 'lucide-react'

const campaigns = [
  { name: 'Conversao - Vendas Black', status: 'Ativa', budget: 'R$ 150/dia', spent: 'R$ 2.340', leads: 187, cpl: 'R$ 12,51', roas: '4.2x', trend: 'up' },
  { name: 'Trafego - Landing Page', status: 'Ativa', budget: 'R$ 80/dia', spent: 'R$ 1.120', leads: 94, cpl: 'R$ 11,91', roas: '3.8x', trend: 'up' },
  { name: 'Remarketing - Carrinho', status: 'Ativa', budget: 'R$ 50/dia', spent: 'R$ 680', leads: 62, cpl: 'R$ 10,97', roas: '5.1x', trend: 'up' },
  { name: 'Awareness - Marca', status: 'Pausada', budget: 'R$ 200/dia', spent: 'R$ 4.800', leads: 320, cpl: 'R$ 15,00', roas: '2.1x', trend: 'down' },
  { name: 'Lookalike - Compradores', status: 'Ativa', budget: 'R$ 120/dia', spent: 'R$ 1.560', leads: 145, cpl: 'R$ 10,76', roas: '4.7x', trend: 'up' },
]

export default function CampaignTable() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Campanhas Ativas</h3>
          <p className="text-sm text-gray-500 mt-0.5">Monitoramento em tempo real</p>
        </div>
        <button className="text-sm text-blue-600 font-medium hover:text-blue-700">Ver todas</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">Campanha</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Orcamento</th>
              <th className="text-left px-5 py-3 font-medium">Investido</th>
              <th className="text-left px-5 py-3 font-medium">Leads</th>
              <th className="text-left px-5 py-3 font-medium">CPL</th>
              <th className="text-left px-5 py-3 font-medium">ROAS</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-900">{c.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    c.status === 'Ativa' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Circle size={6} fill="currentColor" />
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-600">{c.budget}</td>
                <td className="px-5 py-3.5 text-gray-600">{c.spent}</td>
                <td className="px-5 py-3.5 font-medium text-gray-900">{c.leads}</td>
                <td className="px-5 py-3.5 text-gray-600">{c.cpl}</td>
                <td className="px-5 py-3.5">
                  <span className={`font-semibold ${
                    parseFloat(c.roas) >= 4 ? 'text-green-600' : parseFloat(c.roas) >= 3 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {c.roas}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
