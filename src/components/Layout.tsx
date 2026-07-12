import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const avatarUrl = user?.user_metadata?.['avatar_url'] as string | undefined
  const displayName = (user?.user_metadata?.['full_name'] as string | undefined) ?? user?.email

  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-brand">
          <span className="logo">🦉</span>
          <span>Owl Jeopardy</span>
        </Link>
        <nav className="app-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/banks">Question Banks</NavLink>
          <NavLink to="/games">Games</NavLink>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{ width: 28, height: 28, borderRadius: '50%' }}
            />
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{displayName}</span>
          <button className="btn small ghost" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
