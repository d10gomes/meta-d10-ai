import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { dia: 'Seg', investido: 450, retorno: 1890, leads: 32 },
  { dia: 'Ter', investido: 520, retorno: 2210, leads: 41 },
  { dia: 'Qua', investido: 480, retorno: 1950, leads: 35 },
  { dia: 'Qui', investido: 600, retorno: 2850, leads: 48 },
  { dia: 'Sex', investido: 550, retorno: 2640, leads: 45 },
  { dia: 'Sab', investido: 380, retorno: 1520, leads: 28 },
  { dia: 'Dom', investido: 320, retorno: 1280, leads: 22 },
]

export default function PerformanceChart() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Performance Semanal</h3>
          <p className="text-sm text-gray-500 mt-0.5">Investimento vs Retorno</p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            Investido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            Retorno
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorRetorno" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
          />
          <Area type="monotone" dataKey="investido" stroke="#3b82f6" strokeWidth={2} fill="url(#colorInvestido)" name="Investido" />
          <Area type="monotone" dataKey="retorno" stroke="#22c55e" strokeWidth={2} fill="url(#colorRetorno)" name="Retorno" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
