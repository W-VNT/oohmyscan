import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Info } from 'lucide-react'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Hook impératif pour remplacer window.confirm().
 *
 * Usage :
 *   const confirm = useConfirm()
 *   const ok = await confirm({
 *     title: 'Supprimer le panneau ?',
 *     description: 'Cette action est irréversible.',
 *     confirmLabel: 'Supprimer',
 *     variant: 'destructive',
 *   })
 *   if (!ok) return
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm doit être utilisé dans un ConfirmDialogProvider')
  return ctx
}

interface PendingState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise((resolve) => {
      setPending({ ...opts, resolve })
    })
  }, [])

  function close(result: boolean) {
    pending?.resolve(result)
    setPending(null)
  }

  const isDestructive = pending?.variant === 'destructive'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => close(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close(false)
            if (e.key === 'Enter') close(true)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-background p-5 shadow-xl sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  isDestructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                }`}
              >
                {isDestructive ? <AlertTriangle className="size-5" /> : <Info className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="text-base font-semibold">
                  {pending.title}
                </h2>
                {pending.description && (
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {pending.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => close(false)}
                className="sm:flex-none"
              >
                {pending.cancelLabel ?? 'Annuler'}
              </Button>
              <Button
                ref={confirmBtnRef}
                size="sm"
                variant={isDestructive ? 'destructive' : 'default'}
                onClick={() => close(true)}
                autoFocus
                className="sm:flex-none"
              >
                {pending.confirmLabel ?? 'Confirmer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
