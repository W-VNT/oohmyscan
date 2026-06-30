import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPin, Search, X, Plus, CheckCircle2, Package } from 'lucide-react'
import { useCampaign } from '@/hooks/useCampaigns'
import { useAuth } from '@/hooks/useAuth'
import { useGeolocation } from '@/hooks/useGeolocation'
import { searchPlaces, type PlaceSuggestion } from '@/lib/google-places'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

type Step = 'place' | 'photo' | 'quantity' | 'done'

export function DepositWizardPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: campaign, isLoading } = useCampaign(campaignId)
  const queryClient = useQueryClient()
  const geo = useGeolocation()

  const [step, setStep] = useState<Step>('place')
  const [place, setPlace] = useState<PlaceSuggestion | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Compteur de dépôts dans la session pour incitation à chaîner
  const [sessionCount, setSessionCount] = useState(0)

  // Demande la géolocalisation à l'arrivée pour biaiser la recherche
  useEffect(() => {
    geo.requestPosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recherche Google Places debounce
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await searchPlaces(search, geo.lng ?? undefined, geo.lat ?? undefined)
        setResults(r)
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, geo.lat, geo.lng])

  function resetWizard() {
    setStep('place')
    setPlace(null)
    setSearch('')
    setResults([])
    setPhotoPath(null)
    setQuantity('')
    setNotes('')
    setError(null)
  }

  async function handleSubmit() {
    if (!campaignId || !place || !photoPath || !quantity || !session?.user?.id) return
    const qty = parseInt(quantity, 10)
    if (!qty || qty < 1) {
      setError('Quantité invalide')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('campaign_deposits').insert({
        campaign_id: campaignId,
        operator_id: session.user.id,
        quantity: qty,
        photo_path: photoPath,
        place_id: place.id,
        place_name: place.name,
        place_address: [place.address, place.city].filter(Boolean).join(', ') || null,
        lat: place.lat || null,
        lng: place.lng || null,
        notes: notes.trim() || null,
      })
      if (insertError) throw insertError

      queryClient.invalidateQueries({ queryKey: ['campaign-deposits', campaignId] })
      setSessionCount((c) => c + 1)
      setStep('done')
      toast('Dépôt enregistré')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <LoadingScreen />

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-medium">Campagne introuvable</p>
          <button onClick={() => navigate('/app/diffuse')} className="mt-4 text-sm text-primary underline">
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => {
            if (step === 'place' || step === 'done') {
              navigate('/app/diffuse')
            } else if (step === 'photo') {
              setStep('place')
            } else if (step === 'quantity') {
              setStep('photo')
            }
          }}
          aria-label="Retour"
          className="rounded-md p-1 hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{campaign.name}</h1>
          <p className="truncate text-xs text-muted-foreground">Nouveau dépôt {sessionCount > 0 && `· ${sessionCount} déjà enregistré${sessionCount > 1 ? 's' : ''}`}</p>
        </div>
      </div>

      {/* Steps indicator */}
      {step !== 'done' && (
        <div className="flex gap-1 px-4 pt-4">
          {(['place', 'photo', 'quantity'] as const).map((s, i) => {
            const stepIdx = step === 'place' ? 0 : step === 'photo' ? 1 : 2
            return (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${i <= stepIdx ? 'bg-primary' : 'bg-muted'}`}
              />
            )
          })}
        </div>
      )}

      <div className="p-4">
        {/* STEP 1 : Place */}
        {step === 'place' && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Où as-tu déposé ?</p>
              <p className="text-xs text-muted-foreground">Cherche le bar, restaurant ou commerce où tu poses les supports.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom du lieu..."
                className="h-11 pl-9 text-sm"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {geo.error && (
              <p className="text-[11px] text-amber-600">
                {geo.error} — la recherche fonctionne quand même, mais sans tri par proximité.
              </p>
            )}

            {results.length > 0 && (
              <div className="space-y-2 pt-1">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPlace(p); setStep('photo') }}
                    className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.address, p.city].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching && search.trim() && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Aucun lieu trouvé. Reformule la recherche.
              </p>
            )}
          </div>
        )}

        {/* STEP 2 : Photo */}
        {step === 'photo' && place && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{place.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[place.address, place.city].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <button
                onClick={() => { setPlace(null); setStep('place') }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Changer le lieu"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium">Photo du dépôt</p>
              <p className="text-xs text-muted-foreground">Prends une photo des supports en place (sur le bar, la table, etc.).</p>
            </div>
            <PhotoCapture
              folder={`campaigns/${campaignId}/deposits`}
              onPhotoUploaded={(path) => {
                setPhotoPath(path)
                setStep('quantity')
              }}
            />
          </div>
        )}

        {/* STEP 3 : Quantity */}
        {step === 'quantity' && place && photoPath && (
          <div className="space-y-4">
            {/* Récap lieu */}
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{place.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[place.address, place.city].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            </div>

            <div>
              <label htmlFor="qty" className="mb-2 block text-sm font-medium">
                Quantité déposée <span className="text-red-500">*</span>
              </label>
              <Input
                id="qty"
                type="number"
                inputMode="numeric"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 50"
                className="h-12 text-base"
                autoFocus
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Nombre de supports laissés ici (sous-bocks, sets de table, flyers…).
              </p>
            </div>

            <div>
              <label htmlFor="notes" className="mb-2 block text-sm font-medium">
                Notes <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: patron pas là, dépôt au bar…"
                rows={2}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !quantity}
              className="h-12 w-full text-base"
            >
              {submitting ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Enregistrement…</>
              ) : (
                'Valider le dépôt'
              )}
            </Button>
          </div>
        )}

        {/* STEP 4 : Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Dépôt enregistré</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sessionCount} dépôt{sessionCount > 1 ? 's' : ''} pour cette session.
              </p>
            </div>

            <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
              <Button onClick={resetWizard} className="h-11 w-full">
                <Plus className="mr-1.5 size-4" />
                Nouveau dépôt
              </Button>
              <Button variant="outline" onClick={() => navigate('/app/diffuse')} className="h-11 w-full">
                <Package className="mr-1.5 size-4" />
                Terminer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
