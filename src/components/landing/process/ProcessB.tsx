import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const STEPS = [
  { num: '01', title: 'BRIEF', desc: 'Vous nous décrivez votre cible et votre budget.' },
  { num: '02', title: 'PLAN', desc: 'On sélectionne les supports et la zone géographique optimale.' },
  { num: '03', title: 'DÉPLOIEMENT', desc: 'Nos équipes terrain posent et suivent la campagne.' },
  { num: '04', title: 'RAPPORT', desc: 'Photos de validation + stats post-campagne.' },
]

/** Version B — Énergie urbaine : gros numéros animés avec hover interactif */
export function ProcessB() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section id="process" className="bg-[#0A0A0A] py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="font-['Bebas_Neue'] text-[clamp(40px,5vw,64px)] text-white"
        >
          DE L'IDÉE AU TERRAIN EN 4 ÉTAPES.
        </motion.h2>

        <div className="mt-16 grid gap-6 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.2 + i * 0.12,
                ease: [0.33, 1, 0.68, 1],
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#111111] p-8 transition-all duration-300 hover:border-[#F5C400]/30 hover:bg-[#1A1A1A]"
            >
              {/* Giant number background */}
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : {}}
                transition={{
                  duration: 0.8,
                  delay: 0.4 + i * 0.12,
                  type: 'spring',
                  stiffness: 100,
                }}
                className="absolute -right-4 -top-6 font-['Bebas_Neue'] text-[160px] leading-none text-[#F5C400]/5 transition-all duration-500 group-hover:text-[#F5C400]/10 group-hover:scale-110"
              >
                {step.num}
              </motion.span>

              {/* Step number pill */}
              <div className="relative mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5C400]/10 font-['Bebas_Neue'] text-lg text-[#F5C400] transition-colors group-hover:bg-[#F5C400]/20">
                {step.num}
              </div>

              <h3 className="relative font-['Bebas_Neue'] text-2xl text-white">{step.title}</h3>
              <p className="relative mt-3 text-sm leading-relaxed text-[#888888]">{step.desc}</p>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#F5C400] transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
