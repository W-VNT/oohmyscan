import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FAMILLE_OPTIONS } from '@/data/familles'
import { useContactForm } from '@/hooks/landing/useContactForm'
import { ArrowRight, Mail, Clock, UserCheck } from 'lucide-react'

export function ContactSectionV2() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const { submit, loading, success, error } = useContactForm()

  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    support_interest: '',
    message: '',
    website: '',
  })

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(form)
  }

  const inputCls =
    'w-full rounded border border-white/[0.15] bg-white/[0.06] px-4 py-3 font-[\'Barlow\'] text-[14px] text-white placeholder-white/40 outline-none transition-all focus:border-[#F4C400]/50 focus:bg-white/[0.08]'

  const REASSURANCE = [
    { icon: UserCheck, text: 'Brief gratuit, sans engagement' },
    { icon: Clock, text: 'Réponse sous 24h' },
    { icon: Mail, text: 'Interlocuteur unique dédié' },
  ]

  return (
    <section id="contact" className="bg-[#F4C400] py-20 md:py-28 relative overflow-hidden">
      <div ref={ref} className="relative mx-auto max-w-5xl px-6">
        {/* Header — centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <span className="font-v2-body text-[11px] font-medium uppercase tracking-[0.25em] text-[#111111]/40">
            Contact
          </span>
          <h2
            className="mt-4 font-v2-display font-black uppercase text-[clamp(36px,5vw,72px)] leading-[0.95] text-[#111111]"
            style={{ letterSpacing: '-0.01em' }}
          >
            Parlons de votre
            <br />
            campagne.
          </h2>
          <p className="mx-auto mt-4 max-w-md font-v2-body text-[15px] text-[#111111]/60">
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
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-[#111111]/[0.08]">
                    <Icon className="h-4 w-4 text-[#111111]/50" />
                  </div>
                  <span className="pt-2 font-v2-body text-[14px] text-[#111111]/60">{item.text}</span>
                </div>
              )
            })}

            <div className="border-t border-[#111111]/[0.15] pt-6">
              <p className="font-v2-body text-[12px] text-[#111111]/50">Ou directement</p>
              <a
                href="mailto:contact@oohmyad.com"
                className="mt-1 font-v2-body text-[14px] font-medium text-[#111111] transition-colors hover:text-[#111111]/70"
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
              <div className="flex items-center justify-center rounded border border-[#111111]/15 bg-[#111111]/[0.04] p-12">
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-[#111111]/15">
                    <ArrowRight className="h-5 w-5 text-[#111111]" />
                  </div>
                  <p className="mt-4 font-v2-display text-lg font-semibold text-[#111111]">Merci !</p>
                  <p className="mt-2 font-v2-body text-[14px] text-[#111111]/60">On revient vers vous sous 24h.</p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-3 rounded border border-white/[0.08] bg-[#111111] p-6 md:p-8"
              >
                {/* Honeypot */}
                <div className="absolute left-[-9999px]" aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={set('website')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name-v2" className="sr-only">Nom / Société</label>
                    <input
                      id="contact-name-v2"
                      type="text"
                      placeholder="Nom / Société"
                      required
                      maxLength={200}
                      className={inputCls}
                      value={form.name}
                      onChange={set('name')}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email-v2" className="sr-only">Email</label>
                    <input
                      id="contact-email-v2"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="Email"
                      required
                      maxLength={320}
                      className={inputCls}
                      value={form.email}
                      onChange={set('email')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-city-v2" className="sr-only">Ville cible</label>
                    <input
                      id="contact-city-v2"
                      type="text"
                      placeholder="Ville cible"
                      maxLength={200}
                      className={inputCls}
                      value={form.city}
                      onChange={set('city')}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-support-v2" className="sr-only">Famille de supports</label>
                    <select
                      id="contact-support-v2"
                      className={inputCls}
                      value={form.support_interest}
                      onChange={set('support_interest')}
                    >
                      <option value="">Famille de supports</option>
                      {FAMILLE_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message-v2" className="sr-only">Votre message / budget indicatif</label>
                  <textarea
                    id="contact-message-v2"
                    placeholder="Votre message / budget indicatif"
                    required
                    maxLength={5000}
                    rows={4}
                    className={inputCls + ' resize-none'}
                    value={form.message}
                    onChange={set('message')}
                  />
                </div>

                {error && <p className="font-v2-body text-[13px] text-red-700">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="font-v2-body flex w-full items-center justify-center gap-2 bg-[#F4C400] py-3.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#111111] rounded border-2 border-[#F4C400] transition-all hover:bg-transparent hover:text-[#F4C400] disabled:opacity-50"
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
