import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, Shield, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { profile, signOut, isAdmin } = useAuth()

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6 p-4 pb-20">
      <h1 className="text-lg font-semibold tracking-tight">Profil</h1>

      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.full_name ?? '—'}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="size-3" />
                <span>{profile?.role === 'admin' ? 'Administrateur' : 'Opérateur'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {profile?.phone && (
        <Card>
          <CardContent>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Téléphone</p>
            <p className="mt-1 text-sm">{profile.phone}</p>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <>
          <Separator />
          <a href="/admin" className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')}>
            Panneau admin
            <ChevronRight className="size-4 text-muted-foreground" />
          </a>
        </>
      )}

      <Separator />

      <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
        <LogOut className="size-4" />
        Se déconnecter
      </Button>
    </div>
  )
}
