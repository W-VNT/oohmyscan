import { useState, useRef, useEffect, useMemo } from 'react'
import { MiniRichEditor } from './MiniRichEditor'
import type { ServiceCatalogItem } from '@/hooks/admin/useServiceCatalog'

interface CatalogSelection {
  service_catalog_id: string
  description: string
  unit: string
  unit_price: number
  tva_rate: number
}

interface LineDescriptionEditorProps {
  value: string
  onChange: (value: string) => void
  onSelectCatalog?: (selection: CatalogSelection) => void
  services?: ServiceCatalogItem[]
  disabled?: boolean
}

/** Strip HTML tags for plain-text matching */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

/** Get first line/paragraph from HTML */
function firstLine(html: string): string {
  const match = html.match(/<p[^>]*>(.*?)<\/p>/)
  return match ? match[1] : stripHtml(html).split('\n')[0]
}

export function LineDescriptionEditor({
  value,
  onChange,
  onSelectCatalog,
  services,
  disabled,
}: LineDescriptionEditorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSelected = useRef(false)

  // Close suggestions on click outside
  useEffect(() => {
    if (!showSuggestions) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSuggestions])

  // Filter catalog suggestions based on plain text content
  const suggestions = useMemo(() => {
    if (!services?.length) return []
    const text = stripHtml(value)
    if (!text) return []
    const q = text.toLowerCase()
    return services
      .filter((s) => s.is_active && stripHtml(s.name).toLowerCase().includes(q))
      .slice(0, 6)
  }, [services, value])

  function handleChange(html: string) {
    onChange(html)
    if (justSelected.current) {
      justSelected.current = false
      return
    }
    if (services?.length) setShowSuggestions(true)
  }

  function handleSelectService(service: ServiceCatalogItem) {
    justSelected.current = true
    setShowSuggestions(false)
    onChange(service.name)
    onSelectCatalog?.({
      service_catalog_id: service.id,
      description: service.name,
      unit: service.unit,
      unit_price: service.default_unit_price,
      tva_rate: service.default_tva_rate,
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <MiniRichEditor
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Description de la prestation..."
      />

      {/* Catalog autocomplete */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelectService(s)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <span
                className="flex-1 font-medium"
                dangerouslySetInnerHTML={{ __html: firstLine(s.name) }}
              />
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {s.default_unit_price}€ / {s.unit} · TVA {s.default_tva_rate}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
