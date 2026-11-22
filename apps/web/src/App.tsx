import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

const HomePage = lazy(() => import('./pages/HomePage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const AnimeDetailPage = lazy(() => import('./pages/AnimeDetailPage'))
const TopPage = lazy(() => import('./pages/TopPage'))
const SeasonPage = lazy(() => import('./pages/SeasonPage'))
const GenresPage = lazy(() => import('./pages/GenresPage'))
const GenreDetailPage = lazy(() => import('./pages/GenreDetailPage'))
const StudioDetailPage = lazy(() => import('./pages/StudioDetailPage'))
const AiringPage = lazy(() => import('./pages/AiringPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MyRatingsPage = lazy(() => import('./pages/MyRatingsPage'))
const MyReviewsPage = lazy(() => import('./pages/MyReviewsPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const RoulettePage = lazy(() => import('./pages/RoulettePage'))
const TierListPage = lazy(() => import('./pages/TierListPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function PageFallback() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      style={{
        display: 'flex',
        minHeight: '40vh',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span>Loading...</span>
    </div>
  )
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={withSuspense(<HomePage />)} />
        <Route path="/explore" element={withSuspense(<ExplorePage />)} />
        <Route path="/anime/:id" element={withSuspense(<AnimeDetailPage />)} />
        <Route path="/compare" element={withSuspense(<ComparePage />)} />
        <Route path="/roulette" element={withSuspense(<RoulettePage />)} />
        <Route path="/tier-list" element={withSuspense(<TierListPage />)} />
        <Route path="/top" element={withSuspense(<TopPage />)} />
        <Route path="/season" element={withSuspense(<SeasonPage />)} />
        <Route path="/genres" element={withSuspense(<GenresPage />)} />
        <Route path="/genres/:slug" element={withSuspense(<GenreDetailPage />)} />
        <Route path="/studios/:slug" element={withSuspense(<StudioDetailPage />)} />
        <Route path="/airing" element={withSuspense(<AiringPage />)} />
        <Route path="/login" element={withSuspense(<LoginPage />)} />
        <Route path="/register" element={withSuspense(<RegisterPage />)} />
        <Route path="/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
        <Route path="/reset-password" element={withSuspense(<ResetPasswordPage />)} />
        <Route
          path="/watchlist"
          element={withSuspense(
            <ProtectedRoute>
              <WatchlistPage />
            </ProtectedRoute>,
          )}
        />
        <Route
          path="/library"
          element={withSuspense(
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>,
          )}
        />
        <Route
          path="/statistics"
          element={withSuspense(
            <ProtectedRoute>
              <StatisticsPage />
            </ProtectedRoute>,
          )}
        />
        <Route
          path="/my-ratings"
          element={withSuspense(
            <ProtectedRoute>
              <MyRatingsPage />
            </ProtectedRoute>,
          )}
        />
        <Route
          path="/my-reviews"
          element={withSuspense(
            <ProtectedRoute>
              <MyReviewsPage />
            </ProtectedRoute>,
          )}
        />
        <Route path="/profile/:username" element={withSuspense(<ProfilePage />)} />
        <Route
          path="/settings"
          element={withSuspense(
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>,
          )}
        />
        <Route
          path="/admin"
          element={withSuspense(
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>,
          )}
        />
        <Route path="*" element={withSuspense(<NotFoundPage />)} />
      </Route>
    </Routes>
  )
}
