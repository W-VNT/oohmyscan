import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Bell, CheckCheck, AlertTriangle, Megaphone, FileCheck, Loader2 } from 'lucide-react'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useUnreadCount,
  type Notification,
} from '@/hooks/useNotifications'
import { EmptyState } from '@/components/shared/EmptyState'

/**
 * Page notifications partagée admin + operator. Le layout parent choisit
 * la route (/admin/notifications ou /app/notifications).
 * - Liste avec badge non lu par ligne
 * - Bouton "Tout marquer lu"
 * - Tap sur une notif = mark as read + navigate au link si présent
 */

function iconForType(type: string) {
  switch (type) {
    case 'panel_report':
      return AlertTriangle
    case 'campaign_assigned':
      return Megaphone
    case 'contract_signed':
      return FileCheck
    default:
      return Bell
  }
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { data: notifications, isLoading } = useNotifications()
  const unreadCount = useUnreadCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  function handleClick(n: Notification) {
    if (!n.read) markRead.mutate(n.id)
    if (n.link) {
      navigate(n.link)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="rounded-md p-1 hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="flex-1 text-[15px] font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-primary hover:bg-muted disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" />
            Tout lu
          </button>
        )}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !notifications?.length ? (
          <EmptyState
            icon={Bell}
            title="Aucune notification"
            description="Tu verras ici les signalements, assignations et autres évènements importants."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = iconForType(n.type)
              const isUnread = !n.read
              const content = (
                <div className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                  isUnread
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-card'
                }`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    n.type === 'panel_report' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                  }`}>
                    <Icon className={`size-4 ${
                      n.type === 'panel_report' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {n.body}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              )
              if (n.link) {
                return (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className="block"
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="block w-full text-left"
                >
                  {content}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
