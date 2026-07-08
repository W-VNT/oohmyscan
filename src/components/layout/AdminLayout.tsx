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
  Menu,
  X,
  Building2,
  Smartphone,
  SearchCheck,
  Landmark,
  Inbox,
  AlertCircle,
} from 'lucide-react'
import { useUnresolvedErrorCount } from '@/hooks/admin/useErrorLogs'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/app.store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ShortcutHelpProvider } from '@/components/shared/KeyboardShortcuts'
import { NotificationBell } from '@/components/shared/NotificationBell'

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/map': 'Carte',
  '/admin/panels': 'Panneaux',
  '/admin/locations': 'Lieux',
  '/admin/campaigns': 'Campagnes',
  '/admin/clients': 'Clients',
  '/admin/leads': 'Leads',
  '/admin/quotes': 'Devis',
  '/admin/invoices': 'Factures',
  '/admin/qr': 'QR Codes',
  '/admin/users': 'Utilisateurs',
  '/admin/potential': 'Potentiel',
  '/admin/reports': 'Rapports',
  '/admin/logs': "Journal d'erreurs",
  '/admin/profile': 'Profil',
  '/admin/settings': 'Paramètres',
}

const navSections = [
  {
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/admin/leads', icon: Inbox, label: 'Leads' },
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
      { to: '/admin/logs', icon: AlertCircle, label: "Journal d'erreurs" },
      { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
]

export function AdminLayout() {
  const { profile } = useAuth()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const { pathname } = useLocation()
  const { data: unresolvedCount = 0 } = useUnresolvedErrorCount()

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
    pathname.match(/^\/admin\/campaigns\/[^/]+\/report$/) ? 'Rapport campagne' :
    pathname.startsWith('/admin/panels/') ? 'Détail panneau' :
    pathname.startsWith('/admin/campaigns/') ? 'Détail campagne' :
    pathname.startsWith('/admin/quotes/') ? 'Détail devis' :
    pathname.startsWith('/admin/invoices/') ? 'Détail facture' :
    pathname.startsWith('/admin/potential/') ? 'Demande de potentiel' :
    pathname.startsWith('/admin/reports/') ? 'Justificatif de pose' :
    ''
  )

  // Pages "fullscreen" : retirent le padding du <main> pour utiliser tout l'espace
  const isFullscreen = !!pathname.match(/^\/admin\/campaigns\/[^/]+\/report$/)

  return (
    <div className="flex h-screen bg-background pt-[env(safe-area-inset-top)]">
      {/* Sidebar — full-width sur mobile (pattern PWA modern), 240px sur desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r border-border bg-card pt-[env(safe-area-inset-top)] transition-transform lg:static lg:w-60 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <span className="font-['Poppins'] font-black text-[15px] uppercase tracking-[0.02em] leading-none">OOH MY AD !</span>
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
                {section.items.map(({ to, icon: Icon, label, end }) => {
                  const isLogs = to === '/admin/logs'
                  const badgeCount = isLogs ? unresolvedCount : 0
                  return (
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
                      <span className="flex-1">{label}</span>
                      {badgeCount > 0 && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
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
          <NotificationBell to="/admin/notifications" />
        </header>
        <main className={cn('flex-1 overflow-hidden', isFullscreen ? 'p-0' : 'overflow-y-auto p-6')}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ShortcutHelpProvider />
    </div>
  )
}
