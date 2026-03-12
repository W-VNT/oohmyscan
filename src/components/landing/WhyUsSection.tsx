import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { CheckCircle2, Camera, BarChart3, MapPin } from 'lucide-react'

const KPIS = [
  { end: 6, suffix: '', label: 'supports exclusifs' },
  { end: 100, suffix: '%', label: 'preuve de passage' },
  { end: 0, suffix: '', label: 'couverture', displayText: 'National' },
  { end: 500, suffix: '+', label: 'partenaires actifs' },
]

const FEATURES = [
  {
    title: 'Clé en main',
    desc: 'Brief → terrain en 5 jours.',
    icon: CheckCircle2,
  },
  {
    title: 'Preuve de passage',
    desc: 'Photos géolocalisées sur chaque support.',
    icon: Camera,
  },
  {
    title: 'Données terrain',
    desc: 'Rapport post-campagne détaillé.',
    icon: BarChart3,
  },
  {
    title: 'Réseau national',
    desc: 'Partenaires qualifiés partout en France.',
    icon: MapPin,
  },
]

export function WhyUsSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 })

  return (
    <section className="relative overflow-hidden bg-[#0A0A0A] py-16 md:py-20">
      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
            Pourquoi nous
          </span>
          <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-white">
            Des chiffres qui
            <br />
            <span className="text-white/30">parlent.</span>
          </h2>
        </motion.div>

        {/* KPIs — horizontal band */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-white/[0.06]"
        >
          {KPIS.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 15 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className="md:px-8 first:md:pl-0 last:md:pr-0"
            >
              <div className="text-3xl font-semibold tabular-nums text-white md:text-4xl">
                {kpi.displayText ? (
                  kpi.displayText
                ) : inView ? (
                  <CountUp end={kpi.end} suffix={kpi.suffix} duration={2.5} />
                ) : (
                  '0'
                )}
              </div>
              <p className="mt-1 text-[12px] text-white/30">{kpi.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Features — compact row */}
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 15 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.1] hover:bg-white/[0.03]"
              >
                <Icon className="h-4 w-4 text-[#F5C400]/50" />
                <h3 className="mt-3 text-[13px] font-medium text-white">{feat.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-white/30">{feat.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
