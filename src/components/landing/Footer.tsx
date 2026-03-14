const LEGAL_LINKS = [
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'Politique de confidentialité', href: '/confidentialite' },
  { label: 'CGV', href: '/cgv' },
]

export function Footer() {
  return (
    <footer className="border-t border-[#1A1A1A]/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#0A0A0A] py-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold uppercase tracking-wide text-[#1A1A1A] dark:text-white">
              OOH MY AD !
            </span>
            <span className="hidden text-[#1A1A1A]/10 dark:text-white/10 md:inline">·</span>
            <span className="hidden text-[13px] text-[#1A1A1A]/25 dark:text-white/25 md:inline">
              Communication urbaine de proximité
            </span>
          </div>

          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[12px] text-[#1A1A1A]/15 dark:text-white/15 transition-colors hover:text-[#1A1A1A]/30 dark:hover:text-white/30"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#1A1A1A]/10 dark:text-white/10 md:text-left">
          © {new Date().getFullYear()} OOH MY AD ! — Tous droits réservés
        </p>
      </div>
    </footer>
  )
}
