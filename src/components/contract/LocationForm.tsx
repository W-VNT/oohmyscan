import { useState, useEffect, useRef } from 'react'
import { MapPin, User, Calendar, Search, Loader2 } from 'lucide-react'
import { searchPlaces, type PlaceSuggestion } from '@/lib/google-places'
import type { Location } from '@/types'

export type LocationFormData = {
  name: string
  address: string
  postal_code: string
  city: string
  phone: string
  owner_last_name: string
  owner_first_name: string
  owner_role: string
  owner_email: string
  closing_months: string
}

interface LocationFormProps {
  onSubmit: (data: LocationFormData) => void
  initialData?: Partial<Location>
  panelCoords?: { lat: number; lng: number }
  submitLabel?: string
}

export function LocationForm({ onSubmit, initialData, panelCoords, submitLabel = 'Continuer' }: LocationFormProps) {
  const [form, setForm] = useState<LocationFormData>(() => ({
    name: initialData?.name ?? '',
    address: initialData?.address ?? '',
    postal_code: initialData?.postal_code ?? '',
    city: initialData?.city ?? '',
    phone: initialData?.phone ?? '',
    owner_last_name: initialData?.owner_last_name ?? '',
    owner_first_name: initialData?.owner_first_name ?? '',
    owner_role: initialData?.owner_role ?? 'Gérant',
    owner_email: initialData?.owner_email ?? '',
    closing_months: initialData?.closing_months ?? '',
  }))

  const [errors, setErrors] = useState<Partial<Record<keyof LocationFormData, string>>>({})

  // Google Places autocomplete
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleNameChange(value: string) {
    update('name', value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchPlaces(value, panelCoords?.lng, panelCoords?.lat)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  function selectSuggestion(place: PlaceSuggestion) {
    setForm((f) => ({
      ...f,
      name: place.name,
      address: place.address,
      city: place.city || f.city,
      postal_code: place.postalCode || f.postal_code,
      phone: place.phone || f.phone,
    }))
    setSuggestions([])
    setShowSuggestions(false)
    // Clear errors on filled fields
    setErrors((e) => ({ ...e, name: undefined, address: undefined, city: undefined, postal_code: undefined }))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Requis'
    if (!form.address.trim()) e.address = 'Requis'
    if (!form.postal_code.trim()) {
      e.postal_code = 'Requis'
    } else if (!/^\d{5}$/.test(form.postal_code.trim())) {
      e.postal_code = 'Code postal invalide (5 chiffres)'
    }
    if (!form.city.trim()) e.city = 'Requis'
    if (!form.owner_last_name.trim()) e.owner_last_name = 'Requis'
    if (!form.owner_first_name.trim()) e.owner_first_name = 'Requis'
    if (form.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email)) {
      e.owner_email = 'Email invalide'
    }
    if (form.phone && !/^[\d\s+()./-]{6,20}$/.test(form.phone.trim())) {
      e.phone = 'Numéro invalide'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  function update(key: keyof LocationFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const field = (
    key: keyof LocationFormData,
    label: string,
    placeholder: string,
    type = 'text',
  ) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground ${
          errors[key] ? 'border-red-500' : 'border-input'
        }`}
      />
      {errors[key] && <p className="text-[11px] text-red-500">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Etablissement */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="size-3.5" />
          Établissement
        </div>
        <div className="space-y-3">
          {/* Name with autocomplete */}
          <div className="relative space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nom</label>
            <div className="relative">
              <input
                ref={nameRef}
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Bar Le Central"
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 pr-8 text-sm placeholder:text-muted-foreground ${
                  errors.name ? 'border-red-500' : 'border-input'
                }`}
              />
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                {searching ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="size-4 text-muted-foreground" />
                )}
              </div>
            </div>
            {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-background shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => selectSuggestion(s)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                  >
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.address}{s.postalCode ? `, ${s.postalCode}` : ''} {s.city}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {field('address', 'Adresse', '12 rue de la Paix')}
          <div className="grid grid-cols-2 gap-3">
            {field('postal_code', 'Code postal', '69001')}
            {field('city', 'Ville', 'Lyon')}
          </div>
          {field('phone', 'Téléphone', '04 78 00 00 00', 'tel')}
        </div>
      </div>

      {/* Bailleur */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <User className="size-3.5" />
          Bailleur / Responsable
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field('owner_first_name', 'Prénom', 'Jean')}
            {field('owner_last_name', 'Nom', 'Dupont')}
          </div>
          {field('owner_role', 'Fonction', 'Gérant')}
          {field('owner_email', 'Email', 'jean@bar-central.fr', 'email')}
        </div>
      </div>

      {/* Fermeture */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Calendar className="size-3.5" />
          Période de fermeture (optionnel)
        </div>
        {field('closing_months', 'Période', '15 novembre - 1er avril')}
      </div>

      <button
        type="submit"
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {submitLabel}
      </button>
    </form>
  )
}
