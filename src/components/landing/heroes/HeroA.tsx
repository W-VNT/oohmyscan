import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

/** Version A — Cinématique : clip-path text reveal + parallax image */
export function HeroA() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.55, 0.85])
  const [showScroll, setShowScroll] = useState(true)

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY < 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Word-by-word reveal animation
  const title1Words = ['VOTRE', 'PUB', 'LÀ', 'OÙ']
  const title2Words = ['LES', 'GENS', "S'ARRÊTENT."]

  return (
    <section ref={ref} className="relative flex min-h-screen items-end overflow-hidden bg-[#0A0A0A] pb-24 pt-32 md:items-center md:pb-0 md:pt-0">
      {/* Parallax background */}
      <motion.div
        style={{ y: imageY, scale: imageScale }}
        className="absolute inset-0"
      >
        <img
          src="/images/supports/hero.png"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
        />
      </motion.div>

      {/* Dynamic overlay */}
      <motion.div
        style={{ opacity: overlayOpacity }}
        className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-[#0A0A0A]/20"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Title with clip-path word reveal */}
        <h1 className="font-['Bebas_Neue'] text-[clamp(56px,8vw,120px)] leading-[0.95] text-white">
          <span className="flex flex-wrap gap-x-[0.25em]">
            {title1Words.map((word, i) => (
              <span key={i} className="overflow-hidden">
                <motion.span
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3 + i * 0.1,
                    ease: [0.33, 1, 0.68, 1],
                  }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </span>
          <span className="flex flex-wrap gap-x-[0.25em]">
            {title2Words.map((word, i) => (
              <span key={i} className="overflow-hidden">
                <motion.span
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  transition={{
                    duration: 0.8,
                    delay: 0.7 + i * 0.1,
                    ease: [0.33, 1, 0.68, 1],
                  }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: 'easeOut' }}
          className="mt-6 max-w-xl text-lg text-[#888888]"
        >
          Taxi, table, boulangerie, pharmacie.
          <br />
          Des supports de proximité captifs, déployés partout en France.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5, ease: 'easeOut' }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <a
            href="#supports"
            className="group relative overflow-hidden rounded-md bg-[#F5C400] px-7 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-all hover:shadow-[0_0_30px_rgba(245,196,0,0.3)]"
          >
            <span className="relative z-10">Découvrir nos supports →</span>
            <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
          </a>
          <a
            href="#contact"
            className="rounded-md border border-[#F5F5F5]/30 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-white hover:bg-white/10"
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
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        >
          <ChevronDown className="h-6 w-6 animate-bounce text-white/50" />
        </motion.div>
      )}
    </section>
  )
}
