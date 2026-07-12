import { Navigate, Route, Routes } from 'react-router-dom'
import { type ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BanksPage from './pages/BanksPage'
import BankEditorPage from './pages/BankEditorPage'
import GamesPage from './pages/GamesPage'
import GameSetupPage from './pages/GameSetupPage'
import GamePlayPage from './pages/GamePlayPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="banks" element={<BanksPage />} />
        <Route path="banks/:bankId" element={<BankEditorPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/new" element={<GameSetupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Play screen is full-bleed, outside the standard layout container. */}
      <Route
        path="play/:gameId"
        element={
          <RequireAuth>
            <GamePlayPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
