import { useState } from 'react'
import { useHotkeys } from '@/hooks/useHotkeys'

/** Small keyboard shortcut badge (like Linear) */
export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  )
}

/** Global shortcut help modal — triggered by ? key */
export function ShortcutHelpProvider() {
  const [open, setOpen] = useState(false)

  useHotkeys({
    '?': () => setOpen(true),
    Escape: () => setOpen(false),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Raccourcis clavier</h2>
          <Kbd>?</Kbd>
        </div>

        <div className="space-y-4">
          <ShortcutSection title="Navigation">
            <ShortcutRow keys="/" description="Rechercher" />
            <ShortcutRow keys="Esc" description="Fermer / Annuler" />
          </ShortcutSection>

          <ShortcutSection title="Actions (pages liste)">
            <ShortcutRow keys="C" description="Créer un nouveau" />
            <ShortcutRow keys="N" description="Créer un nouveau (alias)" />
          </ShortcutSection>

          <ShortcutSection title="Devis / Factures">
            <ShortcutRow keys="E" description="Envoyer" />
            <ShortcutRow keys="D" description="Dupliquer" />
            <ShortcutRow keys="P" description="Aperçu PDF" />
          </ShortcutSection>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Les raccourcis sont désactivés quand un champ de saisie est actif.
        </p>
      </div>
    </div>
  )
}

function ShortcutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
      <span>{description}</span>
      <Kbd>{keys}</Kbd>
    </div>
  )
}
