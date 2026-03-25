import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCompanySettings, useUpdateCompanySettings, type CompanySettings } from '@/hooks/admin/useCompanySettings'
import { usePanelTypes, useCreatePanelType, useDeletePanelType } from '@/hooks/admin/usePanelTypes'
import { useServiceCatalog, useCreateServiceItem, useUpdateServiceItem } from '@/hooks/admin/useServiceCatalog'
import { sanitizeHtml } from '@/lib/sanitize'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { Loader2, Plus, Upload, Pencil, Check, X, Star, Mail } from 'lucide-react'
import { MiniRichEditor } from '@/components/shared/MiniRichEditor'
import { cn } from '@/lib/utils'

const RichTextEditor = lazy(() => import('@/components/admin/RichTextEditor').then((m) => ({ default: m.RichTextEditor })))

const TABS = [
  { key: 'entreprise', label: 'Entreprise' },
  { key: 'documents', label: 'Documents' },
  { key: 'catalogue', label: 'Catalogue' },
  { key: 'types', label: 'Types de panneaux' },
  { key: 'cgv', label: 'CGV' },
  { key: 'email', label: 'Email' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get('tab') as TabKey) || 'entreprise')

  function switchTab(tab: TabKey) {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

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

  useEffect(() => {
    if (!settings?.logo_path) { setLogoPreviewUrl(null); return }
    const { data } = supabase.storage.from('company-assets').getPublicUrl(settings.logo_path)
    if (data?.publicUrl) setLogoPreviewUrl(data.publicUrl)
  }, [settings?.logo_path])

  const isDirty = useMemo(() => {
    if (!settings) return false
    const keys: (keyof CompanySettings)[] = [
      'company_name', 'address', 'city', 'postal_code', 'siret', 'tva_number',
      'email', 'phone', 'iban', 'bic', 'quote_prefix', 'invoice_prefix', 'legal_mentions', 'late_penalty_text', 'terms_and_conditions',
      'resend_api_key', 'email_from', 'email_from_name', 'email_quote_subject', 'email_quote_body', 'email_invoice_subject', 'email_invoice_body',
    ]
    return keys.some((k) => (form[k] ?? '') !== (settings[k] ?? ''))
  }, [form, settings])

  const [errors, setErrors] = useState<Partial<Record<keyof CompanySettings, string>>>({})

  function validate(): boolean {
    const errs: Partial<Record<keyof CompanySettings, string>> = {}
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Format email invalide'
    if (form.siret) {
      const cleaned = (form.siret ?? '').replace(/\s/g, '')
      if (cleaned.length > 0 && (cleaned.length !== 14 || !/^\d+$/.test(cleaned))) errs.siret = 'SIRET : 14 chiffres attendus'
    }
    if (form.tva_number) {
      const cleaned = form.tva_number.replace(/\s/g, '')
      if (!/^FR\d{11}$/.test(cleaned)) errs.tva_number = 'Format : FR + 11 chiffres'
    }
    if (form.iban) {
      const cleaned = form.iban.replace(/\s/g, '')
      if (cleaned.length > 0 && (cleaned.length < 15 || cleaned.length > 34)) errs.iban = 'IBAN : entre 15 et 34 caractères'
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
        resend_api_key: form.resend_api_key,
        email_from: form.email_from,
        email_from_name: form.email_from_name,
        email_quote_subject: form.email_quote_subject,
        email_quote_body: form.email_quote_body,
        email_invoice_subject: form.email_invoice_subject,
        email_invoice_body: form.email_invoice_body,
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
    const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!ALLOWED_MIMES.includes(file.type)) {
      toast('Format non supporté. Utilisez JPG, PNG, WebP ou SVG.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Fichier trop volumineux (max 5 Mo)', 'error')
      return
    }
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

  // Panel types
  const [newTypeName, setNewTypeName] = useState('')
  const activeTypes = useMemo(() => panelTypes?.filter((t) => t.is_active).sort((a, b) => a.name.localeCompare(b.name)) ?? [], [panelTypes])

  async function addType() {
    if (!newTypeName.trim()) return
    try { await createType.mutateAsync({ name: newTypeName.trim() }); setNewTypeName(''); toast('Type ajouté') }
    catch { toast('Erreur (nom peut-être déjà utilisé)', 'error') }
  }
  async function handleDeleteType(id: string) {
    try { await deleteType.mutateAsync(id); if (settings?.default_panel_type_id === id) await updateSettings.mutateAsync({ default_panel_type_id: null }); toast('Type supprimé') }
    catch { toast('Erreur lors de la suppression', 'error') }
  }
  async function setDefaultType(id: string | null) {
    try { await updateSettings.mutateAsync({ default_panel_type_id: id }); toast(id ? 'Type par défaut défini' : 'Type par défaut retiré') }
    catch { toast('Erreur', 'error') }
  }

  // Service catalog
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceUnit, setNewServiceUnit] = useState('unité')
  const [newServiceTva, setNewServiceTva] = useState('20')
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editServiceForm, setEditServiceForm] = useState({ name: '', unit: '', default_tva_rate: '' })

  async function addService() {
    const plainText = newServiceName.replace(/<[^>]+>/g, '').trim()
    if (!plainText) return
    try { await createService.mutateAsync({ name: newServiceName, unit: newServiceUnit.trim() || 'unité', default_tva_rate: parseFloat(newServiceTva) || 20 }); setNewServiceName(''); setNewServiceUnit('unité'); setNewServiceTva('20'); toast('Prestation ajoutée') }
    catch { toast('Erreur lors de la création', 'error') }
  }
  function startEditService(s: { id: string; name: string; unit: string; default_tva_rate: number }) {
    setEditingServiceId(s.id)
    setEditServiceForm({ name: s.name, unit: s.unit, default_tva_rate: String(s.default_tva_rate) })
  }
  async function saveEditService(id: string) {
    try { await updateService.mutateAsync({ id, name: editServiceForm.name.trim(), unit: editServiceForm.unit.trim(), default_tva_rate: parseFloat(editServiceForm.default_tva_rate) || 20 }); setEditingServiceId(null); toast('Prestation mise à jour') }
    catch { toast('Erreur lors de la mise à jour', 'error') }
  }

  const field = (key: keyof CompanySettings, label: string, placeholder?: string, type?: string) => (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <Input
        type={type ?? 'text'}
        value={(form[key] as string) ?? ''}
        onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next }) }}
        placeholder={placeholder}
        className={`text-sm ${errors[key] ? 'border-red-500' : ''}`}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
    </div>
  )

  const saveButton = (label = 'Enregistrer') => (
    <div className="flex items-center gap-3">
      <Button disabled={savingCompany || !isDirty} onClick={saveCompany}>
        {savingCompany && <Loader2 className="mr-2 size-3.5 animate-spin" />}
        {label}
      </Button>
      {isDirty && <span className="text-xs text-orange-500">Modifications non enregistrées</span>}
    </div>
  )

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Paramètres</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === TAB: Entreprise === */}
      {activeTab === 'entreprise' && (
        <Card>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); saveCompany() }} className="space-y-4">
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

              {/* Logo */}
              <div>
                <label className="mb-2 block text-sm font-medium">Logo</label>
                <div className="flex items-center gap-3">
                  {logoPreviewUrl && <img src={logoPreviewUrl} alt="Logo" className="size-10 rounded border border-border object-contain" />}
                  <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => document.getElementById('logo-input')?.click()}>
                    {uploadingLogo ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Upload className="mr-2 size-3.5" />}
                    {settings?.logo_path ? 'Changer le logo' : 'Uploader un logo'}
                  </Button>
                  <input id="logo-input" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>
              </div>

              <Separator />

              <p className="text-sm font-semibold">Coordonnées bancaires</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('iban', 'IBAN', 'FR76 ...')}
                {field('bic', 'BIC', 'BNPAFRPP')}
              </div>

              {saveButton()}
            </form>
          </CardContent>
        </Card>
      )}

      {/* === TAB: Documents === */}
      {activeTab === 'documents' && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold">Numérotation</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {field('quote_prefix', 'Préfixe devis', 'D')}
              {field('invoice_prefix', 'Préfixe factures', 'F')}
            </div>

            <Separator />

            <div>
              <label className="mb-1 block text-sm font-medium">Mentions légales</label>
              <p className="mb-2 text-xs text-muted-foreground">Affichées dans le pied de page des PDF devis et factures.</p>
            </div>
            <textarea
              value={form.legal_mentions ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, legal_mentions: e.target.value }))}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              placeholder="SARL au capital de 156 970 € - APE 7311Z"
            />

            <Separator />

            <div>
              <label className="mb-1 block text-sm font-medium">Pénalités de retard</label>
              <p className="mb-2 text-xs text-muted-foreground">Affichées sous le bloc « Conditions de paiement » sur les PDF.</p>
            </div>
            <textarea
              value={form.late_penalty_text ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, late_penalty_text: e.target.value }))}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              placeholder="Pénalités de retard : selon articles L.441-10..."
            />

            {saveButton()}
          </CardContent>
        </Card>
      )}

      {/* === TAB: Catalogue === */}
      {activeTab === 'catalogue' && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold">Catalogue de prestations</p>

            <div className="space-y-1">
              {services?.map((s) => (
                <div key={s.id} className="rounded-md px-3 py-2 hover:bg-muted/50">
                  {editingServiceId === s.id ? (
                    <div className="space-y-2">
                      <MiniRichEditor value={editServiceForm.name} onChange={(html) => setEditServiceForm((f) => ({ ...f, name: html }))} />
                      <div className="flex items-center gap-2">
                        <Input value={editServiceForm.unit} onChange={(e) => setEditServiceForm((f) => ({ ...f, unit: e.target.value }))} className="h-7 w-24 text-sm" placeholder="unité" />
                        <div className="flex items-center gap-1">
                          <Input value={editServiceForm.default_tva_rate} onChange={(e) => setEditServiceForm((f) => ({ ...f, default_tva_rate: e.target.value }))} className="h-7 w-16 text-sm" type="number" step="0.1" />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <button onClick={() => saveEditService(s.id)} className="text-green-600 hover:text-green-500"><Check className="size-4" /></button>
                        <button onClick={() => setEditingServiceId(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Badge variant={s.is_active ? 'default' : 'secondary'} className="cursor-pointer text-[10px]" onClick={() => updateService.mutate({ id: s.id, is_active: !s.is_active })}>
                        {s.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                      <span className={`flex-1 text-sm [&_p]:my-0 ${!s.is_active ? 'text-muted-foreground line-through' : ''}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.name) }} />
                      <span className="text-xs text-muted-foreground">{s.unit}</span>
                      <span className="text-xs text-muted-foreground">{s.default_tva_rate}%</span>
                      <button onClick={() => startEditService(s)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-5 pt-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Nom de la prestation</label>
                <MiniRichEditor value={newServiceName} onChange={setNewServiceName} placeholder="Nouvelle prestation..." />
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Unité</label>
                  <Input value={newServiceUnit} onChange={(e) => setNewServiceUnit(e.target.value)} placeholder="unité" className="w-32 text-sm" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">TVA %</label>
                  <Input value={newServiceTva} onChange={(e) => setNewServiceTva(e.target.value)} placeholder="20" type="number" step="0.1" className="w-28 text-sm" />
                </div>
                <Button size="sm" variant="outline" onClick={addService} disabled={createService.isPending}>
                  <Plus className="mr-1 size-3.5" /> Ajouter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === TAB: Types de panneaux === */}
      {activeTab === 'types' && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold">Types de panneaux <span className="font-normal text-muted-foreground">({activeTypes.length})</span></p>
            <p className="text-xs text-muted-foreground">Cliquez sur l'étoile pour définir le type par défaut. Survolez pour supprimer.</p>

            <div className="flex flex-wrap gap-2">
              {activeTypes.map((t) => {
                const isDefault = settings?.default_panel_type_id === t.id
                return (
                  <div key={t.id} className="group relative flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-foreground/30">
                    <button onClick={() => setDefaultType(isDefault ? null : t.id)} className="mr-0.5" title={isDefault ? 'Retirer le défaut' : 'Définir par défaut'}>
                      <Star className={`size-3 ${isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40 hover:text-yellow-400'}`} />
                    </button>
                    <span>{t.name}</span>
                    <button onClick={() => handleDeleteType(t.id)} className="ml-0.5 hidden text-red-500 hover:text-red-400 group-hover:inline-flex" title="Supprimer ce type">
                      <X className="size-3" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Nouveau type..." className="max-w-xs text-sm" onKeyDown={(e) => e.key === 'Enter' && addType()} />
              <Button size="sm" variant="outline" onClick={addType} disabled={createType.isPending}>
                <Plus className="mr-1 size-3.5" /> Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === TAB: CGV === */}
      {activeTab === 'cgv' && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold">Conditions générales de vente</p>
            <p className="text-xs text-muted-foreground">
              Ajoutées automatiquement en page 2 des PDF devis et factures.
            </p>
            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}>
              <RichTextEditor
                content={form.terms_and_conditions ?? ''}
                onChange={(html) => setForm((f) => ({ ...f, terms_and_conditions: html }))}
                placeholder="Saisissez vos conditions générales de vente..."
              />
            </Suspense>
            {saveButton()}
          </CardContent>
        </Card>
      )}

      {/* === TAB: Email === */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* Resend config */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="size-4" />
                <p className="text-sm font-semibold">Configuration Resend</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Clé API Resend pour l'envoi des devis et factures par email.
                Obtenez votre clé sur <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a>.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Clé API Resend</label>
                  <Input
                    type="password"
                    value={form.resend_api_key ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, resend_api_key: e.target.value }))}
                    placeholder="re_xxxxxxxxxxxxx"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email d'envoi (from)</label>
                  <Input
                    type="email"
                    value={form.email_from ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, email_from: e.target.value }))}
                    placeholder="facturation@mondomaine.com"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Nom d'affichage</label>
                  <Input
                    value={form.email_from_name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, email_from_name: e.target.value }))}
                    placeholder="OOH MY AD !"
                    className="text-sm"
                  />
                </div>
              </div>
              {saveButton()}
            </CardContent>
          </Card>

          {/* Quote template */}
          <Card>
            <CardContent className="space-y-4">
              <p className="text-sm font-semibold">Template email — Devis</p>
              <p className="text-xs text-muted-foreground">
                Variables disponibles : <code className="rounded bg-muted px-1 text-[10px]">{'{numero}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{client}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{montant_ttc}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{date_validite}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{entreprise}'}</code>
              </p>
              <div>
                  <label className="mb-2 block text-sm font-medium">Objet</label>
                <Input
                  value={form.email_quote_subject ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, email_quote_subject: e.target.value }))}
                  placeholder="Votre devis {numero} — {entreprise}"
                  className="text-sm"
                />
              </div>
              <div>
                  <label className="mb-2 block text-sm font-medium">Corps du mail</label>
                <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}>
                  <RichTextEditor
                    content={form.email_quote_body ?? ''}
                    onChange={(html) => setForm((f) => ({ ...f, email_quote_body: html }))}
                    placeholder="Bonjour, veuillez trouver ci-joint..."
                  />
                </Suspense>
              </div>
              {saveButton()}
            </CardContent>
          </Card>

          {/* Invoice template */}
          <Card>
            <CardContent className="space-y-4">
              <p className="text-sm font-semibold">Template email — Facture</p>
              <p className="text-xs text-muted-foreground">
                Variables disponibles : <code className="rounded bg-muted px-1 text-[10px]">{'{numero}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{client}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{montant_ttc}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{date_echeance}'}</code> <code className="rounded bg-muted px-1 text-[10px]">{'{entreprise}'}</code>
              </p>
              <div>
                  <label className="mb-2 block text-sm font-medium">Objet</label>
                <Input
                  value={form.email_invoice_subject ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, email_invoice_subject: e.target.value }))}
                  placeholder="Votre facture {numero} — {entreprise}"
                  className="text-sm"
                />
              </div>
              <div>
                  <label className="mb-2 block text-sm font-medium">Corps du mail</label>
                <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}>
                  <RichTextEditor
                    content={form.email_invoice_body ?? ''}
                    onChange={(html) => setForm((f) => ({ ...f, email_invoice_body: html }))}
                    placeholder="Bonjour, veuillez trouver ci-joint..."
                  />
                </Suspense>
              </div>
              {saveButton()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
