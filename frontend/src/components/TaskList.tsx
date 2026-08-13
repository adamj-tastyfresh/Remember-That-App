import type { User } from '../data/users.ts'
import type { TaskRecord } from '../domain/task.ts'

type TaskListProps = {
  tasks: readonly TaskRecord[]
  currentUser: User
  archived?: boolean
  onEdit?: (task: TaskRecord) => void
  onArchive?: (task: TaskRecord) => void
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function TaskList({ tasks, currentUser, archived = false, onEdit, onArchive }: TaskListProps) {
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
              <span className={`sync-badge ${task.syncStatus === 'Waiting to Sync' ? 'waiting' : ''}`}>
                <span aria-hidden="true"></span>{task.syncStatus}
              </span>
              <span className="task-date">{formatDate(task.serverCreatedAt ?? task.deviceCreatedAt)}</span>
            </div>
            <h3>{task.title}</h3>
            <p className="task-description">{task.description}</p>
            <footer>
              <span>Created by <strong>{task.creatorName}</strong></span>
              {!archived && isCreator && (
                <div className="task-actions">
                  <button type="button" onClick={() => onEdit?.(task)}>Edit</button>
                  <button className="archive-button" type="button" onClick={() => onArchive?.(task)}>Archive</button>
                </div>
              )}
              {!archived && !isCreator && <span className="owner-note">View only</span>}
            </footer>
          </article>
        )
      })}
    </div>
  )
}
