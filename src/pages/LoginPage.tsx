import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, loading, signIn } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 24,
    }}>
      <span style={{ fontSize: 64 }}>🦉</span>
      <h1 style={{ margin: 0 }}>Owl Jeopardy</h1>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        Sign in to manage your question banks and games.
      </p>
      <button
        className="btn"
        style={{ padding: '12px 28px', fontSize: 16 }}
        onClick={() => void signIn()}
      >
        Sign in with Google
      </button>
    </div>
  )
}
