import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Camera, MapPin, QrCode, CheckCircle2, FileText, BarChart3 } from 'lucide-react'
import { useEffect } from 'react'
import type { ProcessStep } from './process/ProcessC'

interface ProcessModalProps {
  step: ProcessStep | null
  onClose: () => void
}

/* ── Inline app mockups ─────────────────────────────────── */

function MockupScan() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <div className="bg-[#0A0A0A] px-3 py-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#F5C400]" />
        <span className="text-[10px] font-medium text-white/50">OOHMYSCAN</span>
      </div>
      <div className="bg-[#111] p-4 space-y-3">
        {/* Scan area mockup */}
        <div className="relative aspect-square max-h-28 mx-auto rounded-lg border-2 border-dashed border-[#F5C400]/30 flex items-center justify-center">
          <QrCode className="h-8 w-8 text-[#F5C400]/30" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-[#F5C400]/40 animate-pulse" />
        </div>
        {/* Action buttons */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-[#F5C400] py-2 text-center text-[10px] font-medium text-[#0A0A0A]">Scanner</div>
          <div className="flex-1 rounded-lg border border-white/[0.08] py-2 text-center text-[10px] text-white/40 flex items-center justify-center gap-1">
            <Camera className="h-3 w-3" /> Photo
          </div>
        </div>
        {/* Recent scans */}
        <div className="space-y-1.5">
          {['Boulangerie Paul — 13001', 'Pharmacie Verte — 13006'].map((s) => (
            <div key={s} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <CheckCircle2 className="h-3 w-3 text-green-500/60" />
              <span className="text-[10px] text-white/40">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MockupAdmin({ variant }: { variant: 'devis' | 'dashboard' | 'rapport' }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <div className="bg-[#0A0A0A] px-3 py-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <span className="text-[10px] font-medium text-white/50">OOHMYADMIN</span>
      </div>
      <div className="bg-[#111] p-3">
        {variant === 'dashboard' && (
          <div className="space-y-2">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Posés', val: '142' },
                { label: 'En cours', val: '38' },
                { label: 'Validés', val: '104' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-white/[0.03] p-2 text-center">
                  <div className="text-[12px] font-semibold text-white/70">{s.val}</div>
                  <div className="text-[9px] text-white/25">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Map placeholder */}
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 flex items-center justify-center h-20">
              <MapPin className="h-5 w-5 text-blue-500/30" />
              <span className="ml-2 text-[10px] text-white/20">Carte de suivi terrain</span>
            </div>
          </div>
        )}
        {variant === 'devis' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-blue-500/50" />
                <span className="text-[11px] font-medium text-white/50">Devis #D-2026-047</span>
              </div>
              <span className="rounded-full bg-[#F5C400]/10 px-2 py-0.5 text-[9px] text-[#F5C400]/70">En attente</span>
            </div>
            {/* Lines */}
            <div className="space-y-1">
              {[
                { name: "BAG'AD PAIN × 500", price: '1 200 €' },
                { name: "TABLE'AD × 200", price: '800 €' },
                { name: 'Déploiement', price: '400 €' },
              ].map((l) => (
                <div key={l.name} className="flex justify-between rounded bg-white/[0.02] px-2.5 py-1.5">
                  <span className="text-[10px] text-white/40">{l.name}</span>
                  <span className="text-[10px] tabular-nums text-white/50">{l.price}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-white/[0.06] pt-2">
              <span className="text-[10px] font-medium text-white/40">Total HT</span>
              <span className="text-[11px] font-semibold tabular-nums text-white/70">2 400 €</span>
            </div>
          </div>
        )}
        {variant === 'rapport' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-blue-500/50" />
              <span className="text-[11px] font-medium text-white/50">Rapport campagne</span>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Supports posés', val: '142/150' },
                { label: 'Taux de pose', val: '94.7%' },
                { label: 'Photos validées', val: '142' },
                { label: 'Zones couvertes', val: '12' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-white/[0.03] p-2">
                  <div className="text-[11px] font-semibold tabular-nums text-white/60">{s.val}</div>
                  <div className="text-[9px] text-white/25">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Proof photos */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex-1 aspect-square rounded bg-white/[0.04] flex items-center justify-center">
                  <Camera className="h-3 w-3 text-white/15" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Preview mapping by step ────────────────────────────── */
const STEP_MOCKUPS: Record<string, React.ReactNode> = {
  '02': (
    <div className="grid grid-cols-1 gap-3">
      <MockupAdmin variant="devis" />
    </div>
  ),
  '03': (
    <div className="grid grid-cols-2 gap-3">
      <MockupScan />
      <MockupAdmin variant="dashboard" />
    </div>
  ),
  '04': (
    <div className="grid grid-cols-1 gap-3">
      <MockupAdmin variant="rapport" />
    </div>
  ),
}

/* ── Modal ──────────────────────────────────────────────── */

export function ProcessModal({ step, onClose }: ProcessModalProps) {
  useEffect(() => {
    if (step) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [step])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const mockup = step ? STEP_MOCKUPS[step.num] : null

  return (
    <AnimatePresence>
      {step && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/40 dark:bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Étape ${step.num} — ${step.title}`}
            data-lenis-prevent
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 300 }}
            className="fixed right-0 top-0 z-[80] h-full w-full overflow-y-auto bg-white dark:bg-[#0A0A0A] md:max-w-md"
          >
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#1A1A1A]/[0.1] dark:border-white/[0.1] text-[#1A1A1A]/50 dark:text-white/50 transition-colors hover:bg-[#1A1A1A]/5 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="px-8 pt-16 pb-2">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5C400]/15">
                  <step.icon className="h-6 w-6 text-[#F5C400]" />
                </div>
                <div>
                  <span className="text-[11px] tabular-nums text-[#F5C400]/40">{step.num}</span>
                  <h2 className="font-['Bebas_Neue'] text-3xl tracking-tight text-[#1A1A1A] dark:text-white">{step.title}</h2>
                </div>
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-[#1A1A1A]/50 dark:text-white/50">{step.detail}</p>
            </div>

            {/* App Mockups */}
            {mockup && (
              <div className="px-8 pt-6">
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]/20 dark:text-white/20">
                  Nos outils
                </span>
                <div className="mt-4">{mockup}</div>
              </div>
            )}

            {/* Tools */}
            <div className="px-8 pt-6">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]/20 dark:text-white/20">
                Méthodes
              </span>
              <div className="mt-4 space-y-3">
                {step.tools.map((tool) => {
                  const ToolIcon = tool.icon
                  return (
                    <div
                      key={tool.name}
                      className="rounded-xl border border-[#1A1A1A]/[0.06] dark:border-white/[0.06] bg-[#1A1A1A]/[0.02] dark:bg-white/[0.02] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A]/[0.04] dark:bg-white/[0.04]">
                          <ToolIcon className="h-4 w-4 text-[#F5C400]/60" />
                        </div>
                        <h3 className="text-[14px] font-medium text-[#1A1A1A] dark:text-white">{tool.name}</h3>
                      </div>
                      <p className="mt-2 ml-11 text-[13px] leading-relaxed text-[#1A1A1A]/35 dark:text-white/35">{tool.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Deliverable */}
            <div className="px-8 pt-8">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]/20 dark:text-white/20">
                Livrable
              </span>
              <div className="mt-3 rounded-xl border border-[#F5C400]/10 bg-[#F5C400]/[0.04] p-4">
                <p className="text-[13px] text-[#F5C400]/70">{step.deliverable}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-8 pt-10 pb-8">
              <a
                href="#contact"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C400] py-3.5 text-[14px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_24px_rgba(245,196,0,0.2)]"
              >
                Lancer une campagne
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
