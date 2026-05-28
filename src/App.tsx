import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import BanksPage from './pages/BanksPage'
import BankEditorPage from './pages/BankEditorPage'
import GamesPage from './pages/GamesPage'
import GameSetupPage from './pages/GameSetupPage'
import GamePlayPage from './pages/GamePlayPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="banks" element={<BanksPage />} />
        <Route path="banks/:bankId" element={<BankEditorPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/new" element={<GameSetupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Play screen is full-bleed, outside the standard layout container. */}
      <Route path="play/:gameId" element={<GamePlayPage />} />
    </Routes>
  )
}
