import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useCompanySettings, useUpdateCompanySettings, type CompanySettings } from '@/hooks/admin/useCompanySettings'
import { usePanelTypes, useCreatePanelType, useDeletePanelType } from '@/hooks/admin/usePanelTypes'
import { useServiceCatalog, useCreateServiceItem, useUpdateServiceItem } from '@/hooks/admin/useServiceCatalog'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { Loader2, Plus, Building2, FileText, Ruler, Package, Upload, Pencil, Check, X, Star, ScrollText } from 'lucide-react'

const RichTextEditor = lazy(() => import('@/components/admin/RichTextEditor').then((m) => ({ default: m.RichTextEditor })))

export function SettingsPage() {
  const { data: settings, isLoading } = useCompanySettings()
  const updateSettings = useUpdateCompanySettings()
  const { data: panelTypes } = usePanelTypes()
  const createType = useCreatePanelType()
  const deleteType = useDeletePanelType()
  const { data: services } = useServiceCatalog()
  const createService = useCreateServiceItem()
  const updateService = useUpdateServiceItem()

  // Company form
  const [form, setForm] = useState<Partial<CompanySettings>>({})
  const [savingCompany, setSavingCompany] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  // Load logo preview
  useEffect(() => {
    if (!settings?.logo_path) { setLogoPreviewUrl(null); return }
    const { data } = supabase.storage.from('company-assets').getPublicUrl(settings.logo_path)
    if (data?.publicUrl) setLogoPreviewUrl(data.publicUrl)
  }, [settings?.logo_path])

  // Dirty detection
  const isDirty = useMemo(() => {
    if (!settings) return false
    const keys: (keyof CompanySettings)[] = [
      'company_name', 'address', 'city', 'postal_code', 'siret', 'tva_number',
      'email', 'phone', 'iban', 'bic', 'quote_prefix', 'invoice_prefix', 'legal_mentions', 'late_penalty_text', 'terms_and_conditions',
    ]
    return keys.some((k) => (form[k] ?? '') !== (settings[k] ?? ''))
  }, [form, settings])

  // Validation
  const [errors, setErrors] = useState<Partial<Record<keyof CompanySettings, string>>>({})

  function validate(): boolean {
    const errs: Partial<Record<keyof CompanySettings, string>> = {}
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Format email invalide'
    }
    if (form.siret && !/^\d[\d\s]{12,16}\d$/.test(form.siret.replace(/\s/g, '').length === 14 ? form.siret : '')) {
      const cleaned = (form.siret ?? '').replace(/\s/g, '')
      if (cleaned.length > 0 && (cleaned.length !== 14 || !/^\d+$/.test(cleaned))) {
        errs.siret = 'SIRET : 14 chiffres attendus'
      }
    }
    if (form.tva_number) {
      const cleaned = form.tva_number.replace(/\s/g, '')
      if (!/^FR\d{11}$/.test(cleaned)) {
        errs.tva_number = 'Format : FR + 11 chiffres'
      }
    }
    if (form.iban) {
      const cleaned = form.iban.replace(/\s/g, '')
      if (cleaned.length > 0 && (cleaned.length < 15 || cleaned.length > 34)) {
        errs.iban = 'IBAN : entre 15 et 34 caractères'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function saveCompany() {
    if (!validate()) return
    setSavingCompany(true)
    try {
      await updateSettings.mutateAsync({
        company_name: form.company_name,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
        siret: form.siret,
        tva_number: form.tva_number,
        email: form.email,
        phone: form.phone,
        iban: form.iban,
        bic: form.bic,
        quote_prefix: form.quote_prefix,
        invoice_prefix: form.invoice_prefix,
        legal_mentions: form.legal_mentions,
        late_penalty_text: form.late_penalty_text,
        terms_and_conditions: form.terms_and_conditions,
      })
      setErrors({})
      toast('Paramètres enregistrés')
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSavingCompany(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const path = `logo-${crypto.randomUUID()}.${file.name.split('.').pop() || 'png'}`
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadError) throw uploadError
      await updateSettings.mutateAsync({ logo_path: path })
      toast('Logo mis à jour')
    } catch {
      toast("Erreur lors de l'upload du logo", 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  // New panel type
  const [newTypeName, setNewTypeName] = useState('')

  async function addType() {
    if (!newTypeName.trim()) return
    try {
      await createType.mutateAsync({ name: newTypeName.trim() })
      setNewTypeName('')
      toast('Type ajouté')
    } catch {
      toast('Erreur (nom peut-être déjà utilisé)', 'error')
    }
  }

  async function handleDeleteType(id: string) {
    try {
      await deleteType.mutateAsync(id)
      // If the deleted type was the default, clear the default
      if (settings?.default_panel_type_id === id) {
        await updateSettings.mutateAsync({ default_panel_type_id: null })
      }
      toast('Type supprimé')
    } catch {
      toast('Erreur lors de la suppression', 'error')
    }
  }

  async function setDefaultType(id: string | null) {
    try {
      await updateSettings.mutateAsync({ default_panel_type_id: id })
      toast(id ? 'Type par défaut défini' : 'Type par défaut retiré')
    } catch {
      toast('Erreur', 'error')
    }
  }

  // Service form
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceUnit, setNewServiceUnit] = useState('unité')
  const [newServiceTva, setNewServiceTva] = useState('20')

  async function addService() {
    if (!newServiceName.trim()) return
    try {
      await createService.mutateAsync({
        name: newServiceName.trim(),
        unit: newServiceUnit.trim() || 'unité',
        default_tva_rate: parseFloat(newServiceTva) || 20,
      })
      setNewServiceName('')
      setNewServiceUnit('unité')
      setNewServiceTva('20')
      toast('Prestation ajoutée')
    } catch {
      toast('Erreur lors de la création', 'error')
    }
  }

  // Inline editing for services
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editServiceForm, setEditServiceForm] = useState({ name: '', unit: '', default_tva_rate: '' })

  function startEditService(s: { id: string; name: string; unit: string; default_tva_rate: number }) {
    setEditingServiceId(s.id)
    setEditServiceForm({ name: s.name, unit: s.unit, default_tva_rate: String(s.default_tva_rate) })
  }

  async function saveEditService(id: string) {
    try {
      await updateService.mutateAsync({
        id,
        name: editServiceForm.name.trim(),
        unit: editServiceForm.unit.trim(),
        default_tva_rate: parseFloat(editServiceForm.default_tva_rate) || 20,
      })
      setEditingServiceId(null)
      toast('Prestation mise à jour')
    } catch {
      toast('Erreur lors de la mise à jour', 'error')
    }
  }

  // Panel types: only show active ones (soft-deleted are hidden)
  const activeTypes = useMemo(() => {
    if (!panelTypes) return []
    return panelTypes.filter((t) => t.is_active).sort((a, b) => a.name.localeCompare(b.name))
  }, [panelTypes])

  const field = (key: keyof CompanySettings, label: string, placeholder?: string, type?: string) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type={type ?? 'text'}
        value={(form[key] as string) ?? ''}
        onChange={(e) => {
          setForm((f) => ({ ...f, [key]: e.target.value }))
          if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
        }}
        placeholder={placeholder}
        className={`text-sm ${errors[key] ? 'border-red-500' : ''}`}
      />
      {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Paramètres</h1>

      {/* Company Info */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="size-4" />
            Informations société
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); saveCompany() }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {field('company_name', 'Nom de la société', 'OOHMYAD')}
              {field('email', 'Email', 'contact@oohmyad.fr', 'email')}
              {field('phone', 'Téléphone', '01 23 45 67 89', 'tel')}
              {field('address', 'Adresse', '12 rue de Rivoli')}
              {field('city', 'Ville', 'Paris')}
              {field('postal_code', 'Code postal', '75001')}
              {field('siret', 'SIRET', '123 456 789 00012')}
              {field('tva_number', 'Numéro TVA', 'FR12345678901')}
            </div>

            {/* Logo upload */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Logo</label>
              <div className="flex items-center gap-3">
                {logoPreviewUrl && (
                  <img
                    src={logoPreviewUrl}
                    alt="Logo"
                    className="size-10 rounded border border-border object-contain"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => document.getElementById('logo-input')?.click()}
                >
                  {uploadingLogo ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Upload className="mr-2 size-3.5" />}
                  {settings?.logo_path ? 'Changer le logo' : 'Uploader un logo'}
                </Button>
                <input
                  id="logo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" />
              Facturation
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {field('iban', 'IBAN', 'FR76 ...')}
              {field('bic', 'BIC', 'BNPAFRPP')}
              {field('quote_prefix', 'Préfixe devis', 'D')}
              {field('invoice_prefix', 'Préfixe factures', 'F')}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mentions légales</label>
              <textarea
                value={form.legal_mentions ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, legal_mentions: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                placeholder="TVA non applicable, article 293 B du CGI"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Pénalités de retard (affiché sur les PDF)</label>
              <textarea
                value={form.late_penalty_text ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, late_penalty_text: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                placeholder="Pénalités de retard : selon articles L.441-10 et suivants du code du commerce, taux appliqué : 12,15% par an. Une indemnité forfaitaire de 40 € sera due de plein droit dès le premier jour de retard de paiement (Article D. 441-5 du code du commerce)."
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingCompany || !isDirty}>
                {savingCompany && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Enregistrer
              </Button>
              {isDirty && (
                <span className="text-xs text-orange-500">Modifications non enregistrées</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Panel Types */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Ruler className="size-4" />
            Types de panneaux
            <span className="text-xs font-normal text-muted-foreground">
              {activeTypes.length} type{activeTypes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Cliquez sur l'étoile pour définir le type par défaut. Survolez pour supprimer.
          </p>

          <div className="flex flex-wrap gap-2">
            {activeTypes.map((t) => {
              const isDefault = settings?.default_panel_type_id === t.id
              return (
                <div
                  key={t.id}
                  className="group relative flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-foreground/30"
                >
                  <button
                    onClick={() => setDefaultType(isDefault ? null : t.id)}
                    className="mr-0.5"
                    title={isDefault ? 'Retirer le défaut' : 'Définir par défaut'}
                  >
                    <Star className={`size-3 ${isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40 hover:text-yellow-400'}`} />
                  </button>
                  <span>{t.name}</span>
                  <button
                    onClick={() => handleDeleteType(t.id)}
                    className="ml-0.5 hidden text-red-500 hover:text-red-400 group-hover:inline-flex"
                    title="Supprimer ce type"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Nouveau type..."
              className="max-w-xs text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addType()}
            />
            <Button size="sm" variant="outline" onClick={addType} disabled={createType.isPending}>
              <Plus className="mr-1 size-3.5" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Catalog */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4" />
            Catalogue de prestations
          </div>

          <div className="space-y-1">
            {services?.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50">
                {editingServiceId === s.id ? (
                  <>
                    <Input
                      value={editServiceForm.name}
                      onChange={(e) => setEditServiceForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-7 flex-1 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && saveEditService(s.id)}
                    />
                    <Input
                      value={editServiceForm.unit}
                      onChange={(e) => setEditServiceForm((f) => ({ ...f, unit: e.target.value }))}
                      className="h-7 w-20 text-sm"
                      placeholder="unité"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        value={editServiceForm.default_tva_rate}
                        onChange={(e) => setEditServiceForm((f) => ({ ...f, default_tva_rate: e.target.value }))}
                        className="h-7 w-16 text-sm"
                        type="number"
                        step="0.1"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <button onClick={() => saveEditService(s.id)} className="text-green-600 hover:text-green-500">
                      <Check className="size-4" />
                    </button>
                    <button onClick={() => setEditingServiceId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Badge
                      variant={s.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer text-[10px]"
                      onClick={() => updateService.mutate({ id: s.id, is_active: !s.is_active })}
                    >
                      {s.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <span className={`flex-1 text-sm ${!s.is_active ? 'text-muted-foreground line-through' : ''}`}>
                      {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.unit}</span>
                    <span className="text-xs text-muted-foreground">{s.default_tva_rate}%</span>
                    <button
                      onClick={() => startEditService(s)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Nom</label>
              <Input
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Nouvelle prestation..."
                className="w-48 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addService()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Unité</label>
              <Input
                value={newServiceUnit}
                onChange={(e) => setNewServiceUnit(e.target.value)}
                placeholder="unité"
                className="w-24 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addService()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">TVA %</label>
              <Input
                value={newServiceTva}
                onChange={(e) => setNewServiceTva(e.target.value)}
                placeholder="20"
                type="number"
                step="0.1"
                className="w-20 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addService()}
              />
            </div>
            <Button size="sm" variant="outline" onClick={addService} disabled={createService.isPending}>
              <Plus className="mr-1 size-3.5" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CGV */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ScrollText className="size-4" />
            Conditions générales de vente
          </div>
          <p className="text-xs text-muted-foreground">
            Éditez vos CGV ci-dessous. Elles seront ajoutées en page 2 des devis et factures (si activé).
          </p>
          <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}>
            <RichTextEditor
              content={form.terms_and_conditions ?? ''}
              onChange={(html) => setForm((f) => ({ ...f, terms_and_conditions: html }))}
              placeholder="Saisissez vos conditions générales de vente..."
            />
          </Suspense>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              disabled={savingCompany || !isDirty}
              onClick={saveCompany}
            >
              {savingCompany && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Enregistrer les CGV
            </Button>
            {isDirty && (
              <span className="text-xs text-orange-500">Modifications non enregistrées</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
