import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SchedulePage } from './routes/SchedulePage'
import { PersonSchedulePage } from './routes/PersonSchedulePage'
import { AdminPage } from './routes/AdminPage'
import { LoginPage } from './routes/LoginPage'
import { SetupPage } from './routes/SetupPage'
import { LinkAccountPage } from './routes/LinkAccountPage'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const loading = authLoading || (!!session && profileLoading)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (session && (!profile || !profile.household_id)) {
    const personId = session.user?.user_metadata?.person_id as string | undefined
    if (personId) {
      return <Navigate to={`/link-account?person_id=${personId}`} replace />
    }
    return <SetupPage />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/link-account" element={<LinkAccountPage />} />
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
