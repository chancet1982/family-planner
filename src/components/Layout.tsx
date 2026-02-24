import { Outlet, NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <nav className="flex items-center gap-4" aria-label="Main">
          <NavLink
            to="/schedule"
            className={({ isActive }) =>
              cn(
                'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md px-4 font-medium transition-all duration-200',
                isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            Schedule
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md px-4 font-medium transition-all duration-200',
                isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            Admin
          </NavLink>
        </nav>
        <Button
          type="button"
          variant="ghost"
          className="min-h-[44px] px-4"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </Button>
      </header>
      <main className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
