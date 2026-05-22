const LEGAL_LINKS = [
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'Politique de confidentialité', href: '/confidentialite' },
  { label: 'CGV', href: '/cgv' },
]

export function FooterV2() {
  return (
    <footer className="bg-[#111111] border-t border-white/[0.06] py-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="font-v2-display text-[16px] font-black uppercase tracking-wide text-[#F4C400]">
              OOH MY AD !
            </span>
            <span className="hidden text-white/10 md:inline">·</span>
            <span className="font-v2-body hidden text-[13px] text-white/50 md:inline">
              Communication urbaine de proximité
            </span>
          </div>

          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-v2-body text-[12px] text-white/40 transition-colors hover:text-[#F4C400]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <p className="font-v2-body mt-6 text-center text-[11px] text-white/30 md:text-left">
          © {new Date().getFullYear()} OOH MY AD ! — Tous droits réservés
        </p>
      </div>
    </footer>
  )
}
