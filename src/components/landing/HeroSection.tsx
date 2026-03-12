import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

export function HeroSection() {
  const [showScroll, setShowScroll] = useState(true)

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY < 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="relative flex min-h-screen items-end overflow-hidden bg-[#0A0A0A] pb-24 pt-32 md:items-center md:pb-0 md:pt-0">
      {/* Background image */}
      <img
        src="/images/supports/hero.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />

      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-[999] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="font-['Bebas_Neue'] text-[clamp(56px,8vw,120px)] leading-[0.95] text-white"
        >
          VOTRE PUB LÀ OÙ
          <br />
          LES GENS S'ARRÊTENT.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="mt-6 max-w-xl text-lg text-[#888888]"
        >
          Taxi, table, boulangerie, pharmacie.
          <br />
          Des supports de proximité captifs, déployés partout en France.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <a
            href="#supports"
            className="rounded-md bg-[#F5C400] px-7 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#F5C400]/90"
          >
            Découvrir nos supports →
          </a>
          <a
            href="#contact"
            className="rounded-md border border-[#F5F5F5]/30 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Lancer une campagne
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      {showScroll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        >
          <ChevronDown className="h-6 w-6 animate-bounce text-white/50" />
        </motion.div>
      )}
    </section>
  )
}
