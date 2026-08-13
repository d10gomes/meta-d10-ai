import { supabase } from './supabase'

export interface Task {
  id: string
  companyId: string | null
  taskType: 'cycle' | 'rule_evaluation' | 'manual_action' | 'sync'
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled'
  triggerType: 'interval' | 'manual' | 'event' | 'rule'
  parentTaskId: string | null
  context: Record<string, unknown>
  result: Record<string, unknown>
  error: string | null
  decisionsProposed: number
  decisionsExecuted: number
  decisionsRejected: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export async function createTask(
  taskType: Task['taskType'],
  triggerType: Task['triggerType'],
  companyId?: string,
  parentTaskId?: string,
  context?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      company_id: companyId || null,
      task_type: taskType,
      trigger_type: triggerType,
      parent_task_id: parentTaskId || null,
      context: context || {},
      status: 'created',
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function startTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw error
}

export async function completeTask(
  taskId: string,
  result: Record<string, unknown>,
  stats?: { proposed: number; executed: number; rejected: number }
): Promise<void> {
  const update: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result,
  }
  if (stats) {
    update.decisions_proposed = stats.proposed
    update.decisions_executed = stats.executed
    update.decisions_rejected = stats.rejected
  }

  const { error } = await supabase.from('tasks').update(update).eq('id', taskId)
  if (error) throw error
}

export async function failTask(taskId: string, errorMsg: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: errorMsg,
    })
    .eq('id', taskId)

  if (error) throw error
}

export async function fetchRecentTasks(companyId?: string, limit = 20): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    companyId: r.company_id as string | null,
    taskType: r.task_type as Task['taskType'],
    status: r.status as Task['status'],
    triggerType: r.trigger_type as Task['triggerType'],
    parentTaskId: r.parent_task_id as string | null,
    context: (r.context as Record<string, unknown>) || {},
    result: (r.result as Record<string, unknown>) || {},
    error: r.error as string | null,
    decisionsProposed: (r.decisions_proposed as number) || 0,
    decisionsExecuted: (r.decisions_executed as number) || 0,
    decisionsRejected: (r.decisions_rejected as number) || 0,
    startedAt: r.started_at as string | null,
    completedAt: r.completed_at as string | null,
    createdAt: r.created_at as string,
  }))
}
