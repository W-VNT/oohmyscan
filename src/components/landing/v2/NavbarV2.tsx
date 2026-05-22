import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { useScrollLock } from '@/hooks/useScrollLock'

const NAV_LINKS = [
  { label: 'Nos solutions', href: '#solutions' },
  { label: 'Comment ca marche', href: '#process' },
  { label: 'Contact', href: '#contact' },
]

export function NavbarV2() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useScrollLock(mobileOpen)

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/[0.08] bg-[#111111]'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="#"
            className="font-v2-display text-[16px] font-black uppercase tracking-wide text-[#F4C400]"
          >
            OOH MY AD !
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 font-v2-body text-[13px] font-medium text-white/60 transition-colors hover:text-[#F4C400]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <a
              href="#contact"
              className="font-v2-body bg-[#F4C400] px-6 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#111111] rounded border-2 border-[#F4C400] transition-all hover:bg-transparent hover:text-[#F4C400]"
            >
              Lancer une campagne
            </a>
          </div>

          <button
            className="text-white/70 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile — plein écran noir, gros liens centrés */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#111111]">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="font-v2-display text-[16px] font-black uppercase tracking-wide text-[#F4C400]">
              OOH MY AD !
            </span>
            <button onClick={() => setMobileOpen(false)} aria-label="Fermer" className="text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-v2-body text-2xl font-medium text-white/60 transition-colors hover:text-[#F4C400]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="font-v2-body mt-4 bg-[#F4C400] px-8 py-3 text-[15px] font-extrabold uppercase tracking-[0.08em] text-[#111111] rounded border-2 border-[#F4C400] transition-all hover:bg-transparent hover:text-[#F4C400]"
            >
              Lancer une campagne
            </a>
          </div>
        </div>
      )}
    </>
  )
}
