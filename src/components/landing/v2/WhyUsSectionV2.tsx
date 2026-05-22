import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { Globe, Layers, BarChart3, Zap, Target } from 'lucide-react'
import { DotPattern } from '@/components/ui/DotPattern'
import { BrushStroke } from '@/components/ui/BrushStroke'

const KPIS = [
  { end: 80, suffix: '+', label: 'agglomérations taxis / VTC' },
  { end: 710, suffix: '', label: 'campings réseau estival' },
  { end: 20000, suffix: '', label: 'faces réseau VILLE', separator: true },
  { end: 100, suffix: 'M', label: 'ODV / 14 jours' },
]

const FEATURES = [
  { title: 'Présence nationale', desc: 'Du centre-ville aux plages.', icon: Globe },
  { title: 'Terrain + digital', desc: 'Une couverture 360°.', icon: Layers },
  { title: "Mesure d'audience", desc: 'Reporting sur chaque campagne.', icon: BarChart3 },
  { title: 'Déploiement rapide', desc: 'Brief → terrain en 5 jours.', icon: Zap },
  { title: 'Ciblage précis', desc: 'Géographie, moment, contexte.', icon: Target },
]

export function WhyUsSectionV2() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 })

  return (
    <section className="relative overflow-hidden bg-[#EAE3D0] py-20 md:py-28">
      <DotPattern className="pointer-events-none absolute inset-0 w-full h-full opacity-15" />

      <div ref={ref} className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="font-v2-body text-[11px] font-medium uppercase tracking-[0.3em] text-[#111111]/30">
            Pourquoi nous
          </span>
          <h2
            className="font-v2-display mt-4 text-[clamp(40px,5vw,72px)] font-black leading-[0.95] uppercase text-[#111111]"
            style={{ letterSpacing: '-0.01em' }}
          >
            Des chiffres qui
            <br />
            parlent.
          </h2>
          <BrushStroke color="#111111" className="mt-2 w-48 h-4" />
        </motion.div>

        {/* KPIs — big headline numbers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mt-14 grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-6"
        >
          {KPIS.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 15 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
            >
              <div className="font-v2-display text-[clamp(40px,6vw,72px)] font-black leading-none tabular-nums text-[#111111]">
                +{inView ? (
                  <CountUp
                    end={kpi.end}
                    suffix={kpi.suffix}
                    duration={2.5}
                    separator={kpi.separator ? ' ' : ''}
                  />
                ) : (
                  '0'
                )}
              </div>
              <p className="font-v2-body mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#111111]/60">
                {kpi.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Features — compact row */}
        <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-5">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 15 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                className="rounded border border-[#111111]/[0.12] bg-white p-4 transition-colors hover:border-[#111111]/30"
              >
                <Icon className="h-4 w-4 text-[#F4C400]" />
                <h3 className="font-v2-body mt-3 text-[13px] font-medium text-[#111111]">{feat.title}</h3>
                <p className="font-v2-body mt-1 text-[12px] leading-relaxed text-[#111111]/55">{feat.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
