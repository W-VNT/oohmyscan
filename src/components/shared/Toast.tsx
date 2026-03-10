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
        <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2',
        t.type === 'success'
          ? 'border-green-500/20 bg-green-500/10 text-green-600'
          : 'border-red-500/20 bg-red-500/10 text-red-600'
      )}
    >
      {t.type === 'success' ? (
        <CheckCircle className="h-5 w-5 shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0" />
      )}
      <p className="flex-1 text-sm font-medium">{t.message}</p>
      <button onClick={onDismiss} className="shrink-0">
        <X className="h-4 w-4 opacity-60" />
      </button>
    </div>
  )
}
