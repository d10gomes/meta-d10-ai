import { useState, useEffect } from 'react'
import { Users, UserPlus, Shield, Eye, Settings, Crown, Trash2, Loader2, X, ChevronDown } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchUserRoles, fetchMyRoles, assignUserRole, removeUserRole, findUserByEmail,
  UserRoleRecord, UserRole, ROLE_LABELS, ROLE_PERMISSIONS, hasPermission,
} from '../lib/supabase-data'

const ROLE_ICONS: Record<UserRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  manager: Settings,
  viewer: Eye,
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-purple-50 text-purple-700',
  admin: 'bg-blue-50 text-blue-700',
  manager: 'bg-green-50 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
}

export default function Team() {
  const { selectedCompanyId, companies } = useApp()
  const { user } = useAuth()
  const [members, setMembers] = useState<UserRoleRecord[]>([])
  const [myRole, setMyRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const company = companies.find(c => c.id === selectedCompanyId)

  useEffect(() => {
    if (!selectedCompanyId || !user) return
    loadData()
  }, [selectedCompanyId, user])

  async function loadData() {
    if (!selectedCompanyId || !user) return
    setLoading(true)
    try {
      const [rolesData, myRolesData] = await Promise.all([
        fetchUserRoles(selectedCompanyId),
        fetchMyRoles(user.id),
      ])
      setMembers(rolesData)
      const mine = myRolesData.find(r => r.companyId === selectedCompanyId)
      setMyRole(mine?.role || null)
    } catch (err) {
      console.error('Erro ao carregar equipe:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail || !selectedCompanyId || !user) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const found = await findUserByEmail(inviteEmail.trim())
      if (!found) {
        setInviteError('Usuario nao encontrado. Ele precisa criar uma conta primeiro.')
        setInviting(false)
        return
      }

      if (members.some(m => m.userId === found.id)) {
        setInviteError('Este usuario ja faz parte da equipe.')
        setInviting(false)
        return
      }

      await assignUserRole(found.id, selectedCompanyId, inviteRole, user.id)
      setInviteSuccess(`${found.name || found.email} adicionado como ${ROLE_LABELS[inviteRole]}`)
      setInviteEmail('')
      await loadData()
    } catch (err) {
      console.error(err)
      setInviteError('Erro ao adicionar membro.')
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(memberId: string, userId: string, newRole: UserRole) {
    if (!selectedCompanyId) return
    try {
      await assignUserRole(userId, selectedCompanyId, newRole, user?.id)
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRemove(userId: string) {
    if (!selectedCompanyId) return
    try {
      await removeUserRole(userId, selectedCompanyId)
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Users size={48} className="mb-4" />
        <p className="text-lg font-medium">Selecione uma empresa</p>
        <p className="text-sm mt-1">Escolha uma empresa no seletor acima para gerenciar a equipe.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  const canManageUsers = hasPermission(myRole, 'manage_users')
  const canManageCompany = hasPermission(myRole, 'manage_company')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {company?.name} &mdash; {members.length} {members.length === 1 ? 'membro' : 'membros'}
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={16} />
            Adicionar Membro
          </button>
        )}
      </div>

      {showInvite && canManageUsers && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Adicionar Membro</h3>
            <button onClick={() => { setShowInvite(false); setInviteError(null); setInviteSuccess(null) }} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {inviteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{inviteError}</div>
          )}
          {inviteSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">{inviteSuccess}</div>
          )}

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Email do usuario</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-48">
              <label className="block text-sm text-gray-600 mb-1">Papel</label>
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {!canManageCompany && <option value="" disabled>—</option>}
                  <option value="viewer">Visualizador</option>
                  <option value="manager">Gestor</option>
                  <option value="admin">Administrador</option>
                  {canManageCompany && <option value="owner">Proprietario</option>}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              </div>
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {inviting && <Loader2 size={16} className="animate-spin" />}
              Adicionar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Membros da Equipe</h3>
        </div>

        <div className="divide-y divide-gray-50">
          {members.map(member => {
            const Icon = ROLE_ICONS[member.role]
            const isMe = member.userId === user?.id
            const isOwner = member.role === 'owner'

            return (
              <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    {(member.userEmail || member.userId).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {member.userName || member.userEmail || member.userId.substring(0, 8)}
                      </p>
                      {isMe && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Voce</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{member.userEmail || member.userId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${ROLE_COLORS[member.role]}`}>
                    <Icon size={12} />
                    {ROLE_LABELS[member.role]}
                  </span>

                  {canManageUsers && !isMe && !isOwner && (
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={e => handleChangeRole(member.id, member.userId, e.target.value as UserRole)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 appearance-none pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="viewer">Visualizador</option>
                          <option value="manager">Gestor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                      </div>
                      <button
                        onClick={() => handleRemove(member.userId)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover membro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {members.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-3" />
              <p className="text-sm">Nenhum membro na equipe.</p>
              <p className="text-xs mt-1">O criador da empresa sera adicionado automaticamente como proprietario.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Permissoes por Papel</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => {
            const Icon = ROLE_ICONS[role]
            const perms = ROLE_PERMISSIONS[role]
            return (
              <div key={role} className={`p-4 rounded-xl border border-gray-100 ${ROLE_COLORS[role].split(' ')[0]}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <ul className="space-y-1">
                  {perms.map(p => (
                    <li key={p} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {permLabel(p)}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function permLabel(perm: string): string {
  const labels: Record<string, string> = {
    view: 'Visualizar dados',
    edit: 'Editar campanhas',
    create: 'Criar campanhas',
    delete: 'Excluir itens',
    manage_agents: 'Gerenciar agentes',
    manage_configs: 'Configurar thresholds',
    manage_users: 'Gerenciar equipe',
    manage_company: 'Gerenciar empresa',
  }
  return labels[perm] || perm
}
