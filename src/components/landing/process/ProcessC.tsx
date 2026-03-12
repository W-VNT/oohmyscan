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
  previews?: { src: string; alt: string; label: string }[]
}

const STEPS: ProcessStep[] = [
  {
    num: '01',
    title: 'Brief',
    desc: 'Cible, zone, budget — on cadre tout ensemble.',
    detail: 'On échange par téléphone ou visio pour comprendre votre besoin : objectifs de campagne, zone géographique, durée souhaitée, supports préférés et budget.',
    icon: MessageSquare,
    tools: [
      { icon: Phone, name: 'Appel découverte', desc: 'Échange de 15 min pour cadrer vos objectifs et contraintes.' },
      { icon: ClipboardList, name: 'Formulaire brief', desc: 'Document structuré pour formaliser cible, zone, timing et budget.' },
      { icon: Globe, name: 'Analyse géographique', desc: 'Étude de couverture sur votre zone pour identifier le potentiel.' },
    ],
    deliverable: 'Brief validé avec zone, cible, budget et planning prévisionnel.',
  },
  {
    num: '02',
    title: 'Plan',
    desc: 'Sélection des supports et zones optimales, devis sur-mesure.',
    detail: 'On analyse le potentiel de couverture, on sélectionne les partenaires locaux les plus pertinents et on vous livre un devis détaillé sous 24h.',
    icon: Map,
    tools: [
      { icon: MapPin, name: 'Mapping réseau', desc: 'Cartographie de nos partenaires actifs dans votre zone cible.' },
      { icon: Target, name: 'Recommandation supports', desc: 'Sélection des supports les plus adaptés à votre cible et message.' },
      { icon: FileText, name: 'Devis sur-mesure', desc: 'Proposition chiffrée détaillée avec options, envoyée sous 24h.' },
    ],
    deliverable: 'Devis détaillé + plan média avec supports recommandés et couverture estimée.',
    previews: [
      { src: '/images/previews/admin-devis.png', alt: 'OOHMYADMIN — Devis', label: 'OOHMYADMIN' },
    ],
  },
  {
    num: '03',
    title: 'Déploiement',
    desc: 'Nos équipes posent, suivent et valident chaque support.',
    detail: 'Nos opérateurs terrain installent chaque support, suivent la qualité en temps réel et envoient des photos de validation via QR code.',
    icon: Truck,
    tools: [
      { icon: Smartphone, name: 'OOHMYSCAN (PWA)', desc: 'Application mobile terrain pour scanner, photographier et valider chaque pose.' },
      { icon: QrCode, name: 'QR code + photo', desc: 'Chaque support scanné génère une preuve de passage géolocalisée et horodatée.' },
      { icon: CheckCircle2, name: 'Suivi temps réel', desc: 'Dashboard de suivi pour monitorer l\'avancement du déploiement.' },
    ],
    deliverable: 'Supports déployés avec photos de validation en temps réel.',
    previews: [
      { src: '/images/previews/scan-mobile.png', alt: 'OOHMYSCAN — Scan terrain', label: 'OOHMYSCAN' },
      { src: '/images/previews/admin-dashboard.png', alt: 'OOHMYADMIN — Suivi', label: 'OOHMYADMIN' },
    ],
  },
  {
    num: '04',
    title: 'Rapport',
    desc: 'Photos de preuve, stats terrain, recommandations.',
    detail: 'Rapport complet avec preuves de passage géolocalisées, statistiques de couverture, et recommandations pour vos prochaines campagnes.',
    icon: BarChart3,
    tools: [
      { icon: ImageIcon, name: 'Preuves géolocalisées', desc: 'Photos de chaque support avec coordonnées GPS et timestamp.' },
      { icon: TrendingUp, name: 'Statistiques campagne', desc: 'Métriques de couverture, taux de pose, zones couvertes.' },
      { icon: Lightbulb, name: 'Recommandations', desc: 'Analyse post-campagne avec suggestions d\'optimisation pour la suite.' },
    ],
    deliverable: 'Rapport PDF complet avec preuves, stats et recommandations.',
    previews: [
      { src: '/images/previews/admin-rapport.png', alt: 'OOHMYADMIN — Rapport', label: 'OOHMYADMIN' },
    ],
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
      className="relative overflow-hidden bg-[#0A0A0A] py-20 md:py-28"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="md:text-center"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
            Comment ça marche
          </span>
          <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-white">
            De l'idée au terrain
            <br />
            <span className="text-white/30">en 4 étapes.</span>
          </h2>
        </motion.div>

        {/* Desktop — horizontal with scroll-triggered reveal */}
        <div className="mt-20 hidden md:block">
          {/* Horizontal line track */}
          <div className="relative h-px mx-12 mb-12">
            <div className="absolute inset-0 bg-white/[0.06]" />
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
                        isActive ? 'bg-[#F5C400] shadow-[0_0_12px_rgba(245,196,0,0.4)]' : 'bg-white/10'
                      }`}
                    />
                  </div>

                  {/* Card */}
                  <div
                    onClick={() => setSelectedStep(step)}
                    className={`w-full cursor-pointer rounded-2xl border p-6 transition-all duration-700 hover:border-[#F5C400]/20 ${
                      isActive
                        ? 'border-[#F5C400]/15 bg-[#F5C400]/[0.04]'
                        : 'border-white/[0.04] bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 ${
                          isActive ? 'bg-[#F5C400]/15' : 'bg-white/[0.04]'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 transition-colors duration-500 ${
                            isActive ? 'text-[#F5C400]' : 'text-white/20'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[11px] tabular-nums transition-colors duration-500 ${
                          isActive ? 'text-[#F5C400]/40' : 'text-white/10'
                        }`}
                      >
                        {step.num}
                      </span>
                    </div>
                    <h3
                      className={`mt-4 text-[17px] font-medium transition-colors duration-500 ${
                        isActive ? 'text-white' : 'text-white/30'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`mt-2 text-[13px] leading-relaxed transition-colors duration-500 ${
                        isActive ? 'text-white/50' : 'text-white/15'
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
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/[0.06]" />
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
                        isActive ? 'bg-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.4)]' : 'bg-white/10'
                      }`}
                    />
                  </div>

                  {/* Card */}
                  <div
                    onClick={() => setSelectedStep(step)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all duration-700 hover:border-[#F5C400]/20 ${
                      isActive
                        ? 'border-[#F5C400]/15 bg-[#F5C400]/[0.04]'
                        : 'border-white/[0.04] bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-500 ${
                          isActive ? 'bg-[#F5C400]/15' : 'bg-white/[0.04]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 transition-colors duration-500 ${
                            isActive ? 'text-[#F5C400]' : 'text-white/20'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-[15px] font-medium transition-colors duration-500 ${
                              isActive ? 'text-white' : 'text-white/30'
                            }`}
                          >
                            {step.title}
                          </h3>
                          <span
                            className={`text-[11px] tabular-nums transition-colors duration-500 ${
                              isActive ? 'text-[#F5C400]/40' : 'text-white/10'
                            }`}
                          >
                            {step.num}
                          </span>
                        </div>
                        <p
                          className={`mt-1.5 text-[13px] leading-relaxed transition-colors duration-500 ${
                            isActive ? 'text-white/50' : 'text-white/15'
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
