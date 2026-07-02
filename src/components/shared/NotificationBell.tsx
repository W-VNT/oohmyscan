import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useUnreadCount } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  /** Route de destination. Par défaut /admin/notifications pour admin, /app/notifications pour operateur. */
  to?: string
  className?: string
}

export function NotificationBell({ to, className }: NotificationBellProps) {
  const unread = useUnreadCount()
  const { isAdmin } = useAuth()
  const target = to ?? (isAdmin ? '/admin/notifications' : '/app/notifications')

  return (
    <Link
      to={target}
      aria-label={unread > 0 ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
      className={cn(
        'relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Bell className="size-4" />
      {unread > 0 && (
        <span
          className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
          style={{ height: '16px' }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
