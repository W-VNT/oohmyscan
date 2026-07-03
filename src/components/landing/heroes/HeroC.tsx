import { motion } from 'framer-motion'

export function HeroC() {
  return (
    <section className="relative min-h-[85vh] md:min-h-screen overflow-hidden bg-[#F5C400]">
      {/* Mobile background image — photo en bande centrale, jaune plein en haut & bas
          Le bas est plus opaque pour garder les CTAs et stats parfaitement lisibles */}
      <div className="absolute inset-0 md:hidden">
        <img src="/images/supports/hero.jpg" alt="Supports publicitaires de proximité — OOH MY AD ! média captif déployé en France" className="h-full w-full object-cover" loading="eager" />
        {/* Tint jaune subtil sur toute la photo */}
        <div className="absolute inset-0 bg-[#F5C400]/50" />
        {/* Fade jaune plein en bas — zone opaque renforcee pour le contraste des CTAs */}
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#F5C400] from-50% to-transparent" />
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
          alt="Supports publicitaires de proximité — OOH MY AD ! média captif déployé en France"
          className="h-full w-full object-cover"
          loading="eager"
        />
        {/* Yellow gradient blending photo into yellow bg */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#F5C400] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F5C400] to-transparent" />
      </motion.div>

      <div className="relative mx-auto grid min-h-[85vh] md:min-h-screen max-w-[1400px] md:grid-cols-2">
        {/* Left — Text (centré sur mobile avec logo en haut, left-aligned groupé sur desktop) */}
        <div className="flex flex-col items-center justify-center px-8 pt-24 pb-12 text-center md:items-start md:px-16 md:pt-0 md:pb-0 md:text-left lg:px-20">
          {/* Logo OOH MY AD ! */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-full"
          >
            <img
              src="/images/logo-oohmyad-white.svg"
              alt="Logo OOH MY AD ! — média publicitaire de proximité captif"
              className="mx-auto block w-full max-w-[340px] md:mx-0 md:max-w-[680px] md:-translate-x-[7%]"
            />
          </motion.div>

          {/* Bloc contenu */}
          <div className="mt-10 w-full md:mt-8">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="font-['Bebas_Neue'] text-[clamp(28px,3.6vw,52px)] leading-[0.95] tracking-tight text-[#0A0A0A]"
            >
              Votre pub là où
              <br />
              les gens s'arrêtent.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mx-auto mt-6 max-w-sm text-[15px] leading-relaxed text-[#0A0A0A]/70 md:mx-0"
            >
              5 familles de supports captifs, déployés partout en France.
              Du terrain au digital, on touche votre cible au bon moment.
            </motion.p>

            <div className="mx-auto mt-10 w-full max-w-sm md:mx-0 md:w-fit md:max-w-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-col gap-3 md:flex-row md:flex-wrap"
              >
                <a
                  href="#solutions"
                  className="rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-6 py-3 text-center text-[13px] font-medium text-white transition-all hover:bg-transparent hover:text-[#0A0A0A]"
                >
                  Découvrir nos solutions
                </a>
                <a
                  href="#contact"
                  className="rounded-full border border-[#0A0A0A] px-6 py-3 text-center text-[13px] font-medium text-[#0A0A0A] transition-all hover:bg-[#0A0A0A] hover:text-white"
                >
                  Obtenir un devis sous 24h
                </a>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="mt-4 text-center text-[12px] font-medium text-[#0A0A0A]/80"
              >
                Brief gratuit — Réponse sous 24h — Sans engagement
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mx-auto mt-16 flex w-full max-w-sm justify-around gap-6 border-t border-[#0A0A0A]/15 pt-8 text-center md:mx-0 md:w-auto md:max-w-none md:justify-start md:gap-10 md:text-left"
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
        </div>

        {/* Right column — empty placeholder, the image is positioned absolutely at the section level so it extends to the viewport edge */}
        <div className="hidden md:block" />
      </div>
    </section>
  )
}
