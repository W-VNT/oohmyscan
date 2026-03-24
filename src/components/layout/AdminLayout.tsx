import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  PanelTop,
  Megaphone,
  Users,
  FileText,
  Receipt,
  QrCode,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Smartphone,
  SearchCheck,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/app.store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ShortcutHelpProvider } from '@/components/shared/KeyboardShortcuts'

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/map': 'Carte',
  '/admin/panels': 'Panneaux',
  '/admin/locations': 'Lieux',
  '/admin/campaigns': 'Campagnes',
  '/admin/clients': 'Clients',
  '/admin/quotes': 'Devis',
  '/admin/invoices': 'Factures',
  '/admin/qr': 'QR Codes',
  '/admin/users': 'Utilisateurs',
  '/admin/potential': 'Potentiel',
  '/admin/reports': 'Rapports',
  '/admin/profile': 'Profil',
  '/admin/settings': 'Paramètres',
}

const navSections = [
  {
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/admin/map', icon: MapPin, label: 'Carte' },
    ],
  },
  {
    items: [
      { to: '/admin/panels', icon: PanelTop, label: 'Panneaux' },
      { to: '/admin/locations', icon: Landmark, label: 'Lieux' },
      { to: '/admin/campaigns', icon: Megaphone, label: 'Campagnes' },
      { to: '/admin/clients', icon: Building2, label: 'Clients' },
    ],
  },
  {
    items: [
      { to: '/admin/potential', icon: SearchCheck, label: 'Potentiel' },
    ],
  },
  {
    items: [
      { to: '/admin/quotes', icon: FileText, label: 'Devis' },
      { to: '/admin/invoices', icon: Receipt, label: 'Factures' },
    ],
  },
  {
    items: [
      { to: '/admin/qr', icon: QrCode, label: 'QR Codes' },
      { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { to: '/admin/reports', icon: BarChart3, label: 'Rapports' },
    ],
  },
  {
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
]

export function AdminLayout() {
  const { signOut, profile } = useAuth()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const { pathname } = useLocation()

  const { data: avatarUrl } = useQuery({
    queryKey: ['avatar-url', profile?.avatar_url],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile!.avatar_url!, 3600)
      if (error) throw error
      return data.signedUrl
    },
    enabled: !!profile?.avatar_url,
    staleTime: 30 * 60 * 1000,
  })

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Match exact path or parent path for detail pages
  const pageTitle = PAGE_TITLES[pathname] ?? (
    pathname.startsWith('/admin/panels/') ? 'Détail panneau' :
    pathname.startsWith('/admin/campaigns/') ? 'Détail campagne' :
    pathname.startsWith('/admin/quotes/') ? 'Détail devis' :
    pathname.startsWith('/admin/invoices/') ? 'Détail facture' :
    pathname.startsWith('/admin/potential/') ? 'Demande de potentiel' :
    pathname.startsWith('/admin/reports/') ? 'Justificatif de pose' :
    ''
  )

  return (
    <div className="flex h-screen bg-background pt-[env(safe-area-inset-top)]">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card pt-[env(safe-area-inset-top)] transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <span className="text-[15px] font-bold tracking-tight">OOH MY AD !</span>
          <button onClick={toggleSidebar} className="lg:hidden" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {sIdx > 0 && <div className="my-2 border-t border-border" />}
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => useAppStore.setState({ sidebarOpen: false })}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )
                    }
                  >
                    <Icon className="size-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User + actions */}
        <div className="border-t border-border px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <NavLink
            to="/admin/profile"
            onClick={() => useAppStore.setState({ sidebarOpen: false })}
            className="mb-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-muted"
          >
            <Avatar size="sm">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
              <AvatarFallback className="text-[10px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{profile?.full_name}</p>
              <p className="text-[11px] text-muted-foreground">Administrateur</p>
            </div>
          </NavLink>
          <NavLink
            to="/app/dashboard"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Smartphone className="size-4" />
            Mode terrain
          </NavLink>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
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
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-6">
          <button onClick={toggleSidebar} className="lg:hidden" aria-label="Menu">
            <Menu className="size-5" />
          </button>
          {pageTitle && <h2 className="text-sm font-semibold">{pageTitle}</h2>}
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ShortcutHelpProvider />
    </div>
  )
}
