import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateClient, type Client } from '@/hooks/admin/useClients'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { ArrowLeft, Loader2, SearchCheck } from 'lucide-react'

type ClientForm = Omit<Client, 'id' | 'created_at' | 'updated_at'>

const emptyForm: ClientForm = {
  company_name: '',
  contact_name: null,
  contact_email: null,
  contact_phone: null,
  billing_email: null,
  commercial_email: null,
  address: null,
  city: null,
  postal_code: null,
  siret: null,
  tva_number: null,
  notes: null,
  is_active: true,
}

export function ClientNewPage() {
  const navigate = useNavigate()
  const createClient = useCreateClient()

  const [form, setForm] = useState<ClientForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ClientForm, string>>>({})
  const [siretLoading, setSiretLoading] = useState(false)

  async function lookupSiret() {
    const raw = form.siret?.replace(/\s/g, '')
    if (!raw || raw.length !== 14) {
      setFormErrors((prev) => ({ ...prev, siret: 'Le SIRET doit contenir 14 chiffres' }))
      return
    }
    setSiretLoading(true)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${raw}&page=1&per_page=1`)
      if (!res.ok) throw new Error('API indisponible')
      const json = await res.json()
      const company = json.results?.[0]
      if (!company) {
        setFormErrors((prev) => ({ ...prev, siret: 'Aucune entreprise trouvée' }))
        return
      }
      const siege = company.siege
      let tva = company.numero_tva_intra || null
      if (!tva && raw.length >= 9) {
        const siren = parseInt(raw.slice(0, 9), 10)
        if (!isNaN(siren)) {
          const key = (12 + 3 * (siren % 97)) % 97
          tva = `FR${String(key).padStart(2, '0')}${raw.slice(0, 9)}`
        }
      }
      setForm((f) => ({
        ...f,
        company_name: company.nom_complet || f.company_name,
        address: siege?.adresse ? `${siege.numero_voie ?? ''} ${siege.type_voie ?? ''} ${siege.libelle_voie ?? ''}`.trim() : f.address,
        city: siege?.libelle_commune || f.city,
        postal_code: siege?.code_postal || f.postal_code,
        tva_number: tva || f.tva_number,
      }))
      setFormErrors((prev) => { const next = { ...prev }; delete next.siret; return next })
      toast('Informations entreprise importées')
    } catch {
      setFormErrors((prev) => ({ ...prev, siret: 'Erreur lors de la recherche' }))
    } finally {
      setSiretLoading(false)
    }
  }

  async function handleSave() {
    const errors: Partial<Record<keyof ClientForm, string>> = {}

    if (!form.company_name.trim()) {
      errors.company_name = 'Le nom de la société est requis'
    }

    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      errors.contact_email = 'Format d\'email invalide'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setSaving(true)
    try {
      const result = await createClient.mutateAsync(form)
      toast('Client créé')
      navigate(`/admin/clients/${result.id}`)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  function field(
    key: keyof ClientForm,
    label: string,
    placeholder?: string,
    type?: string,
  ) {
    const error = formErrors[key]
    return (
      <div>
        <label className="mb-2 block text-sm font-medium">{label}</label>
        <Input
          value={(form[key] as string) ?? ''}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value || null }))
            if (error) setFormErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
          }}
          placeholder={placeholder}
          type={type}
          className={`h-9 rounded-lg text-sm ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">Nouveau client</h1>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-5">
          <div className="space-y-4">
            {/* Row 1: Société / SIRET / TVA */}
            <div className="grid gap-4 sm:grid-cols-3">
              {field('company_name', 'Société *', 'ACME Corp')}
              <div>
                <label className="mb-2 block text-sm font-medium">SIRET</label>
                <div className="flex gap-2">
                  <Input
                    value={(form.siret as string) ?? ''}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, siret: e.target.value || null }))
                      if (formErrors.siret) setFormErrors((prev) => { const next = { ...prev }; delete next.siret; return next })
                    }}
                    placeholder="123 456 789 00012"
                    className={`h-9 flex-1 rounded-lg text-sm ${formErrors.siret ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={lookupSiret}
                    disabled={siretLoading}
                    title="Rechercher l'entreprise"
                    className="size-9 shrink-0"
                  >
                    {siretLoading ? <Loader2 className="size-4 animate-spin" /> : <SearchCheck className="size-4" />}
                  </Button>
                </div>
                {formErrors.siret && <p className="text-[11px] text-red-500">{formErrors.siret}</p>}
              </div>
              {field('tva_number', 'TVA', 'FR12345678901')}
            </div>

            {/* Row 2: Contact / Téléphone */}
            <div className="grid gap-4 sm:grid-cols-2">
              {field('contact_name', 'Contact', 'Jean Dupont')}
              {field('contact_phone', 'Téléphone', '01 23 45 67 89', 'tel')}
            </div>

            {/* Row 2b: Emails */}
            <div className="grid gap-4 sm:grid-cols-3">
              {field('contact_email', 'Email principal', 'contact@acme.fr', 'email')}
              {field('billing_email', 'Email comptable', 'compta@acme.fr', 'email')}
              {field('commercial_email', 'Email commercial', 'commercial@acme.fr', 'email')}
            </div>

            {/* Row 3: Adresse / Ville / Code postal */}
            <div className="grid gap-4 sm:grid-cols-3">
              {field('address', 'Adresse', '12 rue de Rivoli')}
              {field('city', 'Ville', 'Paris')}
              {field('postal_code', 'Code postal', '75001')}
            </div>

            {/* Row 4: Notes (full width) */}
            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                rows={2}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                placeholder="Notes internes..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Créer le client
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/clients')}>
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
