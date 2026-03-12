import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

/** Version B — Énergie urbaine : marquee bandeau + titre avec lettres animées */
export function HeroB() {
  const [showScroll, setShowScroll] = useState(true)

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY < 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const marqueeText = 'TAXI • BOULANGERIE • PHARMACIE • RESTAURANT • BAR • CAFÉ • PRESSING • '

  return (
    <section className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-[#0A0A0A] pb-0">
      {/* Background image with zoom-in on load */}
      <motion.div
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2, ease: [0.33, 1, 0.68, 1] }}
        className="absolute inset-0"
      >
        <img
          src="/images/supports/hero.png"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
        />
      </motion.div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-8">
        {/* Main title — letter stagger */}
        <div className="overflow-hidden">
          <motion.h1
            className="font-['Bebas_Neue'] text-[clamp(64px,10vw,140px)] leading-[0.9] text-white"
          >
            {'VOTRE PUB'.split('').map((char, i) => (
              <motion.span
                key={`l1-${i}`}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + i * 0.03,
                  ease: [0.33, 1, 0.68, 1],
                }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
            <br />
            {'LÀ OÙ LES GENS'.split('').map((char, i) => (
              <motion.span
                key={`l2-${i}`}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.5 + i * 0.025,
                  ease: [0.33, 1, 0.68, 1],
                }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
            <br />
            {"S'ARRÊTENT.".split('').map((char, i) => (
              <motion.span
                key={`l3-${i}`}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: char === '.' ? 0 : 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.9 + i * 0.03,
                  ease: [0.33, 1, 0.68, 1],
                }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
            {/* Animated dot in accent color */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 1.5, type: 'spring', stiffness: 300 }}
              className="inline-block text-[#F5C400]"
            >
              .
            </motion.span>
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="mt-8 flex flex-wrap gap-4"
        >
          <a
            href="#supports"
            className="rounded-md bg-[#F5C400] px-7 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-all hover:bg-[#F5C400]/90 hover:shadow-[0_0_40px_rgba(245,196,0,0.4)]"
          >
            Découvrir nos supports →
          </a>
          <a
            href="#contact"
            className="rounded-md border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-white hover:bg-white/10"
          >
            Lancer une campagne
          </a>
        </motion.div>
      </div>

      {/* Marquee bandeau */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="relative z-10 overflow-hidden border-t border-white/5 bg-[#0A0A0A]/80 py-4 backdrop-blur-sm"
      >
        <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap">
          <span className="font-['Bebas_Neue'] text-2xl tracking-[0.2em] text-white/15 md:text-4xl">
            {marqueeText.repeat(4)}
          </span>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      {showScroll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2"
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/30 p-1.5">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-1 rounded-full bg-white/60"
            />
          </div>
        </motion.div>
      )}
    </section>
  )
}
