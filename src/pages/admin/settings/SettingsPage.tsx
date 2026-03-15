import { useState, useEffect, useMemo } from 'react'
import { useCompanySettings, useUpdateCompanySettings, type CompanySettings } from '@/hooks/admin/useCompanySettings'
import { usePanelFormats, useCreatePanelFormat, useUpdatePanelFormat } from '@/hooks/admin/usePanelFormats'
import { useServiceCatalog, useCreateServiceItem, useUpdateServiceItem } from '@/hooks/admin/useServiceCatalog'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { Loader2, Plus, Building2, FileText, Ruler, Package, Upload, Pencil, Check, X } from 'lucide-react'

export function SettingsPage() {
  const { data: settings, isLoading } = useCompanySettings()
  const updateSettings = useUpdateCompanySettings()
  const { data: formats } = usePanelFormats()
  const createFormat = useCreatePanelFormat()
  const updateFormat = useUpdatePanelFormat()
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
      'email', 'phone', 'iban', 'bic', 'quote_prefix', 'invoice_prefix', 'legal_mentions',
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

  // New format
  const [newFormat, setNewFormat] = useState('')

  async function addFormat() {
    if (!newFormat.trim()) return
    try {
      await createFormat.mutateAsync({ name: newFormat.trim() })
      setNewFormat('')
      toast('Format ajouté')
    } catch {
      toast('Erreur (nom peut-être déjà utilisé)', 'error')
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

  // Sorted formats: active first, then inactive
  const sortedFormats = useMemo(() => {
    if (!formats) return []
    return [...formats].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [formats])

  const activeFormatsCount = sortedFormats.filter((f) => f.is_active).length
  const inactiveFormatsCount = sortedFormats.length - activeFormatsCount

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

      {/* Panel Formats */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Ruler className="size-4" />
            Formats de panneaux
            <span className="text-xs font-normal text-muted-foreground">
              {activeFormatsCount} actif{activeFormatsCount !== 1 ? 's' : ''}{inactiveFormatsCount > 0 && `, ${inactiveFormatsCount} inactif${inactiveFormatsCount !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Active formats */}
          <div className="flex flex-wrap gap-2">
            {sortedFormats.filter((f) => f.is_active).map((f) => (
              <button
                key={f.id}
                onClick={() => updateFormat.mutate({ id: f.id, is_active: false })}
                className="rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-medium text-background transition-colors"
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Inactive formats */}
          {inactiveFormatsCount > 0 && (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Inactifs</p>
              <div className="flex flex-wrap gap-2">
                {sortedFormats.filter((f) => !f.is_active).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => updateFormat.mutate({ id: f.id, is_active: true })}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground line-through transition-colors"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Input
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              placeholder="Nouveau format..."
              className="max-w-xs text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addFormat()}
            />
            <Button size="sm" variant="outline" onClick={addFormat} disabled={createFormat.isPending}>
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
    </div>
  )
}
