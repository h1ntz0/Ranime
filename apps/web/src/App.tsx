import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import AnimeDetailPage from './pages/AnimeDetailPage'
import TopPage from './pages/TopPage'
import SeasonPage from './pages/SeasonPage'
import GenresPage from './pages/GenresPage'
import GenreDetailPage from './pages/GenreDetailPage'
import AiringPage from './pages/AiringPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WatchlistPage from './pages/WatchlistPage'
import LibraryPage from './pages/LibraryPage'
import StatisticsPage from './pages/StatisticsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/anime/:id" element={<AnimeDetailPage />} />
        <Route path="/top" element={<TopPage />} />
        <Route path="/season" element={<SeasonPage />} />
        <Route path="/genres" element={<GenresPage />} />
        <Route path="/genres/:slug" element={<GenreDetailPage />} />
        <Route path="/airing" element={<AiringPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute>
              <WatchlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <StatisticsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
