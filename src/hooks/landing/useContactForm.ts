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

export function useContactForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(data: ContactFormData) {
    // Honeypot check
    if (data.website) return

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

    setSuccess(true)
  }

  return { submit, loading, success, error }
}
