import { useEffect, useState } from 'react'
import { TaskForm } from './components/TaskForm.tsx'
import { TaskList } from './components/TaskList.tsx'
import { listTasks, saveTask } from './data/taskRepository.ts'
import { findUser, USERS, type User } from './data/users.ts'
import {
  archiveTask,
  createTask,
  hasUnsynchronisedTasks,
  updateTask,
  type TaskInput,
  type TaskRecord,
} from './domain/task.ts'
import './App.css'

type AppView = 'home' | 'tasks' | 'archives'

const USER_STORAGE_KEY = 'remember-that.current-user-id'

function getStoredUser(): User | null {
  try {
    return findUser(window.localStorage.getItem(USER_STORAGE_KEY))
  } catch {
    return null
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser)
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id ?? '')
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [view, setView] = useState<AppView>('home')
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [savingTask, setSavingTask] = useState(false)
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    let cancelled = false

    void listTasks()
      .then((storedTasks) => {
        if (!cancelled) setTasks(storedTasks)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStorageError(error instanceof Error ? error.message : 'Could not load tasks stored on this device.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTasks(false)
      })

    return () => { cancelled = true }
  }, [])

  const applyUser = (user: User) => {
    try {
      window.localStorage.setItem(USER_STORAGE_KEY, user.id)
    } catch {
      // The selection still works for this session when device storage is unavailable.
    }

    setSelectedUserId(user.id)
    setCurrentUser(user)
    setEditingTask(null)
    setPendingUser(null)
  }

  const selectUser = (userId: string) => {
    const user = findUser(userId)
    if (!user || user.id === currentUser?.id) return

    if (currentUser && hasUnsynchronisedTasks(tasks, currentUser.id)) {
      setPendingUser(user)
      return
    }

    applyUser(user)
  }

  const persistTask = async (task: TaskRecord): Promise<boolean> => {
    setSavingTask(true)
    setStorageError('')

    try {
      await saveTask(task)
      setTasks((existingTasks) => [
        task,
        ...existingTasks.filter((existingTask) => existingTask.id !== task.id),
      ].sort((first, second) => second.deviceCreatedAt.localeCompare(first.deviceCreatedAt)))
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not save this task on the device.')
      return false
    } finally {
      setSavingTask(false)
    }
  }

  const handleSaveTask = async (input: TaskInput): Promise<boolean> => {
    if (!currentUser || savingTask) return false

    try {
      const task = editingTask
        ? updateTask(editingTask, input, currentUser)
        : createTask(input, currentUser)
      const saved = await persistTask(task)
      if (saved) setEditingTask(null)
      return saved
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not prepare this task for saving.')
      return false
    }
  }

  const handleArchiveTask = async (task: TaskRecord) => {
    if (!currentUser) return

    try {
      const archivedTask = archiveTask(task, currentUser)
      const saved = await persistTask(archivedTask)
      if (saved && editingTask?.id === task.id) setEditingTask(null)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not archive this task.')
    }
  }

  if (!currentUser) {
    return (
      <main className="user-gate">
        <section className="user-card" aria-labelledby="welcome-heading">
          <div className="brand-mark" aria-hidden="true">R</div>
          <p className="eyebrow">Tasty Fresh IT</p>
          <h1 id="welcome-heading">Welcome to Remember That</h1>
          <p className="intro">Choose your name to identify the records you create on this device.</p>

          <form onSubmit={(event) => {
            event.preventDefault()
            const user = findUser(selectedUserId)
            if (user) applyUser(user)
          }}>
            <label htmlFor="initial-user">Who are you?</label>
            <select id="initial-user" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} required>
              <option value="" disabled>Select your name</option>
              {USERS.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <button className="primary-button" type="submit" disabled={!selectedUserId}>Continue</button>
          </form>

          <p className="privacy-note">This identifies you for record ownership. It is not a secure sign-in.</p>
        </section>
      </main>
    )
  }

  const activeTasks = tasks.filter((task) => !task.archived)
  const archivedTasks = tasks.filter((task) => task.archived)
  const myPendingTasks = tasks.filter((task) => task.creatorId === currentUser.id && task.syncStatus !== 'Synced')

  const changeView = (nextView: AppView) => {
    setView(nextView)
    setEditingTask(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">R</div>
          <div><strong>Remember That</strong><span>Tasty Fresh IT</span></div>
        </div>

        <nav aria-label="Primary navigation">
          <button className={'nav-item ' + (view === 'home' ? 'active' : '')} type="button" onClick={() => changeView('home')}>
            <span aria-hidden="true">⌂</span> Home
          </button>
          <button className={'nav-item ' + (view === 'tasks' ? 'active' : '')} type="button" onClick={() => changeView('tasks')}>
            <span aria-hidden="true">✓</span> Tasks
          </button>
          <span className="nav-item muted"><span aria-hidden="true">□</span> Inventory</span>
          <span className="nav-item muted"><span aria-hidden="true">⌕</span> Search</span>
          <button className={'nav-item ' + (view === 'archives' ? 'active' : '')} type="button" onClick={() => changeView('archives')}>
            <span aria-hidden="true">▱</span> Archives
          </button>
        </nav>

        <p className="sidebar-status"><span aria-hidden="true"></span> Stored locally</p>
      </aside>

      <div className="page">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark" aria-hidden="true">R</div><strong>Remember That</strong></div>
          <div className="topbar-actions">
            <span className="local-status"><span aria-hidden="true"></span>{myPendingTasks.length} waiting to sync</span>
            <label className="user-switcher">
              <span>Using as</span>
              <select aria-label="Current user" value={currentUser.id} onChange={(event) => selectUser(event.target.value)}>
                {USERS.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
          </div>
        </header>

        <main className="content">
          {storageError && (
            <div className="error-banner" role="alert">
              <strong>Local storage problem</strong><span>{storageError}</span>
              <button type="button" onClick={() => setStorageError('')} aria-label="Dismiss error">×</button>
            </div>
          )}

          {view === 'home' && (
            <>
              <section className="welcome-panel">
                <p className="eyebrow">Workspace</p>
                <h1>Hello, {currentUser.name}</h1>
                <p>Your task diary now works offline. New and changed tasks stay on this device until server synchronisation is added.</p>
                <button className="welcome-action" type="button" onClick={() => changeView('tasks')}>Add a task</button>
              </section>

              <section aria-labelledby="overview-heading">
                <div className="section-heading">
                  <div><p className="eyebrow">Today</p><h2 id="overview-heading">Workspace overview</h2></div>
                  <span className="status-pill">Offline ready</span>
                </div>
                <div className="summary-grid">
                  <button type="button" onClick={() => changeView('tasks')}>
                    <span className="summary-number">{activeTasks.length}</span><strong>Active tasks</strong><small>View the shared diary</small>
                  </button>
                  <div><span className="summary-number">{myPendingTasks.length}</span><strong>Waiting to sync</strong><small>Your local changes</small></div>
                  <button type="button" onClick={() => changeView('archives')}>
                    <span className="summary-number">{archivedTasks.length}</span><strong>Archived tasks</strong><small>View retained history</small>
                  </button>
                </div>
              </section>
            </>
          )}

          {view === 'tasks' && (
            <div className="tasks-layout">
              <TaskForm editingTask={editingTask} saving={savingTask} onCancel={() => setEditingTask(null)} onSave={handleSaveTask} />
              <section className="task-feed" aria-labelledby="task-list-heading">
                <div className="section-heading compact">
                  <div><p className="eyebrow">Shared diary</p><h1 id="task-list-heading">Active tasks</h1></div>
                  <span className="task-count">{activeTasks.length}</span>
                </div>
                {loadingTasks
                  ? <p className="loading-state">Loading tasks from this device…</p>
                  : <TaskList tasks={activeTasks} currentUser={currentUser} onEdit={setEditingTask} onArchive={(task) => void handleArchiveTask(task)} />}
              </section>
            </div>
          )}

          {view === 'archives' && (
            <section className="archive-view" aria-labelledby="archive-heading">
              <div className="page-heading">
                <p className="eyebrow">Retained history</p>
                <h1 id="archive-heading">Archived tasks</h1>
                <p>Archived tasks are hidden from the active diary but remain stored on this device.</p>
              </div>
              {loadingTasks
                ? <p className="loading-state">Loading archived tasks…</p>
                : <TaskList tasks={archivedTasks} currentUser={currentUser} archived />}
            </section>
          )}
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button className={view === 'home' ? 'active' : ''} type="button" onClick={() => changeView('home')}><span aria-hidden="true">⌂</span>Home</button>
          <button className={view === 'tasks' ? 'active' : ''} type="button" onClick={() => changeView('tasks')}><span aria-hidden="true">✓</span>Tasks</button>
          <span><span aria-hidden="true">□</span>Inventory</span>
          <button className={view === 'archives' ? 'active' : ''} type="button" onClick={() => changeView('archives')}><span aria-hidden="true">▱</span>Archives</button>
        </nav>
      </div>

      {pendingUser && (
        <div className="dialog-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="switch-user-heading">
            <span className="dialog-icon" aria-hidden="true">!</span>
            <h2 id="switch-user-heading">Switch to {pendingUser.name}?</h2>
            <p>{currentUser.name} has changes waiting to sync. They will remain safely stored and attributed to {currentUser.name}.</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setPendingUser(null)}>Stay as {currentUser.name}</button>
              <button className="primary-button" type="button" onClick={() => applyUser(pendingUser)}>Switch user</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
