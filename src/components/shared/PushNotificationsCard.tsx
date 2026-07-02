import { Bell, BellOff, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/**
 * Card d'activation des notifications push (Web Push).
 * À placer dans le profil de l'utilisateur (op ou admin).
 *
 * Etats :
 *  - unsupported : navigateur/PWA sans push support (iOS <16.4, non-standalone)
 *  - permission=default + non abonné : bouton "Activer les notifications"
 *  - permission=granted + abonné : bouton "Désactiver"
 *  - permission=denied : message explicatif, l'utilisateur doit réactiver depuis les paramètres système
 */
export function PushNotificationsCard() {
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe } =
    usePushNotifications()

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {subscribed ? (
              <Bell className="size-3.5 text-emerald-600" />
            ) : (
              <BellOff className="size-3.5 text-muted-foreground" />
            )}
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Notifications
            </p>
          </div>
          {subscribed && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
              Actives
            </span>
          )}
        </div>

        {!supported ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2.5">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-orange-600" />
            <p className="text-[11px] text-orange-700 dark:text-orange-400">
              Non supporté ici. Sur iOS, il faut installer la PWA à l'écran d'accueil (iOS ≥ 16.4).
            </p>
          </div>
        ) : permission === 'denied' ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2.5">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-orange-600" />
            <p className="text-[11px] text-orange-700 dark:text-orange-400">
              Permission refusée. Réactive-la dans les Réglages iPhone → OOHMYSCAN → Notifications.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Recevez une notification système lors d'un nouveau signalement, d'une assignation ou d'un contrat signé.
            </p>
            <div className="mt-3">
              {subscribed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unsubscribe}
                  disabled={loading}
                  className="w-full gap-1.5"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  <BellOff className="size-3.5" />
                  Désactiver les notifications
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={subscribe}
                  disabled={loading}
                  className="w-full gap-1.5"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  <Bell className="size-3.5" />
                  Activer les notifications
                </Button>
              )}
            </div>
            {error && (
              <p className="mt-2 text-[11px] text-destructive">{error}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
