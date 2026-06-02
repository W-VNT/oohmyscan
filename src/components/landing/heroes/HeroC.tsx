import { motion } from 'framer-motion'

export function HeroC() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#F5C400]">
      {/* Mobile background image — yellow tint overlay so logo & text stay readable */}
      <div className="absolute inset-0 md:hidden">
        <img src="/images/supports/hero.png" alt="Supports publicitaires OOH MY AD" className="h-full w-full object-cover opacity-20" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5C400] via-[#F5C400]/95 to-[#F5C400]/85" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1400px] md:grid-cols-2">
        {/* Left — Text */}
        <div className="flex flex-col justify-end px-8 pt-32 pb-12 md:justify-center md:px-16 md:pt-0 md:pb-0 lg:px-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px w-8 bg-[#0A0A0A]/40" />
              <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#0A0A0A]/60">
                Média de proximité captif
              </span>
            </div>

            {/* Logo OOH MY AD ! — white déstructuré, hero-only */}
            <img
              src="/images/logo-oohmyad-white.svg"
              alt="OOH MY AD !"
              className="w-full max-w-[460px] md:max-w-[520px]"
            />

            <h1 className="mt-6 font-['Bebas_Neue'] text-[clamp(28px,3.6vw,52px)] leading-[0.95] tracking-tight text-[#0A0A0A]">
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
            5 familles de supports captifs, deployes partout en France.
            Du terrain au digital, on touche votre cible au bon moment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href="#solutions"
              className="rounded-full bg-[#0A0A0A] px-6 py-3 text-[13px] font-medium text-white transition-all hover:bg-[#0A0A0A]/90 hover:shadow-[0_0_24px_rgba(0,0,0,0.25)]"
            >
              Decouvrir nos solutions
            </a>
            <a
              href="#contact"
              className="rounded-full border border-[#0A0A0A]/30 px-6 py-3 text-[13px] font-medium text-[#0A0A0A] transition-all hover:bg-[#0A0A0A] hover:text-white"
            >
              Lancer une campagne
            </a>
          </motion.div>

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

        {/* Right — Image (desktop only) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.1 }}
          className="relative hidden md:block"
        >
          <img
            src="/images/supports/hero.png"
            alt="Supports publicitaires OOH MY AD"
            className="h-full w-full object-cover"
            loading="eager"
          />
          {/* Yellow gradient blending photo into yellow bg */}
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#F5C400] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F5C400] to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}
