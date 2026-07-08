import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Trash2, XCircle } from 'lucide-react'
import { useErrorLogs, useMarkErrorResolved, useDeleteErrorLog, type ErrorLog } from '@/hooks/admin/useErrorLogs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/shared/Toast'
import { useConfirm } from '@/components/shared/ConfirmDialog'

const CONTEXT_LABELS: Record<string, string> = {
  install: 'Install',
  scan: 'Scan',
  pdf: 'PDF',
  offline_replay: 'Offline',
  auth: 'Auth',
  other: 'Autre',
}

const CONTEXT_COLORS: Record<string, string> = {
  install: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  scan: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
  pdf: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  offline_replay: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  auth: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300',
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days}j`
  return date.toLocaleDateString('fr-FR')
}

export function LogsPage() {
  const [contextFilter, setContextFilter] = useState<string>('all')
  const [onlyUnresolved, setOnlyUnresolved] = useState(true)
  const [selected, setSelected] = useState<ErrorLog | null>(null)

  const { data: logs = [], isLoading } = useErrorLogs({
    context: contextFilter,
    onlyUnresolved,
    limit: 200,
  })
  const markResolved = useMarkErrorResolved()
  const deleteLog = useDeleteErrorLog()
  const confirm = useConfirm()

  const contexts = useMemo(() => {
    const set = new Set(logs.map((l) => l.context))
    return ['all', ...Array.from(set)]
  }, [logs])

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Supprimer ce log ?',
      description: "L'erreur sera définitivement retirée de la base.",
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteLog.mutateAsync(id)
      if (selected?.id === id) setSelected(null)
      toast('Log supprimé', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur suppression', 'error')
    }
  }

  async function toggleResolved(log: ErrorLog) {
    try {
      await markResolved.mutateAsync({ id: log.id, resolved: !log.resolved })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur mise à jour', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {contexts.map((ctx) => (
              <button
                key={ctx}
                onClick={() => setContextFilter(ctx)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  contextFilter === ctx
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {ctx === 'all' ? 'Tous' : CONTEXT_LABELS[ctx] ?? ctx}
              </button>
            ))}
            <div className="mx-2 h-4 w-px bg-border" />
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyUnresolved}
                onChange={(e) => setOnlyUnresolved(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Non résolus uniquement
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Logs list + detail split */}
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="mb-3 size-10 text-green-500" />
                <p className="text-sm font-medium">Aucune erreur</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {onlyUnresolved ? 'Tout est résolu !' : 'Rien à afficher pour ce filtre.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                      selected?.id === log.id ? 'bg-muted/60' : ''
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${log.resolved ? 'text-green-500' : 'text-red-500'}`}>
                      {log.resolved ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`${CONTEXT_COLORS[log.context] ?? CONTEXT_COLORS.other} border-transparent`}>
                          {CONTEXT_LABELS[log.context] ?? log.context}
                        </Badge>
                        <span className="truncate text-xs font-mono text-muted-foreground">{log.action}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm">{log.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{formatRelativeDate(log.created_at)}</span>
                        {log.author?.full_name && (
                          <>
                            <span>·</span>
                            <span>{log.author.full_name}</span>
                          </>
                        )}
                        {log.user_role && (
                          <>
                            <span>·</span>
                            <span>{log.user_role}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selected && (
          <Card className="sticky top-4 h-fit">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge className={`${CONTEXT_COLORS[selected.context] ?? CONTEXT_COLORS.other} border-transparent`}>
                    {CONTEXT_LABELS[selected.context] ?? selected.context}
                  </Badge>
                  <p className="mt-2 text-xs font-mono text-muted-foreground">{selected.action}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(selected.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Fermer"
                >
                  <XCircle className="size-4" />
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Message</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{selected.message}</p>
              </div>

              {(selected.author?.full_name || selected.user_role) && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Utilisateur</p>
                  <p className="mt-1 text-sm">
                    {selected.author?.full_name ?? '—'}
                    {selected.user_role && <span className="ml-1 text-muted-foreground">({selected.user_role})</span>}
                  </p>
                </div>
              )}

              {selected.url && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">URL</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{selected.url}</p>
                </div>
              )}

              {selected.user_agent && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Appareil</p>
                  <p className="mt-1 break-all text-[11px] text-muted-foreground">{selected.user_agent}</p>
                </div>
              )}

              {selected.details && Object.keys(selected.details).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Détails</p>
                  <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-2 text-[11px]">
                    {JSON.stringify(selected.details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 border-t border-border pt-3">
                <Button
                  variant={selected.resolved ? 'outline' : 'default'}
                  onClick={() => toggleResolved(selected)}
                  className="flex-1"
                  disabled={markResolved.isPending}
                >
                  {selected.resolved ? 'Marquer non résolu' : 'Marquer résolu'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDelete(selected.id)}
                  disabled={deleteLog.isPending}
                  aria-label="Supprimer"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
