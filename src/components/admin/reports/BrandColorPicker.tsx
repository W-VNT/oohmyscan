import { useEffect, useRef, useState } from 'react'
import { Palette as PaletteIcon, Check } from 'lucide-react'
import { BRAND_COLOR_PRESETS } from '@/lib/report-brand'

interface Props {
  value: string
  onChange: (color: string) => void
}

/**
 * Color picker compact pour la couleur de marque du rapport.
 * Affiche un swatch cliquable -> popover avec presets + input hex personnalise.
 */
export function BrandColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customHex, setCustomHex] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setCustomHex(value), [value])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function applyCustom() {
    const hex = customHex.trim()
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-xs font-medium hover:bg-muted"
        title="Couleur du rapport"
      >
        <PaletteIcon className="size-3.5 text-muted-foreground" />
        <div
          className="size-4 rounded shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: value }}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Couleur du rapport
          </p>

          {/* Presets */}
          <div className="grid grid-cols-5 gap-1.5">
            {BRAND_COLOR_PRESETS.map((preset) => {
              const isSelected = preset.value.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={preset.value}
                  onClick={() => {
                    onChange(preset.value)
                    setOpen(false)
                  }}
                  className={`relative flex aspect-square items-center justify-center rounded-md transition-all hover:scale-105 ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-popover' : ''
                  }`}
                  style={{
                    backgroundColor: preset.value,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
                    ...(isSelected ? ({ '--tw-ring-color': preset.value } as React.CSSProperties) : {}),
                  }}
                  title={preset.label}
                >
                  {isSelected && <Check className="size-3 text-white drop-shadow" />}
                </button>
              )
            })}
          </div>

          {/* Hex personnalise */}
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Personnalisée
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={customHex}
                onChange={(e) => {
                  setCustomHex(e.target.value)
                  onChange(e.target.value)
                }}
                className="size-7 cursor-pointer rounded border border-border bg-transparent"
              />
              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                onBlur={applyCustom}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                placeholder="#EF4444"
                className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
