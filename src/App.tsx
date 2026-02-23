import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SchedulePage } from './routes/SchedulePage'
import { PersonSchedulePage } from './routes/PersonSchedulePage'
import { AdminPage } from './routes/AdminPage'
import { LoginPage } from './routes/LoginPage'
import { SetupPage } from './routes/SetupPage'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const loading = authLoading || (!!session && profileLoading)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Loading…
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (session && (!profile || !profile.household_id)) {
    return <SetupPage />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/schedule" replace />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="schedule/daily" element={<Navigate to="/schedule?view=day" replace />} />
        <Route path="schedule/person/:personId" element={<PersonSchedulePage />} />
        <Route path="admin/*" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/schedule" replace />} />
    </Routes>
  )
}
