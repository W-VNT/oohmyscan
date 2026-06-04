import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads, LEAD_STATUS_LABELS, LEAD_SUPPORT_LABELS, type Lead, type LeadStatus } from '@/hooks/admin/useLeads'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { Inbox, Search, Loader2, MailOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | LeadStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'converti', label: 'Converti' },
  { value: 'perdu', label: 'Perdu' },
  { value: 'spam', label: 'Spam' },
]

const STATUS_BADGE_STYLE: Record<LeadStatus, string> = {
  nouveau:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
  contacte:
    'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300',
  converti:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300',
  perdu:
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400',
  spam:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function LeadsPage() {
  const navigate = useNavigate()
  const { data: leads, isLoading } = useLeads()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 200)
  }

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: leads?.length ?? 0,
      nouveau: 0,
      contacte: 0,
      converti: 0,
      perdu: 0,
      spam: 0,
    }
    leads?.forEach((l) => {
      c[l.status] = (c[l.status] ?? 0) + 1
    })
    return c
  }, [leads])

  const filtered = useMemo(() => {
    if (!leads) return []
    let result = leads

    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.message.toLowerCase().includes(q),
      )
    }

    return result
  }, [leads, statusFilter, debouncedSearch])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Leads</h1>
        <span className="text-sm text-muted-foreground">
          {leads?.length ?? 0} demande{(leads?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              statusFilter === f.value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
          >
            {f.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-[11px] tabular-nums',
                statusFilter === f.value ? 'bg-background/15 text-background' : 'bg-muted text-muted-foreground',
              )}
            >
              {counts[f.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Rechercher par nom, email, société, ville, message..."
          className="h-9 pl-9 text-sm"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                    Ville
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">
                    Famille
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Reçue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={Inbox}
                        title={
                          debouncedSearch || statusFilter !== 'all'
                            ? 'Aucun lead trouvé'
                            : 'Aucune demande pour le moment'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const supportLabel = lead.support_interest
    ? LEAD_SUPPORT_LABELS[lead.support_interest] ?? lead.support_interest
    : '—'

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-muted/40"
    >
      <td className="px-4 py-3">
        {!lead.is_read && (
          <span
            className="inline-block h-2 w-2 rounded-full bg-blue-500"
            title="Non lu"
            aria-label="Non lu"
          />
        )}
        {lead.is_read && <MailOpen className="size-3.5 text-muted-foreground/40" />}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium">
          {lead.name}
          {lead.company && <span className="ml-1.5 text-muted-foreground">· {lead.company}</span>}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{lead.email}</div>
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
        {lead.city ?? '—'}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{supportLabel}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
            STATUS_BADGE_STYLE[lead.status],
          )}
        >
          {LEAD_STATUS_LABELS[lead.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
        {formatRelativeDate(lead.created_at)}
      </td>
    </tr>
  )
}
