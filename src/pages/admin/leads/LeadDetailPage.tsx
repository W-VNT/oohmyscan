import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  useLead,
  useLeads,
  useUpdateLead,
  useDeleteLead,
  LEAD_STATUS_LABELS,
  LEAD_SUPPORT_LABELS,
  type LeadStatus,
} from '@/hooks/admin/useLeads'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import {
  ArrowLeft, Loader2, Mail, Trash2, Save, ChevronLeft, ChevronRight, UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: LeadStatus[] = ['nouveau', 'contacte', 'converti', 'perdu', 'spam']

const STATUS_BADGE_STYLE: Record<LeadStatus, string> = {
  nouveau:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
  contacte:
    'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300',
  converti:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300',
  perdu:
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400',
  spam: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: lead, isLoading } = useLead(id)
  const { data: allLeads } = useLeads()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()

  const [status, setStatus] = useState<LeadStatus>('nouveau')
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Prev / Next dans l'ordre par defaut (date desc)
  const { prevId, nextId, currentIndex, total } = useMemo(() => {
    if (!allLeads || !id) return { prevId: null, nextId: null, currentIndex: -1, total: 0 }
    const idx = allLeads.findIndex((l) => l.id === id)
    if (idx === -1) return { prevId: null, nextId: null, currentIndex: -1, total: allLeads.length }
    return {
      prevId: idx > 0 ? allLeads[idx - 1].id : null,
      nextId: idx < allLeads.length - 1 ? allLeads[idx + 1].id : null,
      currentIndex: idx,
      total: allLeads.length,
    }
  }, [allLeads, id])

  useEffect(() => {
    if (lead) {
      setStatus(lead.status)
      setNotes(lead.notes ?? '')
      // Marquer auto comme lu à l'ouverture
      if (!lead.is_read) {
        updateLead.mutate({ id: lead.id, is_read: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id])

  if (isLoading || !lead) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const supportLabel = lead.support_interest
    ? LEAD_SUPPORT_LABELS[lead.support_interest] ?? lead.support_interest
    : '—'

  const isDirty = status !== lead.status || (notes || '') !== (lead.notes ?? '')

  async function handleSave() {
    if (!lead) return
    await updateLead.mutateAsync({
      id: lead.id,
      status,
      notes: notes.trim() || null,
    })
    toast('Lead mis à jour')
  }

  async function handleQuickStatus(next: LeadStatus) {
    if (!lead || next === lead.status) return
    setStatus(next)
    await updateLead.mutateAsync({ id: lead.id, status: next })
    toast(`Statut → ${LEAD_STATUS_LABELS[next]}`)
  }

  async function handleDelete() {
    if (!lead) return
    await deleteLead.mutateAsync(lead.id)
    toast('Lead supprimé')
    navigate('/admin/leads')
  }

  function handleConvertToClient() {
    if (!lead) return
    navigate('/admin/clients/new', {
      state: {
        prefill: {
          company_name: lead.company ?? lead.name,
          contact_name: lead.company ? lead.name : null,
          contact_email: lead.email,
          city: lead.city ?? null,
          notes: lead.message ? `Demande initiale : ${lead.message}` : null,
        },
        leadId: lead.id,
      },
    })
  }

  const mailto = `mailto:${lead.email}?subject=${encodeURIComponent(
    `Re: votre demande sur OOH MY AD !`,
  )}&body=${encodeURIComponent(`Bonjour ${lead.name},\n\n`)}`

  return (
    <div className="space-y-6">
      {/* Top nav : back + prev/next */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Tous les leads
        </Link>

        {total > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {currentIndex + 1} / {total}
            </span>
            <button
              onClick={() => prevId && navigate(`/admin/leads/${prevId}`)}
              disabled={!prevId}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Lead précédent"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              onClick={() => nextId && navigate(`/admin/leads/${nextId}`)}
              disabled={!nextId}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Lead suivant"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{lead.name}</h1>
            <span
              className={cn(
                'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                STATUS_BADGE_STYLE[lead.status],
              )}
            >
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>
          {lead.company && <p className="mt-1 text-sm text-muted-foreground">{lead.company}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Reçu le {formatFullDate(lead.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={mailto} className={cn(buttonVariants({ size: 'sm' }))}>
            <Mail className="mr-1.5 size-3.5" /> Répondre par email
          </a>
          <Button size="sm" variant="outline" onClick={handleConvertToClient}>
            <UserPlus className="mr-1.5 size-3.5" /> Convertir en client
          </Button>
        </div>
      </div>

      {/* Détails du lead */}
      <Card>
        <CardContent className="space-y-5">
          <h2 className="text-sm font-semibold">Demande</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Email">
              <a
                href={`mailto:${lead.email}`}
                className="break-all text-sm font-medium text-foreground transition-colors hover:text-[#F5C400]"
              >
                {lead.email}
              </a>
            </Field>
            <Field label="Ville cible">
              <span className="text-sm">{lead.city ?? '—'}</span>
            </Field>
            <Field label="Famille de supports">
              <span className="text-sm">{supportLabel}</span>
            </Field>
          </div>

          <Field label="Message">
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
              {lead.message}
            </p>
          </Field>

          {lead.source && (
            <p className="text-xs text-muted-foreground">
              Source : <span className="font-medium">{lead.source}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card>
        <CardContent className="space-y-5">
          <h2 className="text-sm font-semibold">Suivi</h2>

          {/* Quick status buttons */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Statut
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleQuickStatus(s)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    lead.status === s
                      ? STATUS_BADGE_STYLE[s]
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                  )}
                >
                  {LEAD_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notes internes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Suivi du contact, prochaines étapes, infos utiles..."
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>

          {isDirty && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updateLead.isPending}>
                {updateLead.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Enregistrer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/20">
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold text-destructive">Supprimer définitivement</h2>
          <p className="text-xs text-muted-foreground">
            Ce lead sera supprimé de la base. À utiliser pour les spams ou les doublons.
          </p>
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLead.isPending}
              >
                {deleteLead.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 size-3.5" />
                )}
                Confirmer la suppression
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1.5 size-3.5" />
              Supprimer ce lead
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}
