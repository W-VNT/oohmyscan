import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCampaign } from '@/hooks/useCampaigns'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import { ProofPDF, type ProofData } from '@/lib/pdf/ProofPDF'
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Type,
  Table2,
  ImageIcon,
  MapPin,
  FileDown,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'

// Block types
type ProofBlock =
  | { id: string; type: 'header' }
  | { id: string; type: 'table' }
  | { id: string; type: 'photos'; selectedIds: Set<string> }
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'map' }

// Types for fetched data
type PanelAssignment = {
  id: string
  panel_id: string
  assigned_at: string
  assigned_by: string | null
  validation_photo_path: string | null
  validated_at: string | null
  panels: {
    id: string
    reference: string
    name: string | null
    city: string | null
    lat: number
    lng: number
    status: string
  } | null
}

type CampaignPhoto = {
  id: string
  panel_id: string
  storage_path: string
  photo_type: string
  taken_at: string
}

function useCampaignPanels(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-panels', campaignId],
    queryFn: async (): Promise<PanelAssignment[]> => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, panels(id, reference, name, city, lat, lng, status)')
        .eq('campaign_id', campaignId!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data as unknown as PanelAssignment[]
    },
    enabled: !!campaignId,
  })
}

function useCampaignPhotos(panelIds: string[]) {
  return useQuery({
    queryKey: ['campaign-photos', panelIds],
    queryFn: async (): Promise<CampaignPhoto[]> => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('id, panel_id, storage_path, photo_type, taken_at')
        .in('panel_id', panelIds)
        .order('taken_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: panelIds.length > 0,
  })
}

function getPhotoUrl(storagePath: string) {
  const { data } = supabase.storage.from('panel-photos').getPublicUrl(storagePath)
  return data.publicUrl
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

function getStaticMapUrl(panels: PanelAssignment[]) {
  if (!MAPBOX_TOKEN) return null
  const coords = panels
    .filter((a) => a.panels?.lat && a.panels?.lng)
    .map((a) => a.panels!)

  if (coords.length === 0) return null

  const markers = coords
    .map((p) => `pin-s+2563EB(${p.lng},${p.lat})`)
    .join(',')

  // Auto-fit to markers
  return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${markers}/auto/800x400@2x?padding=40&access_token=${MAPBOX_TOKEN}`
}

// Sortable block wrapper
function SortableBlock({
  block,
  onRemove,
  onUpdate,
  campaign,
  assignments,
  photos,
}: {
  block: ProofBlock
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Record<string, unknown>) => void
  campaign: { name: string; clients?: { company_name: string } | null; start_date: string; end_date: string } | undefined
  assignments: PanelAssignment[]
  photos: CampaignPhoto[]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card className="relative">
        <CardContent className="pt-6">
          {/* Drag handle + delete */}
          <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {block.type !== 'header' && (
              <button
                onClick={() => onRemove(block.id)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </button>
          </div>

          {block.type === 'header' && campaign && (
            <HeaderBlock campaign={campaign} panelCount={assignments.length} />
          )}
          {block.type === 'table' && <TableBlock assignments={assignments} />}
          {block.type === 'photos' && (
            <PhotosBlock
              photos={photos}
              selectedIds={block.selectedIds}
              onToggle={(photoId) => {
                const next = new Set(block.selectedIds)
                if (next.has(photoId)) next.delete(photoId)
                else next.add(photoId)
                onUpdate(block.id, { selectedIds: next } as Record<string, unknown>)
              }}
            />
          )}
          {block.type === 'text' && (
            <TextBlock
              content={block.content}
              onChange={(content) => onUpdate(block.id, { content } as Record<string, unknown>)}
            />
          )}
          {block.type === 'map' && <MapBlock assignments={assignments} />}
        </CardContent>
      </Card>
    </div>
  )
}

function HeaderBlock({
  campaign,
  panelCount,
}: {
  campaign: { name: string; clients?: { company_name: string } | null; start_date: string; end_date: string }
  panelCount: number
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Justificatif de pose
      </p>
      <h2 className="mt-1 text-lg font-bold">{campaign.name}</h2>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <span className="text-muted-foreground">Client : </span>
          <span className="font-medium">{campaign.clients?.company_name ?? ''}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Période : </span>
          <span className="font-medium">
            {new Date(campaign.start_date).toLocaleDateString('fr-FR')} —{' '}
            {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Panneaux : </span>
          <span className="font-medium">{panelCount}</span>
        </div>
      </div>
    </div>
  )
}

function TableBlock({ assignments }: { assignments: PanelAssignment[] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Panneaux posés
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-2 py-2 font-medium text-muted-foreground">Référence</th>
              <th className="px-2 py-2 font-medium text-muted-foreground">Nom</th>
              <th className="px-2 py-2 font-medium text-muted-foreground">Ville</th>
              <th className="px-2 py-2 font-medium text-muted-foreground">Date pose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {assignments.map((a) => (
              <tr key={a.id}>
                <td className="px-2 py-1.5 font-medium">{a.panels?.reference ?? '—'}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{a.panels?.name ?? '—'}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{a.panels?.city ?? '—'}</td>
                <td className="px-2 py-1.5 text-muted-foreground">
                  {new Date(a.assigned_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PhotosBlock({
  photos,
  selectedIds,
  onToggle,
}: {
  photos: CampaignPhoto[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Photos ({selectedIds.size} / {photos.length} sélectionnées)
      </p>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo terrain pour cette campagne</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => onToggle(photo.id)}
              className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                selectedIds.has(photo.id)
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={getPhotoUrl(photo.storage_path)}
                alt={`Preuve de pose — ${photo.photo_type}`}
                className="size-full object-cover"
                loading="lazy"
              />
              {selectedIds.has(photo.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                  <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                    ✓
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TextBlock({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Texte libre
      </p>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Saisir un commentaire..."
        rows={3}
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  )
}

function MapBlock({ assignments }: { assignments: PanelAssignment[] }) {
  const mapUrl = getStaticMapUrl(assignments)

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Carte des panneaux
      </p>
      {mapUrl ? (
        <img src={mapUrl} alt="Carte" className="w-full rounded-lg" />
      ) : (
        <p className="text-sm text-muted-foreground">
          {MAPBOX_TOKEN ? 'Aucun panneau avec coordonnées' : 'Token Mapbox manquant'}
        </p>
      )}
    </div>
  )
}

// Build proof data for PDF
function buildProofData(
  campaign: { name: string; clients?: { company_name: string } | null; start_date: string; end_date: string },
  blocks: ProofBlock[],
  assignments: PanelAssignment[],
  photos: CampaignPhoto[],
): ProofData {
  const photoBlocks = blocks.filter(
    (b): b is ProofBlock & { type: 'photos' } => b.type === 'photos',
  )
  const allSelectedIds = new Set<string>()
  for (const pb of photoBlocks) pb.selectedIds.forEach((id) => allSelectedIds.add(id))

  const selectedPhotos = photos.filter((p) => allSelectedIds.has(p.id))
  const photoUrls = selectedPhotos.map((p) => getPhotoUrl(p.storage_path))

  const textBlocks = blocks
    .filter((b): b is ProofBlock & { type: 'text' } => b.type === 'text')
    .map((b) => b.content)
    .filter((c) => c.trim())

  return {
    campaignName: campaign.name,
    clientName: campaign.clients?.company_name ?? '',
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    panels: assignments.map((a) => ({
      reference: a.panels?.reference ?? '—',
      name: a.panels?.name ?? '',
      city: a.panels?.city ?? '',
      assignedAt: a.assigned_at,
    })),
    photoUrls,
    texts: textBlocks,
    mapImageUrl: getStaticMapUrl(assignments),
    blockOrder: blocks.map((b) => b.type),
  }
}

// Main page
export function ProofOfPostingPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()

  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId)
  const { data: assignments = [] } = useCampaignPanels(campaignId)
  const panelIds = assignments.map((a) => a.panel_id)
  const { data: photos = [] } = useCampaignPhotos(panelIds)

  const [blocks, setBlocks] = useState<ProofBlock[]>(() => [
    { id: 'header', type: 'header' },
    { id: 'table', type: 'table' },
    { id: 'photos', type: 'photos', selectedIds: new Set<string>() },
  ])
  const [exporting, setExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Auto-select all photos once loaded
  const [autoSelected, setAutoSelected] = useState(false)
  if (photos.length > 0 && !autoSelected) {
    setAutoSelected(true)
    setBlocks((prev) =>
      prev.map((b) =>
        b.type === 'photos' ? { ...b, selectedIds: new Set(photos.map((p) => p.id)) } : b,
      ),
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function addBlock(type: 'text' | 'photos' | 'table' | 'map') {
    const id = crypto.randomUUID()
    if (type === 'text') {
      setBlocks((prev) => [...prev, { id, type: 'text', content: '' }])
    } else if (type === 'photos') {
      setBlocks((prev) => [
        ...prev,
        { id, type: 'photos', selectedIds: new Set(photos.map((p) => p.id)) },
      ])
    } else if (type === 'table') {
      setBlocks((prev) => [...prev, { id, type: 'table' }])
    } else if (type === 'map') {
      setBlocks((prev) => [...prev, { id, type: 'map' }])
    }
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const updateBlock = useCallback((id: string, updates: Record<string, unknown>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...updates } as ProofBlock) : b)),
    )
  }, [])

  const proofData = useMemo(() => {
    if (!campaign) return null
    return buildProofData(campaign, blocks, assignments, photos)
  }, [campaign, blocks, assignments, photos])

  async function handleExport() {
    if (!proofData) return
    setExporting(true)
    try {
      const blob = await pdf(<ProofPDF data={proofData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proof-${campaign!.name.replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('PDF exporté')
    } catch {
      toast('Erreur lors de l\'export', 'error')
    } finally {
      setExporting(false)
    }
  }

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="py-20 text-center text-muted-foreground">Campagne non trouvée</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/admin/campaigns/${campaignId}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Proof of Posting</h1>
            <p className="text-sm text-muted-foreground">{campaign.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="mr-1.5 size-4" /> : <Eye className="mr-1.5 size-4" />}
            {showPreview ? 'Masquer' : 'Preview'}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <FileDown className="mr-1.5 size-4" />
            )}
            Exporter PDF
          </Button>
        </div>
      </div>

      <div className={showPreview ? 'grid gap-6 lg:grid-cols-2' : ''}>
        {/* Editor */}
        <div className="space-y-6">
          {/* Blocks */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onRemove={removeBlock}
                    onUpdate={updateBlock}
                    campaign={campaign}
                    assignments={assignments}
                    photos={photos}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add block toolbar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ajouter :</span>
            <Button size="sm" variant="outline" onClick={() => addBlock('text')}>
              <Type className="mr-1 size-3.5" /> Texte
            </Button>
            <Button size="sm" variant="outline" onClick={() => addBlock('table')}>
              <Table2 className="mr-1 size-3.5" /> Tableau
            </Button>
            <Button size="sm" variant="outline" onClick={() => addBlock('photos')}>
              <ImageIcon className="mr-1 size-3.5" /> Photos
            </Button>
            <Button size="sm" variant="outline" onClick={() => addBlock('map')}>
              <MapPin className="mr-1 size-3.5" /> Carte
            </Button>
          </div>
        </div>

        {/* PDF Preview */}
        {showPreview && proofData && (
          <div className="sticky top-4 h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border">
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <ProofPDF data={proofData} />
            </PDFViewer>
          </div>
        )}
      </div>
    </div>
  )
}
