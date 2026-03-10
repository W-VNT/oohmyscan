import { useEffect } from 'react'
import { create } from 'zustand'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastStore {
  toasts: ToastItem[]
  add: (message: string, type?: 'success' | 'error') => void
  remove: (id: string) => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'success') => {
    const id = Date.now().toString()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message: string, type: 'success' | 'error' = 'success') {
  useToast.getState().add(message, type)
}

export function ToastContainer() {
  const { toasts, remove } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-2 sm:bottom-8 sm:left-auto sm:right-8 sm:w-80">
      {toasts.map((t) => (
        <ToastNotification key={t.id} toast={t} onDismiss={() => remove(t.id)} />
      ))}
    </div>
  )
}

function ToastNotification({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-card-foreground shadow-lg animate-in slide-in-from-bottom-2',
        t.type === 'error' && 'border-destructive/20'
      )}
    >
      {t.type === 'success' ? (
        <CheckCircle className="size-4 shrink-0 text-emerald-500" />
      ) : (
        <AlertCircle className="size-4 shrink-0 text-destructive" />
      )}
      <p className="flex-1 text-[13px]">{t.message}</p>
      <button onClick={onDismiss} className="shrink-0 rounded-md p-0.5 hover:bg-muted">
        <X className="size-3.5 text-muted-foreground" />
      </button>
    </div>
  )
}
