import { useState, useMemo } from 'react'
import { useQRStock, useQRStockStats, useGenerateQRCodes } from '@/hooks/admin/useQRStock'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/shared/Toast'
import { QrCode, Plus, Search, Loader2, Hash, CheckCircle2, Circle, Copy, Printer, FileArchive } from 'lucide-react'
import QRCodeLib from 'qrcode'
import { pdf } from '@react-pdf/renderer'
import { DymoQRPDF } from '@/lib/pdf/DymoQRPDF'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function QRPage() {
  const { data: qrItems, isLoading } = useQRStock()
  const { data: stats } = useQRStockStats()
  const generateQR = useGenerateQRCodes()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'assigned'>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [generateCount, setGenerateCount] = useState(14)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const filtered = useMemo(() => {
    if (!qrItems) return []
    let result = qrItems
    if (filter === 'available') result = result.filter((q) => !q.is_assigned)
    if (filter === 'assigned') result = result.filter((q) => q.is_assigned)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (item) =>
          item.uuid_code.toLowerCase().includes(q) ||
          item.panels?.reference?.toLowerCase().includes(q),
      )
    }
    return result
  }, [qrItems, search, filter])

  async function handleGenerate() {
    if (generateCount < 1 || generateCount > 500) {
      toast('Entrez un nombre entre 1 et 500', 'error')
      return
    }
    try {
      const result = await generateQR.mutateAsync(generateCount)
      toast(`${result.length} QR codes générés`)
      setSheetOpen(false)
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
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((i) => i.id)))
    }
  }

  async function handleExportDymo() {
    const items = filtered.filter((i) => selected.has(i.id))
    if (items.length === 0) {
      toast('Sélectionnez au moins un QR code', 'error')
      return
    }
    setExporting(true)
    try {
      const appUrl = import.meta.env.VITE_APP_URL || 'https://oohmyscan.vercel.app'
      const labels = await Promise.all(
        items.map(async (item) => {
          const qrDataUrl = await QRCodeLib.toDataURL(`${appUrl}/scan?id=${item.uuid_code}`, {
            width: 300,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' },
          })
          return { qrDataUrl }
        }),
      )
      const blob = await pdf(<DymoQRPDF labels={labels} />).toBlob()
      saveAs(blob, `qr-dymo-${items.length}.pdf`)
      toast(`PDF généré — ${items.length} étiquette${items.length !== 1 ? 's' : ''}`)
    } catch (err) {
      console.error('Dymo PDF export error:', err)
      toast('Erreur lors de la génération du PDF', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportZipPNG() {
    const items = filtered.filter((i) => selected.has(i.id))
    if (items.length === 0) {
      toast('Sélectionnez au moins un QR code', 'error')
      return
    }
    setExporting(true)
    try {
      const zip = new JSZip()
      const appUrl = import.meta.env.VITE_APP_URL || 'https://oohmyscan.vercel.app'

      for (const item of items) {
        const dataUrl = await QRCodeLib.toDataURL(`${appUrl}/scan?id=${item.uuid_code}`, {
          width: 600,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        })
        // Extract base64 from data URL
        const base64 = dataUrl.split(',')[1]
        zip.file(`qr-${item.uuid_code.slice(0, 8)}.png`, base64, { base64: true })
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, `qr-codes-${items.length}.zip`)
      toast(`ZIP exporté — ${items.length} QR code${items.length !== 1 ? 's' : ''}`)
    } catch {
      toast('Erreur lors de l\'export ZIP', 'error')
    } finally {
      setExporting(false)
    }
  }

  function copyUUID(uuid: string) {
    navigator.clipboard.writeText(uuid)
    toast('UUID copié')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">QR Codes</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="outline" onClick={handleExportDymo} disabled={exporting}>
                {exporting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Printer className="mr-1.5 size-4" />}
                Dymo ({selected.size})
              </Button>
              <Button variant="outline" onClick={handleExportZipPNG} disabled={exporting}>
                {exporting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <FileArchive className="mr-1.5 size-4" />}
                ZIP PNG ({selected.size})
              </Button>
            </>
          )}
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Générer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
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
          <CardContent className="flex items-center gap-3 pt-6">
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
          <CardContent className="flex items-center gap-3 pt-6">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher UUID ou panneau..."
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'available', 'assigned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'available' ? 'Disponibles' : 'Assignés'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="size-3.5 rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">UUID</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Panneau</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Généré le</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <QrCode className="mx-auto mb-2 size-8" />
                      {search || filter !== 'all' ? 'Aucun QR code trouvé' : 'Aucun QR code généré'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="size-3.5 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {item.uuid_code.slice(0, 8)}...{item.uuid_code.slice(-4)}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.is_assigned ? 'default' : 'secondary'}>
                          {item.is_assigned ? 'Assigné' : 'Disponible'}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {item.panels?.reference ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {new Date(item.generated_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyUUID(item.uuid_code)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Copier l'UUID"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {filtered.length} QR code{filtered.length !== 1 ? 's' : ''}
        {(search || filter !== 'all') && ` sur ${qrItems?.length ?? 0}`}
      </p>

      {/* Generate Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Générer des QR codes</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nombre de QR codes</label>
              <Input
                type="number"
                min={1}
                max={500}
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                1 QR = 1 étiquette Dymo 450 (36 x 89 mm)
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs font-medium">Récapitulatif</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QR à générer</span>
                  <span className="font-medium tabular-nums">{generateCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Étiquettes Dymo</span>
                  <span className="font-medium tabular-nums">{generateCount}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateQR.isPending}
              className="w-full"
            >
              {generateQR.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Générer {generateCount} QR code{generateCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
