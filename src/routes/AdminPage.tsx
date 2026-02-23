import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AdminPeople } from '../components/admin/AdminPeople'
import { AdminChores } from '../components/admin/AdminChores'
import { AdminActivities } from '../components/admin/AdminActivities'
import { AdminWFH } from '../components/admin/AdminWFH'
import { AdminSchoolRuns } from '../components/admin/AdminSchoolRuns'

const adminTabs = [
  { to: '/admin/people', label: 'People' },
  { to: '/admin/chores', label: 'Chores' },
  { to: '/admin/activities', label: 'Activities' },
  { to: '/admin/wfh', label: 'Work schedule' },
  { to: '/admin/school', label: 'School times' },
]

export function AdminPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Administration</h1>
      <nav className="flex flex-wrap gap-2 mb-6" aria-label="Admin sections">
        {adminTabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `min-h-[44px] flex items-center px-4 rounded-lg font-medium transition-colors ${
                isActive ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="people" replace />} />
        <Route path="people" element={<AdminPeople />} />
        <Route path="chores" element={<AdminChores />} />
        <Route path="activities" element={<AdminActivities />} />
        <Route path="wfh" element={<AdminWFH />} />
        <Route path="school" element={<AdminSchoolRuns />} />
      </Routes>
    </div>
  )
}
