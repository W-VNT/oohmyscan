import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  useInfiniteQRStock,
  useQRStockFilteredCount,
  useQRStockStats,
  useGenerateQRCodes,
  useDeleteQRCodes,
  fetchAllQRIds,
  fetchQRsInSerialRange,
  fetchQRsByIds,
  type QRStockFilter,
  type QRStockSort,
} from '@/hooks/admin/useQRStock'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/shared/Toast'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { QrCode, Plus, Search, Loader2, Hash, CheckCircle2, Circle, Copy, Printer, FileArchive, X, Trash2, Download, Filter, ArrowUpDown, CheckSquare } from 'lucide-react'
import QRCodeLib from 'qrcode'
import { pdf } from '@react-pdf/renderer'
import { DymoQRPDF } from '@/lib/pdf/DymoQRPDF'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function QRPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<QRStockFilter>('all')
  const [sort, setSort] = useState<QRStockSort>('serial-desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  // Fetch server-side paginé
  const infiniteOpts = useMemo(
    () => ({ filter, sort, search: debouncedSearch }),
    [filter, sort, debouncedSearch],
  )
  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQRStock(infiniteOpts)
  const { data: filteredCount } = useQRStockFilteredCount(infiniteOpts)
  const { data: stats } = useQRStockStats()
  const generateQR = useGenerateQRCodes()
  const deleteQR = useDeleteQRCodes()
  const confirm = useConfirm()

  const items = useMemo(
    () => (infiniteData?.pages ?? []).flatMap((p) => p.items),
    [infiniteData],
  )

  // Generate popover
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateCount, setGenerateCount] = useState(14)

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Range selection popover
  const [showRange, setShowRange] = useState(false)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  useEffect(() => {
    setSelected(new Set())
  }, [filter, debouncedSearch])

  const hasActiveFilters = !!debouncedSearch.trim() || filter !== 'all'

  // Infinite scroll sentinel — fetchNextPage quand visible
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setFilter('all')
  }

  async function selectAllFiltered() {
    try {
      const ids = await fetchAllQRIds(infiniteOpts)
      setSelected(new Set(ids))
      toast(`${ids.length} QR sélectionné${ids.length > 1 ? 's' : ''}`)
    } catch {
      toast('Erreur lors de la sélection', 'error')
    }
  }

  async function applyRangeSelection() {
    const from = parseInt(rangeFrom, 10)
    const to = parseInt(rangeTo, 10)
    if (!from || !to) {
      toast('Renseigne les 2 numéros', 'error')
      return
    }
    try {
      const rows = await fetchQRsInSerialRange(from, to)
      if (rows.length === 0) {
        toast('Aucun QR dans cette plage', 'error')
        return
      }
      const [lo, hi] = from <= to ? [from, to] : [to, from]
      setSelected(new Set(rows.map((r) => r.id)))
      setShowRange(false)
      setRangeFrom('')
      setRangeTo('')
      toast(`${rows.length} QR sélectionnés (#${lo} → #${hi})`)
    } catch {
      toast('Erreur lors de la sélection', 'error')
    }
  }

  async function handleGenerate() {
    if (generateCount < 1 || generateCount > 500) {
      toast('Entrez un nombre entre 1 et 500', 'error')
      return
    }
    try {
      const result = await generateQR.mutateAsync(generateCount)
      toast(`${result.length} QR codes générés`)
      setShowGenerate(false)
    } catch {
      toast('Erreur lors de la génération', 'error')
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllVisible() {
    // Tout selectionner ce qui est chargé actuellement (pas juste la première page)
    if (items.length > 0 && items.every((i) => selected.has(i.id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map((i) => i.id)))
    }
  }

  async function handleExportDymo() {
    if (selected.size === 0) return
    setExporting(true)
    setShowExportMenu(false)
    try {
      // Résout les data des IDs sélectionnés (peut couvrir des pages non chargées)
      const rows = await fetchQRsByIds(Array.from(selected))
      const appUrl = import.meta.env.VITE_APP_URL || 'https://oohmyscan.vercel.app'
      const labels = await Promise.all(
        rows.map(async (item) => {
          const qrDataUrl = await QRCodeLib.toDataURL(`${appUrl}/app/scan?id=${item.uuid_code}`, {
            width: 300, margin: 1, color: { dark: '#000000', light: '#FFFFFF' },
          })
          return { qrDataUrl, serial: item.serial_number }
        }),
      )
      const blob = await pdf(<DymoQRPDF labels={labels} />).toBlob()
      saveAs(blob, `qr-dymo-${rows.length}.pdf`)
      toast(`PDF Dymo — ${rows.length} étiquette${rows.length !== 1 ? 's' : ''}`)
    } catch {
      toast('Erreur lors de la génération', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportZipPNG() {
    if (selected.size === 0) return
    setExporting(true)
    setShowExportMenu(false)
    try {
      const rows = await fetchQRsByIds(Array.from(selected))
      const zip = new JSZip()
      const appUrl = import.meta.env.VITE_APP_URL || 'https://oohmyscan.vercel.app'
      for (const item of rows) {
        const dataUrl = await QRCodeLib.toDataURL(`${appUrl}/app/scan?id=${item.uuid_code}`, {
          width: 600, margin: 2, color: { dark: '#000000', light: '#FFFFFF' },
        })
        zip.file(`qr-${item.uuid_code.slice(0, 8)}.png`, dataUrl.split(',')[1], { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, `qr-codes-${rows.length}.zip`)
      toast(`ZIP — ${rows.length} QR code${rows.length !== 1 ? 's' : ''}`)
    } catch {
      toast('Erreur lors de l\'export', 'error')
    } finally {
      setExporting(false)
    }
  }

  // Filtre sélection non-assignée à partir des items chargés (approximation).
  // Le delete server-side a un .eq('is_assigned', false) pour la sécurité.
  const selectedUnassignedIds = useMemo(() => {
    return items.filter((i) => selected.has(i.id) && !i.is_assigned).map((i) => i.id)
  }, [items, selected])

  async function handleDelete() {
    if (selected.size === 0) return
    const ok = await confirm({
      title: `Supprimer les QR sélectionnés ?`,
      description:
        'Seuls les QR non-assignés seront supprimés (les autres seront ignorés). Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      // On envoie TOUS les IDs sélectionnés — le hook filtre côté SQL les
      // is_assigned=false, donc c'est safe même si certains couvrent des
      // pages non chargées.
      await deleteQR.mutateAsync(Array.from(selected))
      toast('Suppression effectuée')
      setSelected(new Set())
    } catch {
      toast('Erreur lors de la suppression', 'error')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="hidden text-xl font-semibold sm:block">QR Codes</h1>
          <span className="text-sm text-muted-foreground">
            {filteredCount ?? 0}
            {hasActiveFilters && ` / ${stats?.total ?? 0}`} QR code
            {(hasActiveFilters ? (stats?.total ?? 0) : filteredCount ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRange((v) => !v)}>
            <Hash className="mr-1.5 size-4" /> Plage
          </Button>
          <div className="relative">
            <Button onClick={() => setShowGenerate((v) => !v)}>
              <Plus className="mr-1.5 size-4" /> Générer
            </Button>
          {showGenerate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowGenerate(false)}>
              <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl space-y-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Générer des QR codes</h2>
                  <button onClick={() => setShowGenerate(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Nombre</label>
                  <Input
                    type="number" min={1} max={500} value={generateCount}
                    onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                    className="text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">Étiquettes Dymo 450 (36 × 89 mm)</p>
                </div>
                <Button onClick={handleGenerate} disabled={generateQR.isPending} className="w-full">
                  {generateQR.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                  Générer {generateCount} QR codes
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Range selection modal */}
      {showRange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowRange(false)}>
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sélectionner une plage</h2>
              <button onClick={() => setShowRange(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sélectionne les QR par numéro (dans la liste actuellement affichée, filtres inclus).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-xs font-medium">De</label>
                <Input
                  type="number"
                  min={1}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  placeholder="601"
                  className="text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">À</label>
                <Input
                  type="number"
                  min={1}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  placeholder="1450"
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && applyRangeSelection()}
                />
              </div>
            </div>
            <Button onClick={applyRangeSelection} className="w-full">
              Sélectionner
            </Button>
          </div>
        </div>
      )}

      {/* Stats : slider horizontal sur mobile, grille sur desktop */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:py-0">
        <div className="min-w-[80%] shrink-0 snap-center sm:min-w-0 sm:shrink">
          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Hash className="size-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total générés</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="min-w-[80%] shrink-0 snap-center sm:min-w-0 sm:shrink">
          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats?.assigned ?? 0}</p>
                <p className="text-xs text-muted-foreground">Assignés</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="min-w-[80%] shrink-0 snap-center sm:min-w-0 sm:shrink">
          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Circle className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats?.available ?? 0}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters : search + 2 selects en grid 2 cols sur mobile */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher #N°, UUID ou panneau..."
            className="h-10 pl-9 text-sm sm:h-9 sm:min-w-[240px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as QRStockFilter)}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              <option value="all">Tous ({stats?.total ?? 0})</option>
              <option value="available">Disponibles ({stats?.available ?? 0})</option>
              <option value="assigned">Assignés ({stats?.assigned ?? 0})</option>
            </select>
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as QRStockSort)}
              className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm sm:h-9"
            >
              <option value="serial-desc">N° décroissant</option>
              <option value="serial-asc">N° croissant</option>
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <X className="size-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} sélectionné{selected.size !== 1 ? 's' : ''}</span>
          <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground" title="Tout désélectionner"><X className="size-3.5" /></button>
          {selected.size < (filteredCount ?? 0) && (
            <button
              onClick={selectAllFiltered}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              <CheckSquare className="size-3.5" />
              Tout sélectionner ({filteredCount ?? 0})
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowExportMenu((v) => !v)} disabled={exporting}>
                {exporting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Download className="mr-1.5 size-3.5" />}
                Exporter
              </Button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-popover py-1 shadow-lg">
                    <button onClick={handleExportDymo} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                      <Printer className="size-3.5" /> PDF Dymo
                    </button>
                    <button onClick={handleExportZipPNG} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                      <FileArchive className="size-3.5" /> ZIP PNG
                    </button>
                  </div>
                </>
              )}
            </div>
            {selectedUnassignedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteQR.isPending}>
                <Trash2 className="mr-1.5 size-3.5" /> Supprimer
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={items.length > 0 && items.every((i) => selected.has(i.id))} onChange={toggleSelectAllVisible} className="size-3.5 rounded border-border" />
                </th>
                <th className="px-4 py-2.5 font-medium">N°</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">UUID</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Panneau</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Généré le</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    {hasActiveFilters ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <QrCode className="size-8" />
                        <p>Aucun QR code trouvé</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                          <QrCode className="size-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium">Aucun QR code généré</h3>
                          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                            Génère des QR codes pour les imprimer sur étiquettes Dymo et les
                            scanner sur le terrain via l'app opérateur.
                          </p>
                        </div>
                        <Button size="sm" onClick={() => setShowGenerate(true)}>
                          <Plus className="mr-1.5 size-4" />
                          Générer des QR codes
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="size-3.5 rounded border-border" />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        #{item.serial_number}
                      </span>
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {item.uuid_code.slice(0, 8)}...{item.uuid_code.slice(-4)}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={item.is_assigned ? 'default' : 'secondary'}>
                        {item.is_assigned ? 'Assigné' : 'Disponible'}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-2.5 md:table-cell">
                      {item.panels?.reference ? (
                        <Link to={`/admin/panels/${item.panel_id}`} className="text-primary hover:underline">{item.panels.reference}</Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                      {new Date(item.generated_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => { navigator.clipboard.writeText(item.uuid_code); toast('UUID copié') }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Copier l'UUID">
                        <Copy className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Infinite scroll sentinel + status */}
      <div ref={sentinelRef} className="flex items-center justify-center py-4 text-xs text-muted-foreground">
        {isFetchingNextPage ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            Chargement…
          </span>
        ) : hasNextPage ? (
          <span>Défile pour charger plus</span>
        ) : items.length > 0 ? (
          <span>Fin de la liste — {items.length} QR chargés</span>
        ) : null}
      </div>
    </div>
  )
}
