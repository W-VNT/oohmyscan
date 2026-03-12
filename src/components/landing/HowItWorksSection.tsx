import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const STEPS = [
  {
    num: '01',
    title: 'BRIEF',
    desc: 'Vous nous décrivez votre cible et votre budget.',
  },
  {
    num: '02',
    title: 'PLAN',
    desc: 'On sélectionne les supports et la zone géographique optimale.',
  },
  {
    num: '03',
    title: 'DÉPLOIEMENT',
    desc: 'Nos équipes terrain posent et suivent la campagne.',
  },
  {
    num: '04',
    title: 'RAPPORT',
    desc: 'Photos de validation + stats post-campagne.',
  },
]

export function HowItWorksSection() {
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

        {/* Desktop timeline */}
        <div className="mt-20 hidden md:block">
          {/* Timeline line */}
          <div className="relative mb-16 flex items-center justify-between">
            {/* Background line */}
            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/10" />
            {/* Animated fill */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
              className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#F5C400] origin-left"
            />
            {/* Dots */}
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.2 }}
                className="relative z-10 h-4 w-4 rounded-full bg-[#F5C400]"
              />
            ))}
          </div>

          {/* Step content */}
          <div className="grid grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.15 }}
                className="relative"
              >
                {/* Watermark number */}
                <span className="absolute -top-16 left-0 font-['Bebas_Neue'] text-[100px] leading-none text-[#F5C400]/10">
                  {step.num}
                </span>
                <h3 className="font-['Bebas_Neue'] text-xl text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#888888]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile vertical timeline */}
        <div className="mt-12 md:hidden">
          <div className="relative border-l-2 border-[#F5C400]/30 pl-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                className="relative mb-12 last:mb-0"
              >
                {/* Dot on the line */}
                <div className="absolute -left-[calc(2rem+5px)] top-1 h-3 w-3 rounded-full bg-[#F5C400]" />
                <span className="font-['Bebas_Neue'] text-sm text-[#F5C400]">{step.num}</span>
                <h3 className="mt-1 font-['Bebas_Neue'] text-xl text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#888888]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
