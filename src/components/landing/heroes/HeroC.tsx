import { motion } from 'framer-motion'

export function HeroC() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#F5C400]">
      {/* Mobile background image — yellow tint overlay so logo & text stay readable */}
      <div className="absolute inset-0 md:hidden">
        <img src="/images/supports/hero.jpg" alt="Supports publicitaires OOH MY AD !" className="h-full w-full object-cover opacity-20" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5C400] via-[#F5C400]/95 to-[#F5C400]/85" />
      </div>

      {/* Desktop background image — extends to the viewport right edge so no yellow strip appears beyond the 1400px container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.1 }}
        className="absolute inset-y-0 right-0 hidden w-1/2 md:block"
      >
        <img
          src="/images/supports/hero.jpg"
          alt="Supports publicitaires OOH MY AD !"
          className="h-full w-full object-cover"
          loading="eager"
        />
        {/* Yellow gradient blending photo into yellow bg */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#F5C400] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F5C400] to-transparent" />
      </motion.div>

      <div className="relative mx-auto grid min-h-screen max-w-[1400px] md:grid-cols-2">
        {/* Left — Text */}
        <div className="flex flex-col justify-end px-8 pt-32 pb-12 md:justify-center md:px-16 md:pt-0 md:pb-0 lg:px-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            {/* Logo OOH MY AD ! — white déstructuré, hero-only */}
            <img
              src="/images/logo-oohmyad-white.svg"
              alt="OOH MY AD !"
              className="block w-full max-w-[560px] -translate-x-[7%] md:max-w-[680px]"
            />

            <h1 className="mt-8 font-['Bebas_Neue'] text-[clamp(28px,3.6vw,52px)] leading-[0.95] tracking-tight text-[#0A0A0A]">
              Votre pub là où
              <br />
              les gens s'arrêtent.
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-6 max-w-sm text-[15px] leading-relaxed text-[#0A0A0A]/70"
          >
            5 familles de supports captifs, déployés partout en France.
            Du terrain au digital, on touche votre cible au bon moment.
          </motion.p>

          <div className="mt-10 w-fit">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap gap-3"
            >
              <a
                href="#solutions"
                className="rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-6 py-3 text-[13px] font-medium text-white transition-all hover:bg-transparent hover:text-[#0A0A0A]"
              >
                Découvrir nos solutions
              </a>
              <a
                href="#contact"
                className="rounded-full border border-[#0A0A0A] px-6 py-3 text-[13px] font-medium text-[#0A0A0A] transition-all hover:bg-[#0A0A0A] hover:text-white"
              >
                Obtenir un devis sous 24h
              </a>
            </motion.div>

            {/* Risk reversal — sous les CTAs, centré dans la largeur des boutons */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-4 text-center text-[12px] text-[#0A0A0A]/60"
            >
              Brief gratuit — Réponse sous 24h — Sans engagement
            </motion.p>
          </div>

          {/* Mini stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-16 flex gap-10 border-t border-[#0A0A0A]/15 pt-8"
          >
            {[
              { value: '5', label: 'familles de supports' },
              { value: '100%', label: 'preuve de passage' },
              { value: '5j', label: 'brief → terrain' },
            ].map((stat) => (
              <div key={stat.label}>
                <span className="text-2xl font-semibold tabular-nums text-[#0A0A0A]">{stat.value}</span>
                <p className="mt-1 text-[11px] text-[#0A0A0A]/60">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column — empty placeholder, the image is positioned absolutely at the section level so it extends to the viewport edge */}
        <div className="hidden md:block" />
      </div>
    </section>
  )
}
