import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Concept', href: '#concept' },
  { label: 'Supports', href: '#supports' },
  { label: 'Process', href: '#process' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-[#1A1A1A]/[0.06] dark:border-white/[0.06] bg-white/70 dark:bg-[#0A0A0A]/70 backdrop-blur-2xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="text-[15px] font-bold uppercase tracking-wide text-[#1A1A1A] dark:text-white">
            OOH MY AD !
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-[13px] text-[#1A1A1A]/50 dark:text-white/50 transition-colors hover:text-[#1A1A1A] dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <a
              href="#contact"
              className="rounded-full bg-[#F5C400] px-5 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_20px_rgba(245,196,0,0.25)]"
            >
              Lancer une campagne
            </a>
          </div>

          <button
            className="text-[#1A1A1A]/70 dark:text-white/70 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile — plein écran dark, gros liens centrés */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-[#0A0A0A]">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-[15px] font-bold uppercase tracking-wide text-[#1A1A1A] dark:text-white">OOH MY AD !</span>
            <button onClick={() => setMobileOpen(false)} aria-label="Fermer" className="text-[#1A1A1A] dark:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-2xl font-medium text-[#1A1A1A]/50 dark:text-white/50 transition-colors hover:text-[#1A1A1A] dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="mt-4 rounded-full bg-[#F5C400] px-8 py-3 text-[15px] font-medium text-[#0A0A0A]"
            >
              Lancer une campagne
            </a>
          </div>
        </div>
      )}
    </>
  )
}
