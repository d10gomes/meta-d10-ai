import { Key, Bell, Globe, Zap, Shield } from 'lucide-react'

export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Key size={20} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">API do Meta Ads</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Meta App ID</label>
            <input type="text" placeholder="Seu App ID" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Meta App Secret</label>
            <input type="password" placeholder="••••••••••••" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Access Token</label>
            <input type="password" placeholder="••••••••••••" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">Conectar Meta API</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={20} className="text-yellow-500" />
          <h3 className="font-semibold text-gray-900">Configuracoes dos Agentes</h3>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Modo Autonomo</p>
              <p className="text-xs text-gray-500">Agentes executam acoes sem aprovacao manual</p>
            </div>
            <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
            </div>
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Compartilhar Aprendizados</p>
              <p className="text-xs text-gray-500">Agentes compartilham insights entre empresas</p>
            </div>
            <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
            </div>
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Alertas em Tempo Real</p>
              <p className="text-xs text-gray-500">Notificacoes push para alertas criticos</p>
            </div>
            <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} className="text-green-600" />
          <h3 className="font-semibold text-gray-900">Limites de Seguranca</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Budget maximo por dia (por empresa)</label>
            <input type="number" placeholder="500" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Aumento maximo de budget (%)</label>
            <input type="number" placeholder="30" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">ROAS minimo para manter campanha ativa</label>
            <input type="number" placeholder="2.0" step="0.1" className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
