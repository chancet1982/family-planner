import { Outlet, NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
        <nav className="flex items-center gap-4" aria-label="Main">
          <NavLink
            to="/schedule"
            className={({ isActive }) =>
              `min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg px-4 font-medium transition-colors ${
                isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Schedule
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg px-4 font-medium transition-colors ${
                isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Admin
          </NavLink>
        </nav>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="min-h-[44px] px-4 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
        >
          Sign out
        </button>
      </header>
      <main className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
