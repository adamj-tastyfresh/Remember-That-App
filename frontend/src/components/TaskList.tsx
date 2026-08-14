import { AttachmentList } from './AttachmentList.tsx'
import type { LocalAttachmentRecord } from '../domain/attachment.ts'
import type { User } from '../data/users.ts'
import type { TaskRecord } from '../domain/task.ts'

type TaskListProps = {
  tasks: readonly TaskRecord[]
  attachments?: readonly LocalAttachmentRecord[]
  currentUser: User
  archived?: boolean
  onEdit?: (task: TaskRecord) => void
  onArchive?: (task: TaskRecord) => void
  onDelete?: (task: TaskRecord) => void
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function syncClass(task: TaskRecord): string {
  return 'sync-badge ' + task.syncStatus.toLowerCase().replaceAll(' ', '-')
}

export function TaskList({ tasks, attachments = [], currentUser, archived = false, onEdit, onArchive, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <span aria-hidden="true">{archived ? '▱' : '✓'}</span>
        <h3>{archived ? 'No archived tasks' : 'No tasks yet'}</h3>
        <p>{archived ? 'Archived tasks will stay available here.' : 'Add the first task using the form.'}</p>
      </div>
    )
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const isCreator = task.creatorId === currentUser.id

        return (
          <article className="task-card" key={task.id}>
            <div className="task-card-topline">
              <span className={syncClass(task)}>
                <span aria-hidden="true"></span>{task.syncStatus}
              </span>
              <span className="task-date">{formatDate(task.serverCreatedAt ?? task.deviceCreatedAt)}</span>
            </div>
            <h3>{task.title}</h3>
            <p className="task-description">{task.description}</p>
            <AttachmentList attachments={attachments.filter((attachment) => attachment.parentRecordType === 'task' && attachment.parentRecordId === task.id)} />
            {task.syncError && <p className="sync-error">{task.syncError}</p>}
            {task.conflictServerTask && (
              <div className="conflict-comparison">
                <div><strong>Local version</strong><span>{task.title}</span><p>{task.description}</p></div>
                <div><strong>Server version</strong><span>{task.conflictServerTask.title}</span><p>{task.conflictServerTask.description}</p></div>
              </div>
            )}
            <footer>
              <span>Created by <strong>{task.creatorName}</strong></span>
              {!archived && isCreator && (
                <div className="task-actions">
                  <button type="button" onClick={() => onEdit?.(task)}>Edit</button>
                  <button className="archive-button" type="button" onClick={() => onArchive?.(task)}>Archive</button>
                </div>
              )}
              {!archived && !isCreator && <span className="owner-note">View only</span>}
              {archived && isCreator && <button className="permanent-delete-button" type="button" onClick={() => onDelete?.(task)}>Delete permanently</button>}
            </footer>
          </article>
        )
      })}
    </div>
  )
}
