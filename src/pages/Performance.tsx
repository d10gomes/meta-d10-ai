import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useApp } from '../contexts/AppContext'

const dailyData = [
  { dia: '01', cpl: 14.2, cpc: 1.1, ctr: 3.2, roas: 3.8 },
  { dia: '03', cpl: 13.5, cpc: 1.0, ctr: 3.5, roas: 4.0 },
  { dia: '05', cpl: 12.8, cpc: 0.95, ctr: 3.8, roas: 4.2 },
  { dia: '07', cpl: 13.0, cpc: 0.98, ctr: 3.6, roas: 4.1 },
  { dia: '09', cpl: 11.5, cpc: 0.85, ctr: 4.0, roas: 4.5 },
  { dia: '11', cpl: 12.0, cpc: 0.90, ctr: 3.9, roas: 4.3 },
  { dia: '13', cpl: 11.2, cpc: 0.82, ctr: 4.2, roas: 4.7 },
  { dia: '15', cpl: 10.8, cpc: 0.78, ctr: 4.5, roas: 5.0 },
]

const companyPerf = [
  { name: 'Vida Nova', cpl: 12.51, roas: 4.2, ctr: 4.0, spend: 4140 },
  { name: 'Bella Moda', cpl: 14.29, roas: 6.2, ctr: 4.0, spend: 4840 },
  { name: 'Saber Digital', cpl: 4.0, roas: 12.0, ctr: 4.0, spend: 7400 },
]

export default function Performance() {
  const { companies } = useApp()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Evolucao do CPL</h3>
          <p className="text-sm text-gray-500 mb-4">Custo por lead ao longo do mes</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="cpl" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="CPL" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Evolucao do ROAS</h3>
          <p className="text-sm text-gray-500 mb-4">Retorno sobre investimento ao longo do mes</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="roas" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} name="ROAS" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-1">Comparativo por Empresa</h3>
        <p className="text-sm text-gray-500 mb-4">Performance de cada empresa</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={companyPerf}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="roas" fill="#3b82f6" radius={[8, 8, 0, 0]} name="ROAS" />
            <Bar dataKey="ctr" fill="#22c55e" radius={[8, 8, 0, 0]} name="CTR %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Ranking de Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">Empresa</th>
              <th className="text-left px-5 py-3 font-medium">CPL</th>
              <th className="text-left px-5 py-3 font-medium">ROAS</th>
              <th className="text-left px-5 py-3 font-medium">CTR</th>
              <th className="text-left px-5 py-3 font-medium">Investido</th>
            </tr>
          </thead>
          <tbody>
            {companyPerf.sort((a, b) => b.roas - a.roas).map((c, i) => (
              <tr key={c.name} className="border-t border-gray-50">
                <td className="px-5 py-3.5 font-bold text-gray-400">{i + 1}</td>
                <td className="px-5 py-3.5 font-medium text-gray-900">{c.name}</td>
                <td className="px-5 py-3.5 text-gray-600">R$ {c.cpl.toFixed(2)}</td>
                <td className="px-5 py-3.5"><span className={`font-bold ${c.roas >= 4 ? 'text-green-600' : 'text-yellow-600'}`}>{c.roas}x</span></td>
                <td className="px-5 py-3.5 text-gray-600">{c.ctr}%</td>
                <td className="px-5 py-3.5 font-medium text-gray-900">R$ {c.spend.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
