import type { ServerTaskSnapshot } from '../domain/task.ts'
import type { SyncQueueItem } from '../sync/types.ts'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(new RegExp('/$'), '') ?? '/api/v1'

type ErrorBody = {
  error?: { code?: string; message?: string }
  data?: { serverTask?: ServerTaskSnapshot }
}

export class TaskApiError extends Error {
  readonly status: number
  readonly code: string
  readonly serverTask: ServerTaskSnapshot | null

  constructor(message: string, status: number, code: string, serverTask: ServerTaskSnapshot | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.serverTask = serverTask
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function pushTask(item: SyncQueueItem): Promise<ServerTaskSnapshot> {
  const response = await fetch(API_BASE_URL + '/tasks/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationId: item.operationId,
      actingUserId: item.actingUserId,
      task: {
        id: item.task.id,
        title: item.task.title,
        description: item.task.description,
        creatorId: item.task.creatorId,
        deviceCreatedAt: item.task.deviceCreatedAt,
        lastModifiedAt: item.task.lastModifiedAt,
        archived: item.task.archived,
        archivedAt: item.task.archivedAt,
        archivedBy: item.task.archivedBy,
        baseServerVersion: item.task.serverVersion,
      },
    }),
  })

  const body = await readJson(response) as ({ data?: ServerTaskSnapshot } & ErrorBody) | null
  if (!response.ok) {
    throw new TaskApiError(
      body?.error?.message ?? 'The task server rejected the update.',
      response.status,
      body?.error?.code ?? 'SYNC_FAILURE',
      body?.data?.serverTask ?? null,
    )
  }
  if (!body?.data) throw new TaskApiError('The task server returned an invalid response.', response.status, 'INVALID_RESPONSE')
  return body.data
}

export async function deleteTaskOnServer(item: SyncQueueItem): Promise<void> {
  const response = await fetch(API_BASE_URL + '/tasks/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationId: item.operationId, actingUserId: item.actingUserId, recordId: item.taskId, creatorId: item.task.creatorId, baseServerVersion: item.task.serverVersion }),
  })
  const body = await readJson(response) as ErrorBody | null
  if (!response.ok) throw new TaskApiError(body?.error?.message ?? 'The task could not be permanently deleted.', response.status, body?.error?.code ?? 'DELETE_FAILURE', body?.data?.serverTask ?? null)
}

export type TaskServerState = { records: ServerTaskSnapshot[]; deletedIds: string[] }

export async function fetchServerTasks(): Promise<TaskServerState> {
  const response = await fetch(API_BASE_URL + '/tasks', { headers: { Accept: 'application/json' } })
  const body = await readJson(response) as ({ data?: ServerTaskSnapshot[]; meta?: { deletedIds?: string[] } } & ErrorBody) | null
  if (!response.ok) {
    throw new TaskApiError(
      body?.error?.message ?? 'The task server is unavailable.',
      response.status,
      body?.error?.code ?? 'SERVER_UNAVAILABLE',
    )
  }
  if (!Array.isArray(body?.data)) throw new TaskApiError('The task server returned an invalid response.', response.status, 'INVALID_RESPONSE')
  return { records: body.data, deletedIds: Array.isArray(body.meta?.deletedIds) ? body.meta.deletedIds : [] }
}
