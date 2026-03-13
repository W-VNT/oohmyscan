import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { SUPPORTS } from '@/data/supports'
import { useContactForm } from '@/hooks/landing/useContactForm'
import { ArrowRight, Mail, Clock, UserCheck } from 'lucide-react'

export function ContactSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const { submit, loading, success, error } = useContactForm()

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    city: '',
    support_interest: '',
    message: '',
    website: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(form)
  }

  const inputCls =
    'w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none transition-all focus:border-[#F5C400]/30 focus:bg-white/[0.06]'

  const REASSURANCE = [
    { icon: UserCheck, text: 'Brief gratuit, sans engagement' },
    { icon: Clock, text: 'Réponse sous 24h' },
    { icon: Mail, text: 'Interlocuteur unique dédié' },
  ]

  return (
    <section id="contact" className="relative overflow-hidden bg-[#0A0A0A] py-20 md:py-28">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5C400]/[0.03] blur-[120px]" />

      <div ref={ref} className="relative mx-auto max-w-5xl px-6">
        {/* Header — centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
            Contact
          </span>
          <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-white">
            Parlons de votre
            <br />
            <span className="text-[#F5C400]">campagne.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-white/40">
            Décrivez votre projet, on revient vers vous sous 24h avec une proposition sur-mesure.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-12 md:grid-cols-[1fr_1.2fr] md:items-start md:gap-16">
          {/* Left — Reassurance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-6"
          >
            {REASSURANCE.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.text} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F5C400]/[0.08]">
                    <Icon className="h-4 w-4 text-[#F5C400]/60" />
                  </div>
                  <span className="pt-2 text-[14px] text-white/50">{item.text}</span>
                </div>
              )
            })}

            <div className="border-t border-white/[0.06] pt-6">
              <p className="text-[12px] text-white/20">Ou directement</p>
              <a
                href="mailto:contact@oohmyad.com"
                className="mt-1 text-[14px] font-medium text-white transition-colors hover:text-[#F5C400]"
              >
                contact@oohmyad.com
              </a>
            </div>
          </motion.div>

          {/* Right — Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {success ? (
              <div className="flex items-center justify-center rounded-2xl border border-[#F5C400]/15 bg-[#F5C400]/[0.04] p-12">
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5C400]/15">
                    <ArrowRight className="h-5 w-5 text-[#F5C400]" />
                  </div>
                  <p className="mt-4 text-lg font-medium text-white">Merci !</p>
                  <p className="mt-2 text-[14px] text-white/40">On revient vers vous sous 24h.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
                {/* Honeypot */}
                <div className="absolute left-[-9999px]" aria-hidden="true">
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input type="text" placeholder="Nom / Société" required maxLength={200} className={inputCls} value={form.name} onChange={set('name')} />
                  <input type="email" placeholder="Email" required maxLength={320} className={inputCls} value={form.email} onChange={set('email')} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input type="text" placeholder="Ville cible" maxLength={200} className={inputCls} value={form.city} onChange={set('city')} />
                  <select className={inputCls} value={form.support_interest} onChange={set('support_interest')}>
                    <option value="">Support visé</option>
                    <option value="all">Tous les supports</option>
                    {SUPPORTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <textarea
                  placeholder="Votre message / budget indicatif"
                  required
                  maxLength={5000}
                  rows={4}
                  className={inputCls + ' resize-none'}
                  value={form.message}
                  onChange={set('message')}
                />

                {error && <p className="text-[13px] text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F5C400] py-3.5 text-[14px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_24px_rgba(245,196,0,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Envoi...' : 'Envoyer la demande'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
