import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useInView } from 'react-intersection-observer'

const STEPS = [
  { num: '01', title: 'BRIEF', desc: 'Vous nous décrivez votre cible et votre budget.' },
  { num: '02', title: 'PLAN', desc: 'On sélectionne les supports et la zone géographique optimale.' },
  { num: '03', title: 'DÉPLOIEMENT', desc: 'Nos équipes terrain posent et suivent la campagne.' },
  { num: '04', title: 'RAPPORT', desc: 'Photos de validation + stats post-campagne.' },
]

/** Version A — Cinématique : SVG line qui se dessine au scroll */
export function ProcessA() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.6'],
  })

  const lineWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section id="process" className="bg-[#0A0A0A] py-24 md:py-32">
      <div ref={containerRef} className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-['Bebas_Neue'] text-[clamp(40px,5vw,64px)] text-white"
        >
          DE L'IDÉE AU TERRAIN EN 4 ÉTAPES.
        </motion.h2>

        {/* Desktop */}
        <div className="mt-20 hidden md:block">
          {/* Animated line */}
          <div className="relative mb-20 flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/10" />
            <motion.div
              style={{ width: lineWidth }}
              className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#F5C400] shadow-[0_0_8px_rgba(245,196,0,0.4)]"
            />
            {STEPS.map((_, i) => (
              <StepDot key={i} index={i} />
            ))}
          </div>

          {/* Steps */}
          <div className="grid grid-cols-4 gap-10">
            {STEPS.map((step, i) => (
              <StepContent key={step.num} step={step} index={i} />
            ))}
          </div>
        </div>

        {/* Mobile */}
        <div className="mt-12 md:hidden">
          <div className="relative border-l-2 border-[#F5C400]/30 pl-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative mb-12 last:mb-0"
              >
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

function StepDot({ index }: { index: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 })

  return (
    <div ref={ref} className="relative z-10 flex items-center justify-center">
      <div className="h-3 w-3 rounded-full bg-white/20" />
      <motion.div
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ duration: 0.4, delay: index * 0.2, type: 'spring', stiffness: 200 }}
        className="absolute h-4 w-4 rounded-full bg-[#F5C400] shadow-[0_0_12px_rgba(245,196,0,0.6)]"
      />
    </div>
  )
}

function StepContent({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.3, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative"
    >
      <span className="absolute -top-14 left-0 font-['Bebas_Neue'] text-[90px] leading-none text-[#F5C400]/[0.08]">
        {step.num}
      </span>
      <h3 className="font-['Bebas_Neue'] text-xl text-white">{step.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#888888]">{step.desc}</p>
    </motion.div>
  )
}
