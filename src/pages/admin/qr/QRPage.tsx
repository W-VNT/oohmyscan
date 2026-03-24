import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQRStock, useQRStockStats, useGenerateQRCodes, useDeleteQRCodes } from '@/hooks/admin/useQRStock'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/shared/Toast'
import { QrCode, Plus, Search, Loader2, Hash, CheckCircle2, Circle, Copy, Printer, FileArchive, X, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import QRCodeLib from 'qrcode'
import { pdf } from '@react-pdf/renderer'
import { DymoQRPDF } from '@/lib/pdf/DymoQRPDF'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

type SortOption = 'newest' | 'oldest' | 'uuid' | 'status'
type FilterOption = 'all' | 'available' | 'assigned'

const PAGE_SIZE = 25

export function QRPage() {
  const { data: qrItems, isLoading } = useQRStock()
  const { data: stats } = useQRStockStats()
  const generateQR = useGenerateQRCodes()
  const deleteQR = useDeleteQRCodes()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<FilterOption>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(0)

  // Generate popover
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateCount, setGenerateCount] = useState(14)

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(0)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  useEffect(() => {
    setSelected(new Set())
    setPage(0)
  }, [filter, debouncedSearch])

  const filtered = useMemo(() => {
    if (!qrItems) return []
    let result = qrItems
    if (filter === 'available') result = result.filter((q) => !q.is_assigned)
    if (filter === 'assigned') result = result.filter((q) => q.is_assigned)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (item) =>
          item.uuid_code.toLowerCase().includes(q) ||
          item.panels?.reference?.toLowerCase().includes(q),
      )
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
        case 'oldest': return new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()
        case 'uuid': return a.uuid_code.localeCompare(b.uuid_code)
        case 'status': return Number(a.is_assigned) - Number(b.is_assigned)
        default: return 0
      }
    })
  }, [qrItems, debouncedSearch, filter, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

  function toggleSelectAll() {
    if (selected.size === paginated.length && paginated.every((i) => selected.has(i.id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paginated.map((i) => i.id)))
    }
  }

  async function handleExportDymo() {
    const items = filtered.filter((i) => selected.has(i.id))
    if (items.length === 0) return
    setExporting(true)
    setShowExportMenu(false)
    try {
      const appUrl = import.meta.env.VITE_APP_URL || 'https://oohmyscan.vercel.app'
      const labels = await Promise.all(
        items.map(async (item) => {
          const qrDataUrl = await QRCodeLib.toDataURL(`${appUrl}/scan?id=${item.uuid_code}`, {
            width: 300, margin: 1, color: { dark: '#000000', light: '#FFFFFF' },
          })
          return { qrDataUrl }
        }),
      )
      const blob = await pdf(<DymoQRPDF labels={labels} />).toBlob()
      saveAs(blob, `qr-dymo-${items.length}.pdf`)
      toast(`PDF Dymo — ${items.length} étiquette${items.length !== 1 ? 's' : ''}`)
    } catch {
      toast('Erreur lors de la génération', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportZipPNG() {
    const items = filtered.filter((i) => selected.has(i.id))
    if (items.length === 0) return
    setExporting(true)
    setShowExportMenu(false)
    try {
      const zip = new JSZip()
      const appUrl = import.meta.env.VITE_APP_URL || 'https://oohmyscan.vercel.app'
      for (const item of items) {
        const dataUrl = await QRCodeLib.toDataURL(`${appUrl}/scan?id=${item.uuid_code}`, {
          width: 600, margin: 2, color: { dark: '#000000', light: '#FFFFFF' },
        })
        zip.file(`qr-${item.uuid_code.slice(0, 8)}.png`, dataUrl.split(',')[1], { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, `qr-codes-${items.length}.zip`)
      toast(`ZIP — ${items.length} QR code${items.length !== 1 ? 's' : ''}`)
    } catch {
      toast('Erreur lors de l\'export', 'error')
    } finally {
      setExporting(false)
    }
  }

  const selectedUnassigned = useMemo(() => {
    if (!qrItems) return []
    return qrItems.filter((i) => selected.has(i.id) && !i.is_assigned)
  }, [qrItems, selected])

  async function handleDelete() {
    if (selectedUnassigned.length === 0) return
    if (!window.confirm(`Supprimer ${selectedUnassigned.length} QR code${selectedUnassigned.length !== 1 ? 's' : ''} ?`)) return
    try {
      await deleteQR.mutateAsync(selectedUnassigned.map((i) => i.id))
      toast(`${selectedUnassigned.length} QR code${selectedUnassigned.length !== 1 ? 's' : ''} supprimé${selectedUnassigned.length !== 1 ? 's' : ''}`)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">QR Codes</h1>
          <span className="text-sm text-muted-foreground">{qrItems?.length ?? 0}</span>
        </div>
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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

      {/* Filters + Selection actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Rechercher UUID ou panneau..." className="h-9 pl-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {(['all', 'available', 'assigned'] as const).map((f) => (
            <button
              key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {f === 'all' ? `Tous (${qrItems?.length ?? 0})` : f === 'available' ? `Dispo (${stats?.available ?? 0})` : `Assignés (${stats?.assigned ?? 0})`}
            </button>
          ))}
        </div>
        <select
          value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
          className="flex h-9 appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="newest">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="uuid">UUID</option>
          <option value="status">Statut</option>
        </select>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} sélectionné{selected.size !== 1 ? 's' : ''}</span>
          <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
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
            {selectedUnassigned.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteQR.isPending}>
                <Trash2 className="mr-1.5 size-3.5" /> Supprimer ({selectedUnassigned.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={paginated.length > 0 && paginated.every((i) => selected.has(i.id))} onChange={toggleSelectAll} className="size-3.5 rounded border-border" />
                </th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">UUID</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Statut</th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground md:table-cell">Panneau</th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground md:table-cell">Généré le</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <QrCode className="mx-auto mb-2 size-8" />
                    {debouncedSearch || filter !== 'all' ? 'Aucun QR code trouvé' : 'Aucun QR code généré'}
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="size-3.5 rounded border-border" />
                    </td>
                    <td className="px-4 py-2.5">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
