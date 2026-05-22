import { motion } from 'framer-motion'

export function HeroC() {
  return (
    <section className="grain relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Hero background image — rendered FIRST so glows overlay on top */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <img
          src="/images/supports/hero.png"
          alt=""
          className="h-full w-full object-cover"
          style={{ mixBlendMode: 'luminosity', opacity: 0.4 }}
          loading="eager"
        />
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
      </div>

      {/* Mobile hero image */}
      <div className="pointer-events-none absolute inset-0 md:hidden">
        <img src="/images/supports/hero.png" alt="" className="h-full w-full object-cover opacity-30" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]/50" />
      </div>

      {/* Chromatic glows — z-[2] places them above the image, below the content (z-10) */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full blur-[120px] z-[2]"
        style={{ background: 'radial-gradient(circle, #6428B4, transparent)', opacity: 0.25 }}
      />
      <div
        className="pointer-events-none absolute top-1/4 left-1/4 h-80 w-80 rounded-full blur-[100px] z-[2]"
        style={{ background: 'radial-gradient(circle, #DC3C78, transparent)', opacity: 0.2 }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full blur-[90px] z-[2]"
        style={{ background: 'radial-gradient(circle, #DC7828, transparent)', opacity: 0.18 }}
      />

      {/* Decorative yellow ribbon (top-left) */}
      <svg
        viewBox="0 0 300 300"
        className="pointer-events-none absolute top-16 left-6 h-48 w-48 opacity-80 z-[3]"
        aria-hidden="true"
      >
        <path
          d="M 20 280 C 20 150, 180 200, 160 100 C 140 20, 40 40, 80 120 C 110 180, 220 160, 200 80"
          stroke="#F3F441"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1400px] md:grid-cols-2">
        {/* Left — Text */}
        <div className="flex flex-col justify-end px-8 pt-32 pb-12 md:justify-center md:px-16 md:pt-0 md:pb-0 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px w-10 bg-[#F3F441]/60" />
              <span className="font-body text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
                Média de proximité captif
              </span>
            </div>

            <h1 className="font-display text-[clamp(56px,7vw,104px)] font-black leading-[0.9] uppercase text-white" style={{ letterSpacing: '-0.02em' }}>
              Votre pub
              <br />
              là où les gens
              <br />
              <span className="text-[#F3F441]">s'arrêtent.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-body mt-8 max-w-md text-[16px] leading-[1.65] text-white/55"
          >
            5 familles de supports captifs, déployés partout en France.
            Du terrain au digital, on touche votre cible au bon moment.
          </motion.p>

          {/* Tagline strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-6 inline-block bg-black px-6 py-2"
          >
            <span className="font-body text-[11px] font-medium uppercase tracking-[0.3em] text-white">
              Le média du dernier mètre
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href="#solutions"
              className="font-display bg-[#F3F441] px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#0A0A0A] transition-all hover:bg-[#EAEB2E] hover:shadow-[0_0_32px_rgba(243,244,65,0.25)]"
            >
              Découvrir nos solutions
            </a>
            <a
              href="#contact"
              className="font-body border border-white/20 px-7 py-3.5 text-[14px] font-medium text-white transition-all hover:border-[#F3F441] hover:text-[#F3F441]"
            >
              Lancer une campagne
            </a>
          </motion.div>

          {/* Mini stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-16 flex gap-10 border-t border-white/[0.06] pt-8"
          >
            {[
              { value: '5', label: 'familles de supports' },
              { value: '100%', label: 'preuve de passage' },
              { value: '5j', label: 'brief → terrain' },
            ].map((stat) => (
              <div key={stat.label}>
                <span className="font-display text-[28px] font-black tabular-nums text-white">{stat.value}</span>
                <p className="font-body mt-1 text-[11px] uppercase tracking-[0.2em] text-[#F3F441]/80">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column intentionally empty — the image fills via absolute background */}
        <div className="hidden md:block" />
      </div>
    </section>
  )
}
