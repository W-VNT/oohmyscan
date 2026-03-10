import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center">
        <p className="text-5xl font-semibold tracking-tight text-muted-foreground/50">404</p>
        <h1 className="mt-3 text-base font-semibold">Page introuvable</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link to="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6 gap-2')}>
          <ArrowLeft className="size-3.5" />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
