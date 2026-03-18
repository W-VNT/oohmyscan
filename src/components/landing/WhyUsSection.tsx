import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { Globe, Layers, BarChart3, Zap, Target } from 'lucide-react'

const KPIS = [
  { end: 80, suffix: '+', label: 'agglomerations taxis/VTC' },
  { end: 710, suffix: '', label: 'campings reseau estival' },
  { end: 20000, suffix: '', label: 'faces reseau VILLE', separator: true },
  { end: 100, suffix: 'M', label: 'ODV/14 jours' },
]

const FEATURES = [
  {
    title: 'Presence nationale',
    desc: 'Du centre-ville aux plages.',
    icon: Globe,
  },
  {
    title: 'Terrain + digital',
    desc: 'Une couverture 360°.',
    icon: Layers,
  },
  {
    title: "Mesure d'audience",
    desc: 'Reporting sur chaque campagne.',
    icon: BarChart3,
  },
  {
    title: 'Deploiement rapide',
    desc: 'Brief → terrain en 5 jours.',
    icon: Zap,
  },
  {
    title: 'Ciblage precis',
    desc: 'Geographie, moment, contexte.',
    icon: Target,
  },
]

export function WhyUsSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 })

  return (
    <section className="relative overflow-hidden bg-[#FAFAFA] dark:bg-[#0A0A0A] py-16 md:py-20">
      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#9CA3AF] dark:text-white/40">
            Pourquoi nous
          </span>
          <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-[#111111] dark:text-white">
            Des chiffres qui
            <br />
            <span className="text-[#9CA3AF] dark:text-white/40">parlent.</span>
          </h2>
        </motion.div>

        {/* KPIs — horizontal band */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-[#E5E5E5] dark:md:divide-white/[0.06]"
        >
          {KPIS.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 15 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className="md:px-8 first:md:pl-0 last:md:pr-0"
            >
              <div className="text-3xl font-semibold tabular-nums text-[#111111] dark:text-white md:text-4xl">
                {inView ? (
                  <CountUp end={kpi.end} suffix={kpi.suffix} duration={2.5} separator={kpi.separator ? ' ' : ''} />
                ) : (
                  '0'
                )}
              </div>
              <p className="mt-1 text-[12px] text-[#6B7280] dark:text-white/60">{kpi.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Features — compact row */}
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 15 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                className="rounded-xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 transition-colors hover:border-[#D1D5DB] dark:hover:border-white/[0.1] hover:bg-[#F5F5F5] dark:hover:bg-white/[0.03]"
              >
                <Icon className="h-4 w-4 text-[#F5C400]/50" />
                <h3 className="mt-3 text-[13px] font-medium text-[#111111] dark:text-white">{feat.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280] dark:text-white/60">{feat.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
