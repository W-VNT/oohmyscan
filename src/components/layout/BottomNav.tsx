import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MapPin, ScanLine, PanelTop, User, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { ScanMissionSheet } from '@/components/shared/ScanMissionSheet'

const leftItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: MapPin, label: 'Carte' },
]

const rightItems = [
  { to: '/panels', icon: PanelTop, label: 'Panneaux' },
  { to: '/profile', icon: User, label: 'Profil' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] py-2 text-[10px] font-medium tracking-wide transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground/70'
        )
      }
    >
      <Icon className="size-[18px]" strokeWidth={1.5} />
      <span>{label}</span>
    </NavLink>
  )
}

export function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { isAdmin } = useAuth()

  return (
    <>
      {/* Admin back-office shortcut */}
      {isAdmin && (
        <NavLink
          to="/admin"
          className="fixed right-4 z-50 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-lg transition-all active:scale-95 hover:bg-muted hover:text-foreground"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <Monitor className="size-3.5" />
          Back-office
        </NavLink>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center">
          {leftItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          {/* Central scan button */}
          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Scanner"
              className="-mt-6 flex size-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all active:scale-95 hover:shadow-lg"
            >
              <ScanLine className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          {rightItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      <ScanMissionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
