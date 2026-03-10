import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AdminPeople } from '../components/admin/AdminPeople'
import { AdminChores } from '../components/admin/AdminChores'
import { AdminActivities } from '../components/admin/AdminActivities'
import { AdminWFH } from '../components/admin/AdminWFH'
import { AdminSchoolRuns } from '../components/admin/AdminSchoolRuns'
import { AdminGymnastics } from '../components/admin/AdminGymnastics'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const adminTabs = [
  { to: '/admin/people', label: 'People' },
  { to: '/admin/chores', label: 'Chores' },
  { to: '/admin/activities', label: 'Activities' },
  { to: '/admin/gym', label: 'Gymnastics' },
  { to: '/admin/wfh', label: 'Work schedule' },
  { to: '/admin/school', label: 'School times' },
]

export function AdminPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-xl font-semibold text-foreground mb-4">Administration</h1>
      <Tabs value={pathname} onValueChange={(v) => navigate(v)}>
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1" aria-label="Admin sections">
          {adminTabs.map(({ to, label }) => (
            <TabsTrigger key={to} value={to}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Routes>
          <Route index element={<Navigate to="people" replace />} />
          <Route path="people" element={<AdminPeople />} />
          <Route path="chores" element={<AdminChores />} />
          <Route path="activities" element={<AdminActivities />} />
          <Route path="gym" element={<AdminGymnastics />} />
          <Route path="wfh" element={<AdminWFH />} />
          <Route path="school" element={<AdminSchoolRuns />} />
        </Routes>
      </Tabs>
    </div>
  )
}
