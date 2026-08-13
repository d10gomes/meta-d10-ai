import * as db from './supabase-data'
import * as metaApi from './meta-api'
import { hub } from '../agents/communication'

export interface SyncStatus {
  running: boolean
  lastSyncAt: string | null
  lastResult: SyncResult | null
  nextSyncAt: string | null
  intervalMs: number
}

interface SyncResult {
  success: boolean
  companiesSynced: number
  campaignsSynced: number
  errors: string[]
  durationMs: number
}

type SyncListener = (status: SyncStatus) => void

class SyncService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private status: SyncStatus = {
    running: false,
    lastSyncAt: null,
    lastResult: null,
    nextSyncAt: null,
    intervalMs: 600000,
  }
  private listeners = new Set<SyncListener>()
  private syncing = false

  getStatus(): SyncStatus {
    return { ...this.status }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const snapshot = this.getStatus()
    for (const fn of this.listeners) {
      try { fn(snapshot) } catch {}
    }
  }

  start(intervalMs = 600000) {
    if (this.status.running) return
    this.status.running = true
    this.status.intervalMs = intervalMs

    hub.send({
      from: 'orchestrator',
      to: 'broadcast',
      type: 'alert',
      priority: 'low',
      subject: 'Sync automatico ativado',
      content: `Dados da Meta API serao sincronizados a cada ${Math.round(intervalMs / 60000)} minutos.`,
    })

    this.syncAll()
    this.intervalId = setInterval(() => this.syncAll(), intervalMs)
    this.notify()
  }

  stop() {
    if (!this.status.running) return
    this.status.running = false
    this.status.nextSyncAt = null

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    hub.send({
      from: 'orchestrator',
      to: 'broadcast',
      type: 'alert',
      priority: 'low',
      subject: 'Sync automatico pausado',
      content: 'Sincronizacao automatica desativada.',
    })

    this.notify()
  }

  isRunning(): boolean {
    return this.status.running
  }

  async syncAll(): Promise<SyncResult> {
    if (this.syncing) {
      return { success: false, companiesSynced: 0, campaignsSynced: 0, errors: ['Sync ja em andamento'], durationMs: 0 }
    }

    this.syncing = true
    const start = Date.now()
    const errors: string[] = []
    let companiesSynced = 0
    let campaignsSynced = 0

    try {
      const companies = await db.fetchCompanies()

      for (const company of companies) {
        if (company.status !== 'active') continue

        const config = await db.fetchMetaConfig(company.id)
        if (!config || config.status !== 'connected') continue

        const opts = { accessToken: config.accessToken, adAccountId: config.adAccountId }

        try {
          await metaApi.syncCampaignsToSupabase(company.id, opts)

          const { data: campaigns } = await (await import('./supabase')).supabase
            .from('campaigns')
            .select('id')
            .eq('company_id', company.id)

          campaignsSynced += campaigns?.length || 0

          await metaApi.syncAdsToSupabase(company.id, opts)

          companiesSynced++
        } catch (err) {
          const msg = `${company.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
          errors.push(msg)
          console.error(`Sync falhou para ${company.name}:`, err)
        }
      }

      const durationMs = Date.now() - start
      const result: SyncResult = { success: errors.length === 0, companiesSynced, campaignsSynced, errors, durationMs }

      this.status.lastSyncAt = new Date().toISOString()
      this.status.lastResult = result

      if (this.status.running) {
        this.status.nextSyncAt = new Date(Date.now() + this.status.intervalMs).toISOString()
      }

      if (companiesSynced > 0) {
        hub.send({
          from: 'orchestrator',
          to: 'broadcast',
          type: 'report',
          priority: errors.length > 0 ? 'high' : 'low',
          subject: `Sync concluido em ${(durationMs / 1000).toFixed(1)}s`,
          content: `${companiesSynced} empresa(s), ${campaignsSynced} campanhas sincronizadas.${errors.length > 0 ? ` ${errors.length} erro(s).` : ''}`,
        })
      }

      this.notify()
      return result
    } catch (err) {
      const durationMs = Date.now() - start
      const result: SyncResult = {
        success: false,
        companiesSynced: 0,
        campaignsSynced: 0,
        errors: [err instanceof Error ? err.message : 'Erro desconhecido'],
        durationMs,
      }

      this.status.lastSyncAt = new Date().toISOString()
      this.status.lastResult = result

      if (this.status.running) {
        this.status.nextSyncAt = new Date(Date.now() + this.status.intervalMs).toISOString()
      }

      hub.send({
        from: 'orchestrator',
        to: 'broadcast',
        type: 'alert',
        priority: 'critical',
        subject: 'Erro no sync automatico',
        content: `Falha geral: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      })

      this.notify()
      return result
    } finally {
      this.syncing = false
    }
  }
}

export const syncService = new SyncService()
