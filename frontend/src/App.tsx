import { useState } from 'react'
import './App.css'

type User = {
  id: string
  name: string
}

const USERS: readonly User[] = [
  { id: 'usr-doug', name: 'Doug' },
  { id: 'usr-daniel', name: 'Daniel' },
  { id: 'usr-mary', name: 'Mary' },
  { id: 'usr-adam', name: 'Adam' },
  { id: 'usr-jabbar', name: 'Jabbar' },
]

const USER_STORAGE_KEY = 'remember-that.current-user-id'

function getStoredUser(): User | null {
  try {
    const storedUserId = window.localStorage.getItem(USER_STORAGE_KEY)
    return USERS.find((user) => user.id === storedUserId) ?? null
  } catch {
    return null
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser)
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id ?? '')

  const selectUser = (userId: string) => {
    const user = USERS.find((candidate) => candidate.id === userId)
    if (!user) return

    try {
      window.localStorage.setItem(USER_STORAGE_KEY, user.id)
    } catch {
      // The selection still works for this session when device storage is unavailable.
    }

    setSelectedUserId(user.id)
    setCurrentUser(user)
  }

  if (!currentUser) {
    return (
      <main className="user-gate">
        <section className="user-card" aria-labelledby="welcome-heading">
          <div className="brand-mark" aria-hidden="true">R</div>
          <p className="eyebrow">Tasty Fresh IT</p>
          <h1 id="welcome-heading">Welcome to Remember That</h1>
          <p className="intro">
            Choose your name to identify the records you create on this device.
          </p>

          <form onSubmit={(event) => {
            event.preventDefault()
            selectUser(selectedUserId)
          }}>
            <label htmlFor="initial-user">Who are you?</label>
            <select
              id="initial-user"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              required
            >
              <option value="" disabled>Select your name</option>
              {USERS.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <button className="primary-button" type="submit" disabled={!selectedUserId}>
              Continue
            </button>
          </form>

          <p className="privacy-note">
            This identifies you for record ownership. It is not a secure sign-in.
          </p>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">R</div>
          <div><strong>Remember That</strong><span>Tasty Fresh IT</span></div>
        </div>

        <nav aria-label="Primary navigation">
          <a className="nav-item active" href="#home" aria-current="page">
            <span aria-hidden="true">⌂</span> Home
          </a>
          <span className="nav-item muted"><span aria-hidden="true">✓</span> Tasks</span>
          <span className="nav-item muted"><span aria-hidden="true">□</span> Inventory</span>
          <span className="nav-item muted"><span aria-hidden="true">⌕</span> Search</span>
          <span className="nav-item muted"><span aria-hidden="true">▱</span> Archives</span>
        </nav>

        <p className="sidebar-status"><span aria-hidden="true"></span> App shell ready</p>
      </aside>

      <div className="page">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark" aria-hidden="true">R</div>
            <strong>Remember That</strong>
          </div>
          <label className="user-switcher">
            <span>Using as</span>
            <select
              aria-label="Current user"
              value={currentUser.id}
              onChange={(event) => selectUser(event.target.value)}
            >
              {USERS.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </label>
        </header>

        <main id="home" className="content">
          <section className="welcome-panel">
            <p className="eyebrow">Workspace</p>
            <h1>Hello, {currentUser.name}</h1>
            <p>
              Your app is ready. Tasks, inventory, search and offline sync will be added in the next milestones.
            </p>
          </section>

          <section aria-labelledby="workspace-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Coming next</p>
                <h2 id="workspace-heading">Your workspace</h2>
              </div>
              <span className="status-pill">Milestone 1</span>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <span className="feature-icon blue" aria-hidden="true">✓</span>
                <h3>Tasks</h3>
                <p>Keep a shared diary of work and useful notes.</p>
              </article>
              <article className="feature-card">
                <span className="feature-icon amber" aria-hidden="true">□</span>
                <h3>Inventory</h3>
                <p>Remember where equipment and supplies are stored.</p>
              </article>
              <article className="feature-card">
                <span className="feature-icon green" aria-hidden="true">⌕</span>
                <h3>Search</h3>
                <p>Find tasks and inventory records in one place.</p>
              </article>
            </div>
          </section>
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          <a className="active" href="#home"><span aria-hidden="true">⌂</span>Home</a>
          <span><span aria-hidden="true">✓</span>Tasks</span>
          <span><span aria-hidden="true">□</span>Inventory</span>
          <span><span aria-hidden="true">⌕</span>Search</span>
        </nav>
      </div>
    </div>
  )
}

export default App