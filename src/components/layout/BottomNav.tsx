import { NavLink } from 'react-router-dom'
import { ClipboardList, MapPin, ScanLine, Activity, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const leftItems = [
  { to: '/panels', icon: ClipboardList, label: 'Panneaux' },
  { to: '/map', icon: MapPin, label: 'Carte' },
]

const rightItems = [
  { to: '/activity', icon: Activity, label: 'Activité' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around px-2">
        {/* Left 2 */}
        {leftItems.map(({ to, icon: Icon, label }) => (
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

        {/* Central scan button */}
        <NavLink
          to="/scan"
          className={({ isActive }) =>
            cn(
              'relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/90 text-primary-foreground hover:bg-primary'
            )
          }
        >
          <ScanLine className="h-6 w-6" />
        </NavLink>

        {/* Right 2 */}
        {rightItems.map(({ to, icon: Icon, label }) => (
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
