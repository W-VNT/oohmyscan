import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampaigns, useCreateCampaign } from '@/hooks/useCampaigns'
import { useClients } from '@/hooks/admin/useClients'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Plus, X, Megaphone } from 'lucide-react'
import { toast } from '@/components/shared/Toast'
import type { CampaignStatus } from '@/lib/constants'

const statusLabels: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-500/15 text-gray-500' },
  active: { label: 'Active', className: 'bg-green-500/15 text-green-600' },
  completed: { label: 'Terminée', className: 'bg-blue-500/15 text-blue-600' },
  cancelled: { label: 'Annulée', className: 'bg-red-500/15 text-red-600' },
}

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: clients } = useClients()
  const createCampaign = useCreateCampaign()
  const { session } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    client_id: '',
    description: '',
    start_date: '',
    end_date: '',
  })
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const selectedClient = clients?.find((c) => c.id === form.client_id)

    try {
      await createCampaign.mutateAsync({
        name: form.name,
        client: selectedClient?.company_name ?? '',
        client_id: form.client_id || null,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date,
        status: 'draft',
        created_by: session?.user?.id,
      })
      toast('Campagne créée')
      setShowForm(false)
      setForm({ name: '', client_id: '', description: '', start_date: '', end_date: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campagnes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Annuler' : 'Nouvelle campagne'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Campagne été 2026"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client *</label>
              <select
                required
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionner un client</option>
                {clients?.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date début *</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date fin *</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description de la campagne..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive-foreground">{error}</p>
          )}
          <button
            type="submit"
            disabled={createCampaign.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createCampaign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer la campagne
          </button>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !campaigns?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Megaphone className="h-12 w-12" />
          <p className="mt-4">Aucune campagne</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const status = statusLabels[campaign.status as CampaignStatus]
            const clientName = campaign.clients?.company_name ?? campaign.client
            return (
              <Link
                key={campaign.id}
                to={`/admin/campaigns/${campaign.id}`}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{clientName}</p>
                <div className="mt-3 text-xs text-muted-foreground">
                  {new Date(campaign.start_date).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
