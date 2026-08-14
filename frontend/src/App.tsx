import { useEffect, useState } from 'react'
import { InventoryForm } from './components/InventoryForm.tsx'
import { InventoryList } from './components/InventoryList.tsx'
import { SearchView } from './components/SearchView.tsx'
import { SyncStatusBar, SYNC_REQUEST_EVENT } from './components/SyncStatusBar.tsx'
import { TaskForm } from './components/TaskForm.tsx'
import { TaskList } from './components/TaskList.tsx'
import { listAttachments } from './data/attachmentRepository.ts'
import type { LocalAttachmentRecord } from './domain/attachment.ts'
import { listInventory, queuePermanentInventoryDeletion, saveInventoryRecord } from './data/inventoryRepository.ts'
import { listTasks, queuePermanentTaskDeletion, saveTask } from './data/taskRepository.ts'
import { findUser, USERS, type User } from './data/users.ts'
import {
  archiveInventoryRecord,
  createInventoryRecord,
  hasUnsynchronisedInventory,
  prepareInventoryPermanentDeletion,
  updateInventoryRecord,
  type InventoryInput,
  type InventoryRecord,
} from './domain/inventory.ts'
import {
  archiveTask,
  createTask,
  hasUnsynchronisedTasks,
  prepareTaskPermanentDeletion,
  updateTask,
  type TaskInput,
  type TaskRecord,
} from './domain/task.ts'
import './App.css'

type AppView = 'home' | 'tasks' | 'inventory' | 'search' | 'archives'
type DeletionTarget = { type: 'task'; record: TaskRecord } | { type: 'inventory'; record: InventoryRecord }
const USER_STORAGE_KEY = 'remember-that.current-user-id'

function getStoredUser(): User | null {
  try { return findUser(window.localStorage.getItem(USER_STORAGE_KEY)) } catch { return null }
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser)
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id ?? '')
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget | null>(null)
  const [deletingPermanently, setDeletingPermanently] = useState(false)
  const [view, setView] = useState<AppView>('home')
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [attachments, setAttachments] = useState<LocalAttachmentRecord[]>([])
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [editingInventory, setEditingInventory] = useState<InventoryRecord | null>(null)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [savingTask, setSavingTask] = useState(false)
  const [savingInventory, setSavingInventory] = useState(false)
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    let cancelled = false
    void Promise.all([listTasks(), listInventory(), listAttachments()])
      .then(([storedTasks, storedInventory, storedAttachments]) => {
        if (!cancelled) {
          setTasks(storedTasks)
          setInventory(storedInventory)
          setAttachments(storedAttachments)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setStorageError(error instanceof Error ? error.message : 'Could not load records stored on this device.')
      })
      .finally(() => { if (!cancelled) setLoadingRecords(false) })
    return () => { cancelled = true }
  }, [])

  const applyUser = (user: User) => {
    try { window.localStorage.setItem(USER_STORAGE_KEY, user.id) } catch {
      // The selection still works for this session when device storage is unavailable.
    }
    setSelectedUserId(user.id)
    setCurrentUser(user)
    setEditingTask(null)
    setEditingInventory(null)
    setPendingUser(null)
    setDeletionTarget(null)
  }

  const selectUser = (userId: string) => {
    const user = findUser(userId)
    if (!user || user.id === currentUser?.id) return
    if (currentUser && (
      hasUnsynchronisedTasks(tasks, currentUser.id)
      || hasUnsynchronisedInventory(inventory, currentUser.id)
    )) {
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
      setTasks((existing) => [task, ...existing.filter((item) => item.id !== task.id)]
        .sort((a, b) => b.deviceCreatedAt.localeCompare(a.deviceCreatedAt)))
      if (navigator.onLine) window.dispatchEvent(new Event(SYNC_REQUEST_EVENT))
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not save this task on the device.')
      return false
    } finally {
      setSavingTask(false)
    }
  }

  const persistInventory = async (record: InventoryRecord): Promise<boolean> => {
    setSavingInventory(true)
    setStorageError('')
    try {
      await saveInventoryRecord(record)
      setInventory((existing) => [record, ...existing.filter((item) => item.id !== record.id)]
        .sort((a, b) => b.deviceCreatedAt.localeCompare(a.deviceCreatedAt)))
      if (navigator.onLine) window.dispatchEvent(new Event(SYNC_REQUEST_EVENT))
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not save this inventory record on the device.')
      return false
    } finally {
      setSavingInventory(false)
    }
  }

  const handleSaveTask = async (input: TaskInput): Promise<boolean> => {
    if (!currentUser || savingTask) return false
    try {
      const task = editingTask ? updateTask(editingTask, input, currentUser) : createTask(input, currentUser)
      const saved = await persistTask(task)
      if (saved) setEditingTask(null)
      return saved
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not prepare this task for saving.')
      return false
    }
  }

  const handleSaveInventory = async (input: InventoryInput): Promise<boolean> => {
    if (!currentUser || savingInventory) return false
    try {
      const record = editingInventory
        ? updateInventoryRecord(editingInventory, input, currentUser)
        : createInventoryRecord(input, currentUser)
      const saved = await persistInventory(record)
      if (saved) setEditingInventory(null)
      return saved
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not prepare this inventory record for saving.')
      return false
    }
  }

  const handleArchiveTask = async (task: TaskRecord) => {
    if (!currentUser) return
    try {
      const saved = await persistTask(archiveTask(task, currentUser))
      if (saved && editingTask?.id === task.id) setEditingTask(null)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not archive this task.')
    }
  }

  const handleArchiveInventory = async (record: InventoryRecord) => {
    if (!currentUser) return
    try {
      const saved = await persistInventory(archiveInventoryRecord(record, currentUser))
      if (saved && editingInventory?.id === record.id) setEditingInventory(null)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not archive this inventory record.')
    }
  }

  const handlePermanentDelete = async () => {
    if (!currentUser || !deletionTarget || deletingPermanently) return
    setDeletingPermanently(true)
    setStorageError('')
    try {
      if (deletionTarget.type === 'task') {
        const pendingDeletion = prepareTaskPermanentDeletion(deletionTarget.record, currentUser)
        await queuePermanentTaskDeletion(pendingDeletion)
        setTasks((existing) => [pendingDeletion, ...existing.filter((task) => task.id !== pendingDeletion.id)])
      } else {
        const pendingDeletion = prepareInventoryPermanentDeletion(deletionTarget.record, currentUser)
        await queuePermanentInventoryDeletion(pendingDeletion)
        setInventory((existing) => [pendingDeletion, ...existing.filter((record) => record.id !== pendingDeletion.id)])
      }
      setDeletionTarget(null)
      if (navigator.onLine) window.dispatchEvent(new Event(SYNC_REQUEST_EVENT))
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not queue this permanent deletion.')
    } finally {
      setDeletingPermanently(false)
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

  const activeTasks = tasks.filter((task) => !task.archived && !task.pendingPermanentDeletion)
  const archivedTasks = tasks.filter((task) => task.archived && !task.pendingPermanentDeletion)
  const activeInventory = inventory.filter((record) => !record.archived && !record.pendingPermanentDeletion)
  const archivedInventory = inventory.filter((record) => record.archived && !record.pendingPermanentDeletion)
  const pendingCount = [
    ...tasks.filter((task) => task.creatorId === currentUser.id && task.syncStatus !== 'Synced'),
    ...inventory.filter((record) => record.creatorId === currentUser.id && record.syncStatus !== 'Synced'),
    ...attachments.filter((attachment) => attachment.uploadedById === currentUser.id && attachment.syncStatus !== 'Synced'),
  ].length

  const changeView = (nextView: AppView) => {
    setView(nextView)
    setEditingTask(null)
    setEditingInventory(null)
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
          <button className={'nav-item ' + (view === 'home' ? 'active' : '')} type="button" onClick={() => changeView('home')}><span aria-hidden="true">⌂</span> Home</button>
          <button className={'nav-item ' + (view === 'tasks' ? 'active' : '')} type="button" onClick={() => changeView('tasks')}><span aria-hidden="true">✓</span> Tasks</button>
          <button className={'nav-item ' + (view === 'inventory' ? 'active' : '')} type="button" onClick={() => changeView('inventory')}><span aria-hidden="true">□</span> Inventory</button>
          <button className={'nav-item ' + (view === 'search' ? 'active' : '')} type="button" onClick={() => changeView('search')}><span aria-hidden="true">⌕</span> Search</button>
          <button className={'nav-item ' + (view === 'archives' ? 'active' : '')} type="button" onClick={() => changeView('archives')}><span aria-hidden="true">▱</span> Archives</button>
        </nav>
        <p className="sidebar-status"><span aria-hidden="true"></span> Stored locally</p>
      </aside>

      <div className="page">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark" aria-hidden="true">R</div><strong>Remember That</strong></div>
          <div className="topbar-actions">
            <SyncStatusBar pendingCount={pendingCount} onTasksChanged={setTasks} onInventoryChanged={setInventory} onAttachmentsChanged={setAttachments} />
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
                <p>Your task diary and inventory locations work offline and safely queue changes for the internal server.</p>
                <div className="welcome-actions">
                  <button className="welcome-action" type="button" onClick={() => changeView('tasks')}>Add a task</button>
                  <button className="welcome-action secondary" type="button" onClick={() => changeView('inventory')}>Add inventory</button>
                </div>
              </section>
              <section aria-labelledby="overview-heading">
                <div className="section-heading">
                  <div><p className="eyebrow">Today</p><h2 id="overview-heading">Workspace overview</h2></div>
                  <span className="status-pill">Offline ready</span>
                </div>
                <div className="summary-grid overview-grid">
                  <button type="button" onClick={() => changeView('tasks')}><span className="summary-number">{activeTasks.length}</span><strong>Active tasks</strong><small>View the shared diary</small></button>
                  <button type="button" onClick={() => changeView('inventory')}><span className="summary-number">{activeInventory.length}</span><strong>Inventory items</strong><small>Find stored equipment</small></button>
                  <div><span className="summary-number">{pendingCount}</span><strong>Waiting to sync</strong><small>Your local changes</small></div>
                  <button type="button" onClick={() => changeView('archives')}><span className="summary-number">{archivedTasks.length + archivedInventory.length}</span><strong>Archived records</strong><small>View retained history</small></button>
                </div>
              </section>
            </>
          )}

          {view === 'tasks' && (
            <div className="tasks-layout">
              <TaskForm editingTask={editingTask} saving={savingTask} onCancel={() => setEditingTask(null)} onSave={handleSaveTask} />
              <section className="task-feed" aria-labelledby="task-list-heading">
                <div className="section-heading compact"><div><p className="eyebrow">Shared diary</p><h1 id="task-list-heading">Active tasks</h1></div><span className="task-count">{activeTasks.length}</span></div>
                {loadingRecords ? <p className="loading-state">Loading tasks from this device…</p> : <TaskList tasks={activeTasks} attachments={attachments} currentUser={currentUser} onEdit={setEditingTask} onArchive={(task) => void handleArchiveTask(task)} />}
              </section>
            </div>
          )}

          {view === 'inventory' && (
            <div className="tasks-layout">
              <InventoryForm editingRecord={editingInventory} saving={savingInventory} onCancel={() => setEditingInventory(null)} onSave={handleSaveInventory} />
              <section className="task-feed" aria-labelledby="inventory-list-heading">
                <div className="section-heading compact"><div><p className="eyebrow">Item locations</p><h1 id="inventory-list-heading">Inventory</h1></div><span className="task-count inventory-count">{activeInventory.length}</span></div>
                {loadingRecords ? <p className="loading-state">Loading inventory from this device…</p> : <InventoryList records={activeInventory} attachments={attachments} currentUser={currentUser} onEdit={setEditingInventory} onArchive={(record) => void handleArchiveInventory(record)} />}
              </section>
            </div>
          )}

          {view === 'search' && (
            <SearchView
              tasks={tasks}
              inventory={inventory}
              loading={loadingRecords}
              onOpenTask={() => changeView('tasks')}
              onOpenInventory={() => changeView('inventory')}
            />
          )}
          {view === 'archives' && (
            <section className="archive-view wide-archive" aria-labelledby="archive-heading">
              <div className="page-heading"><p className="eyebrow">Retained history</p><h1 id="archive-heading">Archives</h1><p>Archived tasks and inventory remain stored and retain their original creator.</p></div>
              <div className="archive-sections">
                <section aria-labelledby="archived-tasks-heading">
                  <div className="section-heading compact"><div><p className="eyebrow">Diary history</p><h2 id="archived-tasks-heading">Archived tasks</h2></div><span className="task-count">{archivedTasks.length}</span></div>
                  {loadingRecords ? <p className="loading-state">Loading archived tasks…</p> : <TaskList tasks={archivedTasks} attachments={attachments} currentUser={currentUser} archived onDelete={(task) => setDeletionTarget({ type: 'task', record: task })} />}
                </section>
                <section aria-labelledby="archived-inventory-heading">
                  <div className="section-heading compact"><div><p className="eyebrow">Location history</p><h2 id="archived-inventory-heading">Archived inventory</h2></div><span className="task-count inventory-count">{archivedInventory.length}</span></div>
                  {loadingRecords ? <p className="loading-state">Loading archived inventory…</p> : <InventoryList records={archivedInventory} attachments={attachments} currentUser={currentUser} archived onDelete={(record) => setDeletionTarget({ type: 'inventory', record })} />}
                </section>
              </div>
            </section>
          )}
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button className={view === 'home' ? 'active' : ''} type="button" onClick={() => changeView('home')}><span aria-hidden="true">⌂</span>Home</button>
          <button className={view === 'tasks' ? 'active' : ''} type="button" onClick={() => changeView('tasks')}><span aria-hidden="true">✓</span>Tasks</button>
          <button className={view === 'inventory' ? 'active' : ''} type="button" onClick={() => changeView('inventory')}><span aria-hidden="true">□</span>Inventory</button>
          <button className={view === 'search' ? 'active' : ''} type="button" onClick={() => changeView('search')}><span aria-hidden="true">⌕</span>Search</button>
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
      {deletionTarget && (
        <div className="dialog-backdrop" role="presentation">
          <section className="confirm-dialog delete-dialog" role="dialog" aria-modal="true" aria-labelledby="permanent-delete-heading">
            <span className="dialog-icon danger" aria-hidden="true">!</span>
            <h2 id="permanent-delete-heading">Delete permanently?</h2>
            <p><strong>{deletionTarget.type === 'task' ? deletionTarget.record.title : deletionTarget.record.itemName}</strong> will be removed from this device and queued for deletion everywhere. This cannot be undone.</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setDeletionTarget(null)} disabled={deletingPermanently}>Cancel</button>
              <button className="danger-button" type="button" onClick={() => void handlePermanentDelete()} disabled={deletingPermanently}>{deletingPermanently ? 'Deleting…' : 'Delete permanently'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
