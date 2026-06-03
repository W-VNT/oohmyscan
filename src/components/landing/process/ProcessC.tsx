import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import {
  MessageSquare, Map, Truck, BarChart3,
  Phone, ClipboardList, Globe,
  MapPin, Target, FileText,
  Smartphone, QrCode, CheckCircle2,
  ImageIcon, TrendingUp, Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import { ProcessModal } from '../ProcessModal'

export interface ProcessTool {
  icon: LucideIcon
  name: string
  desc: string
}

export interface ProcessStep {
  num: string
  title: string
  desc: string
  detail: string
  icon: LucideIcon
  tools: ProcessTool[]
  deliverable: string
}

const STEPS: ProcessStep[] = [
  {
    num: '01',
    title: 'Brief',
    desc: 'Cible, zone, budget — on cadre tout ensemble.',
    detail: 'Cible, zone, durée, budget. On cadre tout en un appel de 15 min.',
    icon: MessageSquare,
    tools: [
      { icon: Phone, name: 'Appel découverte', desc: '15 min pour cadrer vos objectifs.' },
      { icon: ClipboardList, name: 'Formulaire brief', desc: 'Vos infos clés, formalisées en un doc.' },
      { icon: Globe, name: 'Analyse géographique', desc: 'Le potentiel de couverture sur votre zone.' },
    ],
    deliverable: 'Brief validé. Zone, cible, budget, planning posés.',
  },
  {
    num: '02',
    title: 'Plan',
    desc: 'Plan média + devis chiffré sous 24h.',
    detail: 'Votre zone scannée. Vos supports sélectionnés. Votre devis chiffré. Sous 24h.',
    icon: Map,
    tools: [
      { icon: MapPin, name: 'Mapping réseau', desc: 'Tous nos partenaires actifs sur votre zone.' },
      { icon: Target, name: 'Recommandation supports', desc: 'Les supports qui matchent votre cible et votre message.' },
      { icon: FileText, name: 'Devis sur-mesure', desc: 'Chiffré, détaillé. Livré sous 24h.' },
    ],
    deliverable: 'Plan média complet + devis chiffré, prêt à signer.',
  },
  {
    num: '03',
    title: 'Déploiement',
    desc: 'On pose, on suit, on valide. Vous voyez tout en temps réel.',
    detail: 'Nos opérateurs installent. Chaque pose est scannée, photographiée, géolocalisée. Suivi temps réel.',
    icon: Truck,
    tools: [
      { icon: Smartphone, name: 'OOH MY SCAN', desc: "L'app terrain qui prouve chaque pose." },
      { icon: QrCode, name: 'QR code + photo', desc: 'Preuve de passage géolocalisée et horodatée.' },
      { icon: CheckCircle2, name: 'Suivi temps réel', desc: "L'avancement en direct, accessible 24/7." },
    ],
    deliverable: 'Tous vos supports posés, prouvés, validés.',
  },
  {
    num: '04',
    title: 'Rapport',
    desc: 'Photos de preuve, stats terrain, recommandations.',
    detail: 'Preuves de chaque pose, stats de couverture, recommandations pour la prochaine.',
    icon: BarChart3,
    tools: [
      { icon: ImageIcon, name: 'Preuves géolocalisées', desc: 'Photo + GPS + horodatage sur chaque pose.' },
      { icon: TrendingUp, name: 'Statistiques campagne', desc: 'Couverture, taux de pose, zones touchées.' },
      { icon: Lightbulb, name: 'Recommandations', desc: "Ce qui a marché, ce qu'on optimise pour la suite." },
    ],
    deliverable: 'Rapport PDF complet. Toutes les preuves, toutes les stats.',
  },
]

export function ProcessC() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.6', 'end 0.4'],
  })

  const [activeStep, setActiveStep] = useState(-1)
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (v > 0.75) setActiveStep(3)
    else if (v > 0.55) setActiveStep(2)
    else if (v > 0.35) setActiveStep(1)
    else if (v > 0.15) setActiveStep(0)
    else setActiveStep(-1)
  })

  const lineProgress = useTransform(scrollYProgress, [0.1, 0.8], [0, 1])

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative overflow-hidden bg-[#FAFAFA] dark:bg-[#0A0A0A] py-20 md:py-28"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="md:text-center"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#9CA3AF] dark:text-white/40">
            Comment ça marche
          </span>
          <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-[#111111] dark:text-white">
            De l'idée au terrain
            <br />
            <span className="text-[#F5C400]">en 4 étapes.</span>
          </h2>
        </motion.div>

        {/* Desktop — horizontal with scroll-triggered reveal */}
        <div className="mt-20 hidden md:block">
          {/* Horizontal line track */}
          <div className="relative h-px mx-12 mb-12">
            <div className="absolute inset-0 bg-[#E5E5E5] dark:bg-white/[0.06]" />
            <motion.div
              className="absolute inset-y-0 left-0 origin-left bg-gradient-to-r from-[#F5C400] to-[#F5C400]/40"
              style={{ scaleX: lineProgress }}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isActive = i <= activeStep
              return (
                <div key={step.num} className="relative flex flex-col items-center">
                  {/* Dot above */}
                  <div className="absolute -top-[54px] left-1/2 -translate-x-1/2">
                    <div
                      className={`h-3 w-3 rounded-full transition-all duration-500 ${
                        isActive ? 'bg-[#F5C400] shadow-[0_0_12px_rgba(245,196,0,0.4)]' : 'bg-[#E5E5E5] dark:bg-white/10'
                      }`}
                    />
                  </div>

                  {/* Card */}
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStep(step) } }}
                    onClick={() => setSelectedStep(step)}
                    className={`w-full cursor-pointer rounded-2xl border p-6 transition-all duration-700 hover:border-[#F5C400]/30 hover:shadow-lg dark:hover:border-[#F5C400]/40 dark:hover:shadow-[0_0_28px_rgba(245,196,0,0.12)] ${
                      isActive
                        ? 'border-[#F5C400]/15 bg-[#F5C400]/[0.04]'
                        : 'border-[#E5E5E5] dark:border-white/[0.04] bg-white dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 ${
                          isActive ? 'bg-[#F5C400]/15' : 'bg-white dark:bg-white/[0.04]'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 transition-colors duration-500 ${
                            isActive ? 'text-[#F5C400]' : 'text-[#D1D5DB] dark:text-white/20'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[11px] tabular-nums transition-colors duration-500 ${
                          isActive ? 'text-[#F5C400]/40' : 'text-[#F3F4F6] dark:text-white/10'
                        }`}
                      >
                        {step.num}
                      </span>
                    </div>
                    <h3
                      className={`mt-4 text-[17px] font-medium transition-colors duration-500 ${
                        isActive ? 'text-[#111111] dark:text-white' : 'text-[#9CA3AF] dark:text-white/40'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`mt-2 text-[13px] leading-relaxed transition-colors duration-500 ${
                        isActive ? 'text-[#6B7280] dark:text-white/50' : 'text-[#E5E7EB] dark:text-white/15'
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile — vertical with animated line + cards */}
        <div className="relative mt-12 md:hidden">
          {/* Static track */}
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#E5E5E5] dark:bg-white/[0.06]" />
          {/* Animated progress */}
          <motion.div
            className="absolute left-[11px] top-0 w-px origin-top bg-gradient-to-b from-[#F5C400] to-[#F5C400]/20"
            style={{ scaleY: lineProgress }}
          />

          <div className="space-y-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isActive = i <= activeStep
              return (
                <div key={step.num} className="relative pl-10">
                  {/* Dot on line */}
                  <div className="absolute left-[5px] top-5">
                    <div
                      className={`h-3 w-3 rounded-full transition-all duration-500 ${
                        isActive ? 'bg-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.4)]' : 'bg-[#E5E5E5] dark:bg-white/10'
                      }`}
                    />
                  </div>

                  {/* Card */}
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStep(step) } }}
                    onClick={() => setSelectedStep(step)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all duration-700 hover:border-[#F5C400]/30 hover:shadow-lg dark:hover:border-[#F5C400]/40 dark:hover:shadow-[0_0_28px_rgba(245,196,0,0.12)] ${
                      isActive
                        ? 'border-[#F5C400]/15 bg-[#F5C400]/[0.04]'
                        : 'border-[#E5E5E5] dark:border-white/[0.04] bg-white dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-500 ${
                          isActive ? 'bg-[#F5C400]/15' : 'bg-white dark:bg-white/[0.04]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 transition-colors duration-500 ${
                            isActive ? 'text-[#F5C400]' : 'text-[#D1D5DB] dark:text-white/20'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-[15px] font-medium transition-colors duration-500 ${
                              isActive ? 'text-[#111111] dark:text-white' : 'text-[#9CA3AF] dark:text-white/40'
                            }`}
                          >
                            {step.title}
                          </h3>
                          <span
                            className={`text-[11px] tabular-nums transition-colors duration-500 ${
                              isActive ? 'text-[#F5C400]/40' : 'text-[#F3F4F6] dark:text-white/10'
                            }`}
                          >
                            {step.num}
                          </span>
                        </div>
                        <p
                          className={`mt-1.5 text-[13px] leading-relaxed transition-colors duration-500 ${
                            isActive ? 'text-[#6B7280] dark:text-white/50' : 'text-[#E5E7EB] dark:text-white/15'
                          }`}
                        >
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ProcessModal step={selectedStep} onClose={() => setSelectedStep(null)} />
    </section>
  )
}
