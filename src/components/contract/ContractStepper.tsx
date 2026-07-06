import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, AlertTriangle, RotateCcw } from 'lucide-react'
import { LocationSearch } from './LocationSearch'
import { LocationForm, type LocationFormData } from './LocationForm'
import { ZonePicker } from './ZonePicker'
import { ContractPreview } from './ContractPreview'
import { SignatureCanvas } from './SignatureCanvas'
import { ContractSuccess } from './ContractSuccess'
import { useCreateLocation, useLocationPanels, useLocationContract } from '@/hooks/useLocations'
import { useAuth } from '@/hooks/useAuth'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/shared/Toast'
import { PANEL_ZONES } from '@/lib/constants'
import { pdf } from '@react-pdf/renderer'
import { ContractPDF } from '@/lib/pdf/ContractPDF'
import { AmendmentPDF } from '@/lib/pdf/AmendmentPDF'
import type { Location, Panel } from '@/types'

type FlowType = 'new_location' | 'existing_location'

type Step =
  | 'search'       // Search for existing location
  | 'create'       // Create new location form
  | 'zone'         // Pick zone
  | 'preview'      // Contract/amendment preview
  | 'sign_owner'   // Owner signature
  | 'sign_operator'// Operator signature
  | 'saving'       // Saving...
  | 'success'      // Done

interface PanelSnapshot {
  panel_id: string
  zone_label: string
  qr_code: string
  reference: string
}

interface ContractStepperProps {
  panel: Panel
}

export function ContractStepper({ panel }: ContractStepperProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const createLocation = useCreateLocation()
  const { data: companySettings } = useCompanySettings()

  const [step, setStep] = useState<Step>('search')
  const [flowType, setFlowType] = useState<FlowType | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [signatureOwner, setSignatureOwner] = useState('')
  const [signatureOperator, setSignatureOperator] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch panels for existing location
  const { data: locationPanels } = useLocationPanels(location?.id)
  const { data: existingContract } = useLocationContract(location?.id)

  const occupiedZones = (locationPanels ?? [])
    .map((p) => p.zone_label)
    .filter((z): z is string => !!z)

  const isAmendment = !!existingContract

  // Build panels snapshot for contract/amendment
  const existingSnapshots: PanelSnapshot[] = (locationPanels ?? []).map((p) => ({
    panel_id: p.id,
    zone_label: p.zone_label ?? '',
    qr_code: p.qr_code,
    reference: p.reference,
  }))

  const newPanelSnapshot: PanelSnapshot | undefined = selectedZone
    ? {
        panel_id: panel.id,
        zone_label: selectedZone,
        qr_code: panel.qr_code,
        reference: panel.reference,
      }
    : undefined

  const allPanelsSnapshot = newPanelSnapshot
    ? [...existingSnapshots, newPanelSnapshot]
    : existingSnapshots

  const stepOrder: Step[] = isAmendment
    ? ['search', 'zone', 'preview', 'sign_owner', 'sign_operator', 'saving', 'success']
    : flowType === 'new_location'
      ? ['create', 'zone', 'preview', 'sign_owner', 'sign_operator', 'saving', 'success']
      : ['search', 'zone', 'preview', 'sign_owner', 'sign_operator', 'saving', 'success']

  const currentStepIndex = stepOrder.indexOf(step)
  const totalSteps = stepOrder.filter((s) => s !== 'saving' && s !== 'success').length

  function goBack() {
    if (step === 'search' || (step === 'create' && !flowType)) {
      navigate(-1)
      return
    }
    if (step === 'create') {
      setStep('search')
      return
    }
    const idx = stepOrder.indexOf(step)
    if (idx > 0) {
      setStep(stepOrder[idx - 1])
    }
  }

  // Handle location creation
  async function handleCreateLocation(data: LocationFormData) {
    try {
      const result = await createLocation.mutateAsync({
        ...data,
        phone: data.phone || null,
        owner_email: data.owner_email || null,
        closing_months: data.closing_months || null,
        created_by: session?.user?.id,
      })
      setLocation(result as Location)
      setFlowType('new_location')
      setStep('zone')
    } catch {
      toast('Erreur lors de la création du lieu', 'error')
    }
  }

  // Handle existing location selection
  function handleSelectLocation(loc: Location) {
    setLocation(loc)
    setFlowType('existing_location')
    setStep('zone')
  }

  // Handle zone selection
  function handleSelectZone(zone: string) {
    setSelectedZone(zone)
    setStep('preview')
  }

  // Zone labels map for PDF — supports custom zones prefixed with "custom:"
  const zoneLabels = Object.fromEntries(PANEL_ZONES.map((z) => [z.value, z.label]))

  // Company info for PDF
  function getCompanyForPDF() {
    const logoUrl = companySettings?.logo_path
      ? supabase.storage.from('company-assets').getPublicUrl(companySettings.logo_path).data.publicUrl
      : null
    return {
      name: companySettings?.company_name ?? 'OOHMYAD',
      address: companySettings?.address ?? null,
      city: companySettings?.city ?? null,
      postal_code: companySettings?.postal_code ?? null,
      siret: companySettings?.siret ?? null,
      phone: companySettings?.phone ?? null,
      email: companySettings?.email ?? null,
      logoUrl,
    }
  }

  // Generate PDF blob and upload to storage
  async function generateAndUploadPDF(
    docNumber: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfElement: React.ReactElement<any>,
  ): Promise<string> {
    const blob = await pdf(pdfElement).toBlob()
    const path = `contracts/${docNumber}.pdf`
    const { error: uploadErr } = await supabase.storage
      .from('panel-photos')
      .upload(path, blob, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) throw uploadErr
    return path
  }

  // Upload signature image to storage, return the path
  async function uploadSignature(dataUrl: string, prefix: string): Promise<string> {
    const base64 = dataUrl.split(',')[1]
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'image/png' })
    const path = `signatures/${prefix}-${crypto.randomUUID()}.png`
    const { error: uploadErr } = await supabase.storage
      .from('panel-photos')
      .upload(path, blob, { contentType: 'image/png' })
    if (uploadErr) throw uploadErr
    return path
  }

  // Handle final save
  async function handleSave() {
    if (!location || !selectedZone || !signatureOwner || !signatureOperator || !newPanelSnapshot) return

    // Auth guard
    const userId = session?.user?.id
    if (!userId) {
      setError('Session expirée. Veuillez vous reconnecter.')
      return
    }

    setStep('saving')
    setError(null)
    setSaveError(null)

    const now = new Date().toISOString()
    const company = getCompanyForPDF()

    // Build full zone labels map (includes custom zones)
    const fullZoneLabels: Record<string, string> = { ...zoneLabels }
    for (const snap of allPanelsSnapshot) {
      if (snap.zone_label.startsWith('custom:')) {
        fullZoneLabels[snap.zone_label] = snap.zone_label.slice(7)
      }
    }

    // Abort controller for cancellation
    const controller = new AbortController()
    abortRef.current = controller

    // Timeout wrapper — rejects after 30 seconds
    const SAVE_TIMEOUT_MS = 30_000
    const timeoutId = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)

    try {
      // Wrap the entire save in a race against the abort signal
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')

      // Upload signatures to storage instead of storing base64 in DB
      const [sigOwnerPath, sigOperatorPath] = await Promise.all([
        uploadSignature(signatureOwner, 'owner'),
        uploadSignature(signatureOperator, 'operator'),
      ])

      // 1. Update panel with location_id, zone_label + sync name/address/city from location
      const zoneName = selectedZone ? (zoneLabels[selectedZone] ?? selectedZone) : ''
      const autoName = location.name + (zoneName ? ` — ${zoneName}` : '')
      const { error: panelErr } = await supabase
        .from('panels')
        .update({
          location_id: location.id,
          zone_label: selectedZone,
          name: autoName,
          address: location.address,
          city: location.city,
          updated_at: now,
        })
        .eq('id', panel.id)
      if (panelErr) throw panelErr

      if (isAmendment && existingContract) {
        // Create amendment
        const { data: numData, error: rpcErr } = await supabase.rpc('get_next_amendment_number', {
          p_contract_id: existingContract.id,
        })
        if (rpcErr) throw rpcErr
        const amendmentNumber = numData as string

        // Generate PDF
        const storagePath = await generateAndUploadPDF(
          amendmentNumber,
          <AmendmentPDF
            amendmentNumber={amendmentNumber}
            originalContractNumber={existingContract.contract_number}
            originalSignedAt={existingContract.signed_at}
            signedAt={now}
            signedCity={location.city}
            reason="panel_added"
            establishment={{
              name: location.name,
              address: location.address,
              postal_code: location.postal_code,
              city: location.city,
            }}
            owner={{
              first_name: location.owner_first_name,
              last_name: location.owner_last_name,
              role: location.owner_role,
            }}
            panelsAdded={[newPanelSnapshot]}
            panelsRemoved={[]}
            panelsAfter={allPanelsSnapshot}
            signatureOwner={signatureOwner}
            signatureOperator={signatureOperator}
            company={company}
            zoneLabels={fullZoneLabels}
          />,
        )

        const { error: insertErr } = await supabase.from('contract_amendments').insert({
          contract_id: existingContract.id,
          location_id: location.id,
          amendment_number: amendmentNumber,
          reason: 'panel_added',
          panels_added: [newPanelSnapshot],
          panels_snapshot: allPanelsSnapshot,
          signature_owner: sigOwnerPath,
          signature_operator: sigOperatorPath,
          signed_at: now,
          storage_path: storagePath,
          created_by: userId,
        })
        if (insertErr) throw insertErr

        // Update contract status
        const { error: updateErr } = await supabase
          .from('panel_contracts')
          .update({ status: 'amended' })
          .eq('id', existingContract.id)
        if (updateErr) throw updateErr

        setContractNumber(amendmentNumber)
      } else {
        // Get atomic contract number via SQL function
        const { data: numData, error: rpcErr } = await supabase.rpc('get_next_contract_number')
        if (rpcErr) throw rpcErr
        const newContractNumber = numData as string

        // Generate PDF
        const storagePath = await generateAndUploadPDF(
          newContractNumber,
          <ContractPDF
            contractNumber={newContractNumber}
            signedAt={now}
            signedCity={location.city}
            establishment={{
              name: location.name,
              address: location.address,
              postal_code: location.postal_code,
              city: location.city,
              phone: location.phone,
            }}
            owner={{
              first_name: location.owner_first_name,
              last_name: location.owner_last_name,
              role: location.owner_role,
              email: location.owner_email,
            }}
            closingMonths={location.closing_months}
            panels={allPanelsSnapshot}
            signatureOwner={signatureOwner}
            signatureOperator={signatureOperator}
            company={company}
            zoneLabels={fullZoneLabels}
          />,
        )

        const { error: insertErr } = await supabase.from('panel_contracts').insert({
          location_id: location.id,
          contract_number: newContractNumber,
          establishment_name: location.name,
          establishment_address: location.address,
          establishment_postal_code: location.postal_code,
          establishment_city: location.city,
          establishment_phone: location.phone,
          owner_last_name: location.owner_last_name,
          owner_first_name: location.owner_first_name,
          owner_role: location.owner_role,
          owner_email: location.owner_email,
          closing_months: location.closing_months,
          panels_snapshot: allPanelsSnapshot,
          signature_owner: sigOwnerPath,
          signature_operator: sigOperatorPath,
          signed_at: now,
          storage_path: storagePath,
          created_by: userId,
        })
        if (insertErr) throw insertErr

        // has_contract is now synced by the DB trigger

        setContractNumber(newContractNumber)
      }

      // Invalidate caches so panel detail page sees the contract
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['panels'] }),
        queryClient.invalidateQueries({ queryKey: ['panels', panel.id] }),
        queryClient.invalidateQueries({ queryKey: ['locations'] }),
        queryClient.invalidateQueries({ queryKey: ['locations', location.id] }),
        queryClient.invalidateQueries({ queryKey: ['locations', location.id, 'contract'] }),
        ...(existingContract
          ? [queryClient.invalidateQueries({ queryKey: ['contracts', existingContract.id, 'amendments'] })]
          : []),
      ])

      clearTimeout(timeoutId)
      abortRef.current = null
      setStep('success')
      toast(isAmendment ? 'Avenant signé avec succès' : 'Contrat signé avec succès')
    } catch (err) {
      clearTimeout(timeoutId)
      abortRef.current = null

      if (err instanceof DOMException && err.name === 'AbortError') {
        setSaveError('Délai d\'attente dépassé. Vérifiez votre connexion et réessayez.')
      } else {
        setSaveError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
      }
      // Stay on 'saving' step — the UI will show error state with retry/cancel
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {step !== 'success' && (
        <div className="sticky top-[env(safe-area-inset-top)] z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={goBack} aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">
              {isAmendment ? 'Avenant au contrat' : 'Nouveau contrat'}
            </h1>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1 px-4 pb-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Step: Search */}
        {step === 'search' && (
          <LocationSearch
            onSelect={handleSelectLocation}
            onCreateNew={() => setStep('create')}
          />
        )}

        {/* Step: Create location */}
        {step === 'create' && (
          <LocationForm
            onSubmit={handleCreateLocation}
            initialData={panel.address ? {
              name: panel.name ?? '',
              address: panel.address,
              postal_code: panel.address?.match(/\b(\d{5})\b/)?.[1] ?? panel.city?.match(/\b(\d{5})\b/)?.[1] ?? '',
              city: panel.city ?? '',
              phone: panel.contact_phone ?? '',
            } : undefined}
            panelCoords={panel.lat != null && panel.lng != null ? { lat: panel.lat, lng: panel.lng } : undefined}
            submitLabel="Créer le lieu et continuer"
          />
        )}

        {/* Step: Zone picker */}
        {step === 'zone' && location && (
          <ZonePicker
            onSelect={handleSelectZone}
            selectedZone={selectedZone ?? undefined}
            occupiedZones={occupiedZones}
            locationName={location.name}
          />
        )}

        {/* Step: Preview */}
        {step === 'preview' && location && (
          <div className="space-y-4">
            <ContractPreview
              type={isAmendment ? 'amendment' : 'contract'}
              location={location}
              panels={allPanelsSnapshot}
              newPanel={newPanelSnapshot}
              originalContractNumber={existingContract?.contract_number}
            />
            <button
              onClick={() => setStep('sign_owner')}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Passer aux signatures
            </button>
          </div>
        )}

        {/* Step: Owner signature */}
        {step === 'sign_owner' && (
          <div className="space-y-4">
            <SignatureCanvas
              label="Signature du bailleur"
              onSignature={setSignatureOwner}
              value={signatureOwner || undefined}
            />
            <button
              onClick={() => setStep('sign_operator')}
              disabled={!signatureOwner}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              Continuer
            </button>
          </div>
        )}

        {/* Step: Operator signature */}
        {step === 'sign_operator' && (
          <div className="space-y-4">
            <SignatureCanvas
              label="Signature de l'opérateur"
              onSignature={setSignatureOperator}
              value={signatureOperator || undefined}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!signatureOperator}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              Signer et enregistrer
            </button>
          </div>
        )}

        {/* Step: Saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-20">
            {saveError ? (
              <>
                <AlertTriangle className="size-8 text-destructive" />
                <p className="mt-4 text-sm font-medium text-destructive">
                  Échec de l'enregistrement
                </p>
                <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
                  {saveError}
                </p>
                <button
                  onClick={handleSave}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <RotateCcw className="size-4" />
                  Réessayer
                </button>
                <button
                  onClick={() => {
                    setSaveError(null)
                    setStep('sign_operator')
                  }}
                  className="mt-3 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">Enregistrement en cours...</p>
              </>
            )}
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && location && (
          <ContractSuccess
            type={isAmendment ? 'amendment' : 'contract'}
            contractNumber={contractNumber}
            locationName={location.name}
            onViewPanel={() => navigate(`/app/panels/${panel.id}`, { replace: true })}
          />
        )}
      </div>
    </div>
  )
}
