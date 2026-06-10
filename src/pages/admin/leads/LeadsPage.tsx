import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads, LEAD_STATUS_LABELS, LEAD_SUPPORT_LABELS, type Lead, type LeadStatus } from '@/hooks/admin/useLeads'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Inbox, Search, Loader2, MailOpen, ArrowUpDown, Download, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveAs } from 'file-saver'
import { toast } from '@/components/shared/Toast'

type StatusFilter = 'all' | LeadStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'converti', label: 'Converti' },
  { value: 'perdu', label: 'Perdu' },
  { value: 'spam', label: 'Spam' },
]

const STATUS_ORDER: Record<LeadStatus, number> = {
  nouveau: 0,
  contacte: 1,
  converti: 2,
  perdu: 3,
  spam: 4,
}

type SortOption = 'newest' | 'oldest' | 'name' | 'status'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'name', label: 'Nom A-Z' },
  { value: 'status', label: 'Par statut' },
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

/**
 * Format date avec contexte clair :
 * - Aujourd'hui à 17:22
 * - Hier à 17:22
 * - Il y a 3 j
 * - 3 juin (pour < 1 an)
 * - 3 juin 2025 (pour >= 1 an)
 */
function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `Aujourd'hui ${time}`
  if (diffDays === 1) return `Hier ${time}`
  if (diffDays < 7) return `Il y a ${diffDays} j`
  const isThisYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('fr-FR', isThisYear ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: 'short', year: 'numeric' })
}

export function LeadsPage() {
  const navigate = useNavigate()
  const { data: leads, isLoading } = useLeads()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortOption>('newest')
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

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return a.name.localeCompare(b.name, 'fr')
        case 'status':
          return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
        default:
          return 0
      }
    })

    return result
  }, [leads, statusFilter, debouncedSearch, sort])

  function handleExportCSV() {
    if (!leads?.length) return
    const headers = [
      'date_received',
      'name',
      'company',
      'email',
      'city',
      'support_interest',
      'message',
      'status',
      'notes',
    ]
    const rows = leads.map((l) =>
      headers.map((h) => {
        if (h === 'date_received') return l.created_at
        const val = l[h as keyof Lead]
        return val != null ? String(val) : ''
      }),
    )
    const csv = [
      headers.join(';'),
      ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(';')),
    ].join('\n')
    saveAs(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    toast('CSV exporté')
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header — H1 cache sur mobile (le AdminLayout l'affiche deja en topbar) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <h1 className="text-base font-semibold sm:text-xl">Leads</h1>
          <span className="text-sm text-muted-foreground">
            <span className="sm:hidden">· </span>
            {leads?.length ?? 0}
            <span className="hidden sm:inline"> demande{(leads?.length ?? 0) !== 1 ? 's' : ''}</span>
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCSV}
          disabled={!leads?.length}
        >
          <Download className="mr-1.5 size-3.5" /> Exporter CSV
        </Button>
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom, email, société, ville…"
            className="h-10 pl-9 text-sm sm:h-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} ({counts[f.value] ?? 0})
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile : cards stack — plus mobile-friendly que la table */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <Card className="py-0">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {debouncedSearch || statusFilter !== 'all'
                ? 'Aucun lead trouvé pour ces critères.'
                : 'Aucun lead pour le moment. Les demandes envoyées via le formulaire de contact apparaîtront ici.'}
            </CardContent>
          </Card>
        ) : (
          filtered.map((lead) => (
            <LeadCardMobile
              key={lead.id}
              lead={lead}
              onClick={() => navigate(`/admin/leads/${lead.id}`)}
            />
          ))
        )}
      </div>

      {/* Desktop : table */}
      <Card className="hidden py-0 sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Ville
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">
                    Famille
                  </th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Reçue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      {debouncedSearch || statusFilter !== 'all' ? (
                        <EmptyState icon={Inbox} title="Aucun lead trouvé" />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                            <Inbox className="size-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium">Aucune demande pour le moment</h3>
                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                              Les demandes envoyées via le formulaire de contact de la landing
                              apparaîtront ici. Tu reçois aussi un email à chaque nouvelle
                              demande.
                            </p>
                          </div>
                        </div>
                      )}
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

function LeadCardMobile({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
    >
      {/* Dot non-lu / icone lu */}
      <div className="mt-1 shrink-0">
        {!lead.is_read ? (
          <span
            className="inline-block h-2 w-2 rounded-full bg-blue-500"
            aria-label="Non lu"
          />
        ) : (
          <MailOpen className="size-3.5 text-muted-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {lead.name}
              {lead.company && (
                <span className="ml-1.5 text-sm text-muted-foreground">· {lead.company}</span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
              STATUS_BADGE_STYLE[lead.status],
            )}
          >
            {LEAD_STATUS_LABELS[lead.status]}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{lead.city ?? '—'}</span>
          <span className="shrink-0 tabular-nums">{formatRelativeDate(lead.created_at)}</span>
        </div>
      </div>
    </button>
  )
}

function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const supportLabel = lead.support_interest
    ? LEAD_SUPPORT_LABELS[lead.support_interest] ?? lead.support_interest
    : '—'

  return (
    <tr onClick={onClick} className="cursor-pointer transition-colors hover:bg-muted/40">
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
          {lead.company && (
            <span className="ml-1.5 text-muted-foreground">· {lead.company}</span>
          )}
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
