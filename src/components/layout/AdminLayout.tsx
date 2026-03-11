import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  PanelTop,
  Megaphone,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/app.store'

const sidebarItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/map', icon: MapPin, label: 'Carte' },
  { to: '/admin/panels', icon: PanelTop, label: 'Panneaux' },
  { to: '/admin/campaigns', icon: Megaphone, label: 'Campagnes' },
  { to: '/admin/reports', icon: BarChart3, label: 'Rapports' },
]

export function AdminLayout() {
  const { signOut, profile } = useAuth()
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <h1 className="text-lg font-bold">OOHMYSCAN</h1>
          <button onClick={toggleSidebar} className="lg:hidden" aria-label="Fermer le menu latéral">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {sidebarItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => useAppStore.setState({ sidebarOpen: false })}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium">{profile?.full_name}</p>
            <p className="text-muted-foreground">Admin</p>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border px-6 lg:px-8">
          <button onClick={toggleSidebar} className="lg:hidden" aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
