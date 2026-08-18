import { useState } from 'react'
import { LogIn, UserPlus, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const result = await signIn(email, password)
      if (result.error) setError(result.error)
    } else {
      if (!name.trim()) {
        setError('Informe seu nome')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('A senha deve ter no minimo 6 caracteres')
        setLoading(false)
        return
      }
      const result = await signUp(email, password, name)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.')
        setMode('login')
        setPassword('')
      }
    }
    setLoading(false)
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Meta D10 AI</h1>
          <p className="text-gray-400 mt-2">Gestor de Trafego com Orquestra de Agentes IA</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {mode === 'login' ? 'Entrar na plataforma' : 'Criar sua conta'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                  placeholder="Minimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn size={20} />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Criar conta
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {mode === 'login'
                ? 'Nao tem conta? Criar agora'
                : 'Ja tem conta? Fazer login'}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          PAIN Program &bull; Meta D10 AI Platform
        </p>
      </div>
    </div>
  )
}
