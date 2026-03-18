import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, X, Pencil } from 'lucide-react'
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

export function LineDescriptionEditor({
  value,
  onChange,
  onSelectCatalog,
  services,
  disabled,
}: LineDescriptionEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [draft, editing])

  // Focus textarea on edit
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editing])

  // Close on click outside
  useEffect(() => {
    if (!editing) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editing])

  // Filter catalog suggestions
  const suggestions = useMemo(() => {
    if (!services?.length || !draft.trim()) return []
    const q = draft.toLowerCase()
    return services
      .filter((s) => s.is_active && s.name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [services, draft])

  function handleEdit() {
    if (disabled) return
    setDraft(value)
    setEditing(true)
    setShowSuggestions(true)
  }

  function handleValidate() {
    onChange(draft)
    setEditing(false)
    setShowSuggestions(false)
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
    setShowSuggestions(false)
  }

  function handleSelectService(service: ServiceCatalogItem) {
    setDraft(service.name)
    setShowSuggestions(false)
    if (onSelectCatalog) {
      onSelectCatalog({
        service_catalog_id: service.id,
        description: service.name,
        unit: service.unit,
        unit_price: service.default_unit_price,
        tva_rate: service.default_tva_rate,
      })
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel()
    }
    // Ctrl+Enter to validate
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleValidate()
    }
  }

  // View mode
  if (!editing) {
    const isMultiline = value.includes('\n')
    const displayText = value || '—'

    return (
      <button
        type="button"
        onClick={handleEdit}
        disabled={disabled}
        className="group flex w-full items-start gap-1 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
      >
        <span className={`flex-1 ${isMultiline ? 'line-clamp-2' : 'truncate'} ${!value ? 'text-muted-foreground' : ''}`}>
          {displayText}
        </span>
        {!disabled && (
          <Pencil className="mt-0.5 size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
        )}
      </button>
    )
  }

  // Edit mode
  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Description de la prestation..."
          rows={1}
          className="flex min-h-[36px] w-full resize-none rounded-md border border-primary/50 bg-background px-3 py-2 text-sm shadow-sm ring-1 ring-primary/20 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectService(s)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {s.default_unit_price}€ / {s.unit} · TVA {s.default_tva_rate}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview block — shown when text has content */}
      {draft.trim() && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Aperçu</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{draft}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleValidate}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Check className="size-3" />
          Valider
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
        >
          <X className="size-3" />
          Annuler
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Ctrl+Entrée pour valider
        </span>
      </div>
    </div>
  )
}
