import { Menu } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'

/**
 * DropdownMenu — wrapper base-ui pour les menus contextuels type kebab.
 * Bien geree hors du flow (portal), avec flip auto quand le popup deborde
 * du viewport (fix du bug OM+ ou le popover se faisait couper en bas de
 * la table admin).
 *
 * Usage :
 *   <DropdownMenu>
 *     <DropdownMenuTrigger><MoreHorizontal /></DropdownMenuTrigger>
 *     <DropdownMenuContent align="end">
 *       <DropdownMenuItem onClick={...}>Item 1</DropdownMenuItem>
 *       <DropdownMenuSeparator />
 *       <DropdownMenuItem variant="destructive" onClick={...}>Supprimer</DropdownMenuItem>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 */

function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />
}

function DropdownMenuTrigger(props: Menu.Trigger.Props) {
  return <Menu.Trigger {...props} />
}

interface DropdownMenuContentProps extends Menu.Popup.Props {
  /** Alignement horizontal par rapport au trigger. Defaut : "end" (bord droit). */
  align?: 'start' | 'center' | 'end'
  /** Cote d'apparition. Defaut : "bottom". Le composant flip auto si pas de place. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Distance en px entre le trigger et le popup. Defaut : 6. */
  sideOffset?: number
}

function DropdownMenuContent({
  children,
  className,
  align = 'end',
  side = 'bottom',
  sideOffset = 6,
  ...props
}: DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50 outline-none">
        <Menu.Popup
          className={cn(
            'min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg outline-none',
            'transition-[transform,opacity] duration-150',
            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

interface DropdownMenuItemProps extends Menu.Item.Props {
  /** Rouge pour actions destructives (suppression, etc.). */
  variant?: 'default' | 'destructive'
}

function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: DropdownMenuItemProps) {
  return (
    <Menu.Item
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none',
        'data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        variant === 'destructive' &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="separator"
      className={cn('my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
