import { motion } from 'framer-motion'

export function HeroC() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#FAFAFA] dark:bg-[#0A0A0A]">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute -top-[40%] left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[#F5C400]/[0.04] blur-[120px]" />

      {/* Mobile background image — always dark overlay for text readability */}
      <div className="absolute inset-0 md:hidden">
        <img src="/images/supports/hero.png" alt="Supports publicitaires OOH MY AD" className="h-full w-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/30" />
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
              <div className="h-px w-8 bg-[#F5C400]/60" />
              {/* Mobile: white text on photo. Desktop: adapts to theme */}
              <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/40 md:text-[#6B7280] md:dark:text-white/40">
                Média de proximité captif
              </span>
            </div>

            <h1 className="font-['Bebas_Neue'] text-[clamp(48px,6.5vw,96px)] leading-[0.92] tracking-tight text-white md:text-[#111111] md:dark:text-white">
              Votre pub là où
              <br />
              les gens
              <br />
              <span className="text-[#F5C400]">s'arrêtent.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 max-w-sm text-[15px] leading-relaxed text-white/50 md:text-[#6B7280] md:dark:text-white/60"
          >
            Taxi, table, boulangerie, pharmacie.
            Des supports captifs déployés partout en France.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href="#supports"
              className="rounded-full bg-[#F5C400] px-6 py-3 text-[13px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_24px_rgba(245,196,0,0.25)]"
            >
              Découvrir nos supports
            </a>
            <a
              href="#contact"
              className="rounded-full border border-white/[0.12] md:border-[#E5E5E5] md:dark:border-white/[0.12] px-6 py-3 text-[13px] font-medium text-white/70 md:text-[#374151] md:dark:text-white/70 transition-all hover:border-white/30 md:hover:border-[#D1D5DB] md:dark:hover:border-white/30 hover:text-white md:hover:text-[#111111] md:dark:hover:text-white"
            >
              Lancer une campagne
            </a>
          </motion.div>

          {/* Mini stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-20 flex gap-10 border-t border-white/[0.06] md:border-[#E5E5E5] md:dark:border-white/[0.06] pt-8"
          >
            {[
              { value: '6', label: 'supports' },
              { value: '100%', label: 'preuve de passage' },
              { value: '5j', label: 'brief → terrain' },
            ].map((stat) => (
              <div key={stat.label}>
                <span className="text-2xl font-semibold tabular-nums text-white md:text-[#111111] md:dark:text-white">{stat.value}</span>
                <p className="mt-1 text-[11px] text-white/50 md:text-[#9CA3AF] md:dark:text-white/50">{stat.label}</p>
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
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FAFAFA]/80 dark:from-[#0A0A0A] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FAFAFA]/80 dark:from-[#0A0A0A] to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}
