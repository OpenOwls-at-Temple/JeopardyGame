import { NavLink, Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-brand">
          <span className="logo">🦉</span>
          <span>Owl Jeopardy</span>
        </Link>
        <nav className="app-nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/banks">Question Banks</NavLink>
          <NavLink to="/games">Games</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
