import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ContactFormData {
  name: string
  company: string
  email: string
  city: string
  support_interest: string
  message: string
  website: string // honeypot
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const COOLDOWN_MS = 60_000

export function useContactForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSubmit, setLastSubmit] = useState(0)

  function validate(data: ContactFormData): string | null {
    if (!data.name.trim() || data.name.trim().length > 200)
      return 'Nom requis (200 caractères max).'
    if (!EMAIL_REGEX.test(data.email.trim()))
      return 'Adresse email invalide.'
    if (data.email.trim().length > 320)
      return 'Email trop long.'
    if (data.company.trim().length > 200)
      return 'Nom de société trop long (200 max).'
    if (data.city.trim().length > 200)
      return 'Ville trop longue (200 max).'
    if (!data.message.trim() || data.message.trim().length > 5000)
      return 'Message requis (5000 caractères max).'
    return null
  }

  async function submit(data: ContactFormData) {
    // Honeypot check
    if (data.website) return

    // Cooldown check
    if (Date.now() - lastSubmit < COOLDOWN_MS) {
      setError('Veuillez patienter avant de renvoyer un message.')
      return
    }

    // Client-side validation
    const validationError = validate(data)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    const { error: err } = await supabase.from('contact_requests').insert({
      name: data.name.trim(),
      company: data.company.trim() || null,
      email: data.email.trim(),
      city: data.city.trim() || null,
      support_interest: data.support_interest || null,
      message: data.message.trim(),
      source: 'landing',
    })

    setLoading(false)

    if (err) {
      setError('Une erreur est survenue. Réessayez ou contactez-nous directement.')
      return
    }

    setLastSubmit(Date.now())
    setSuccess(true)
  }

  return { submit, loading, success, error }
}
