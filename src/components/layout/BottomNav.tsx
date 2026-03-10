import { NavLink } from 'react-router-dom'
import { ScanLine, ClipboardList, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/scan', icon: ScanLine, label: 'Scanner' },
  { to: '/panels', icon: ClipboardList, label: 'Panneaux' },
  { to: '/map', icon: MapPin, label: 'Carte' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
