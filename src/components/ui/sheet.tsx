import { Dialog } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

function Sheet({ children, ...props }: Dialog.Root.Props) {
  return <Dialog.Root {...props}>{children}</Dialog.Root>
}

function SheetTrigger(props: Dialog.Trigger.Props) {
  return <Dialog.Trigger {...props} />
}

function SheetClose(props: Dialog.Close.Props) {
  return <Dialog.Close {...props} />
}

function SheetContent({
  children,
  className,
  side = 'right',
  ...props
}: Dialog.Popup.Props & { side?: 'left' | 'right' }) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop
        className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      />
      <Dialog.Popup
        className={cn(
          'fixed z-50 flex h-full w-full max-w-md flex-col gap-4 border-border bg-background p-6 shadow-lg transition-transform duration-300 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full',
          side === 'right' && 'inset-y-0 right-0 border-l',
          side === 'left' && 'inset-y-0 left-0 border-r data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full',
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="size-4" />
          <span className="sr-only">Fermer</span>
        </Dialog.Close>
      </Dialog.Popup>
    </Dialog.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col space-y-2', className)} {...props} />
}

function SheetTitle(props: Dialog.Title.Props) {
  return <Dialog.Title className="text-lg font-semibold" {...props} />
}

function SheetDescription(props: Dialog.Description.Props) {
  return <Dialog.Description className="text-sm text-muted-foreground" {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
