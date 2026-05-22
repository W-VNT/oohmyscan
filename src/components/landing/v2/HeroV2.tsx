import { motion } from 'framer-motion'

export function HeroV2() {
  return (
    <section className="bg-[#F4C400] min-h-screen relative overflow-hidden">
      {/* Desktop background image */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <img
          src="/images/supports/hero.png"
          alt=""
          className="torn-edge h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#F4C400] via-[#F4C400]/80 to-transparent" />
      </div>

      {/* Mobile background image */}
      <div className="pointer-events-none absolute inset-0 md:hidden">
        <img
          src="/images/supports/hero.png"
          alt=""
          className="torn-edge h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F4C400] via-[#F4C400]/80 to-[#F4C400]/40" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1400px] md:grid-cols-2">
        {/* Left — Text */}
        <div className="flex flex-col justify-end px-8 pt-32 pb-12 md:justify-center md:px-16 md:pt-0 md:pb-0 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px w-10 bg-[#111111]/40" />
              <span className="font-v2-body text-[11px] font-medium uppercase tracking-[0.3em] text-[#111111]/50">
                Média de proximité captif
              </span>
            </div>

            <h1
              className="font-v2-display text-[clamp(56px,7vw,104px)] font-black leading-[0.9] uppercase text-[#111111]"
              style={{ letterSpacing: '-0.03em' }}
            >
              Votre pub
              <br />
              là où les gens
              <br />
              s'arrêtent.
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-v2-body mt-8 max-w-md text-[16px] leading-[1.65] text-[#111111]/70 text-justify"
          >
            5 familles de supports captifs, déployés partout en France.
            Du terrain au digital, on touche votre cible au bon moment.
          </motion.p>

          {/* Tagline strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
          >
            <div className="mt-6 inline-block bg-[#111111] px-6 py-2">
              <span className="font-v2-body text-[11px] font-medium uppercase tracking-[0.3em] text-white">
                Le média du dernier mètre
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href="#solutions"
              className="font-v2-body bg-[#111111] text-[#F4C400] font-extrabold text-[13px] uppercase tracking-[0.08em] px-7 py-3.5 rounded border-2 border-[#111111] transition-all hover:bg-transparent hover:text-[#111111]"
            >
              Découvrir nos solutions
            </a>
            <a
              href="#contact"
              className="font-v2-body bg-transparent text-[#111111] font-extrabold text-[13px] uppercase tracking-[0.08em] px-7 py-3.5 rounded border-2 border-[#111111] transition-all hover:bg-[#111111] hover:text-[#F4C400]"
            >
              Lancer une campagne
            </a>
          </motion.div>

          {/* Mini stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-16 flex gap-10 border-t border-[#111111]/15 pt-8"
          >
            {[
              { value: '5', label: 'familles de supports' },
              { value: '100%', label: 'preuve de passage' },
              { value: '5j', label: 'brief → terrain' },
            ].map((stat) => (
              <div key={stat.label}>
                <span className="font-v2-display text-[28px] font-black tabular-nums text-[#111111]">
                  {stat.value}
                </span>
                <p className="font-v2-body mt-1 text-[11px] uppercase tracking-[0.2em] text-[#111111]/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column intentionally empty — image fills via absolute background */}
        <div className="hidden md:block" />
      </div>
    </section>
  )
}
