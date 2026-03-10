import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MapPin, ScanLine, PanelTop, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium tracking-wide transition-colors',
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
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-lg items-center">
        {leftItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* Central scan button */}
        <div className="flex flex-1 items-center justify-center">
          <NavLink
            to="/scan"
            className={({ isActive }) =>
              cn(
                '-mt-6 flex size-12 items-center justify-center rounded-full border transition-all active:scale-95',
                isActive
                  ? 'border-foreground/20 bg-foreground text-background shadow-lg'
                  : 'border-border bg-card text-foreground shadow-md hover:shadow-lg'
              )
            }
          >
            <ScanLine className="size-5" strokeWidth={1.5} />
          </NavLink>
        </div>

        {rightItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  )
}
