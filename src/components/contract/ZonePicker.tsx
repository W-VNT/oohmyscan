import { useState } from 'react'
import { PANEL_ZONES } from '@/lib/constants'
import { CheckCircle } from 'lucide-react'

interface ZonePickerProps {
  onSelect: (zone: string) => void
  selectedZone?: string
  occupiedZones: string[]
  locationName: string
}

export function ZonePicker({ onSelect, selectedZone, occupiedZones, locationName }: ZonePickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customZone, setCustomZone] = useState('')

  function handleZoneClick(value: string) {
    if (value === 'other') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      onSelect(value)
    }
  }

  function handleCustomSubmit() {
    const trimmed = customZone.trim()
    if (trimmed) {
      onSelect(`custom:${trimmed}`)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Zone d'installation</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {locationName} — {occupiedZones.length} panneau{occupiedZones.length !== 1 ? 'x' : ''} existant{occupiedZones.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PANEL_ZONES.map((zone) => {
          const isOccupied = occupiedZones.includes(zone.value)
          const isSelected = zone.value === 'other' ? showCustom : selectedZone === zone.value

          return (
            <button
              key={zone.value}
              onClick={() => !isOccupied && handleZoneClick(zone.value)}
              disabled={isOccupied}
              className={`relative flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                isOccupied
                  ? 'cursor-not-allowed border-border bg-muted/50 text-muted-foreground opacity-60'
                  : isSelected
                    ? 'border-primary bg-primary/5 font-medium text-primary'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              {isOccupied ? (
                <CheckCircle className="size-4 shrink-0 text-green-500" />
              ) : isSelected ? (
                <div className="size-4 shrink-0 rounded-full border-2 border-primary bg-primary" />
              ) : (
                <div className="size-4 shrink-0 rounded-full border-2 border-border" />
              )}
              <span>{zone.label}</span>
              {isOccupied && (
                <span className="ml-auto text-[10px]">occupé</span>
              )}
            </button>
          )
        })}
      </div>

      {showCustom && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom de la zone personnalisée</label>
          <input
            type="text"
            value={customZone}
            onChange={(e) => setCustomZone(e.target.value)}
            placeholder="Ex: Salle de sport, Terrasse sud..."
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customZone.trim()}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            Valider cette zone
          </button>
        </div>
      )}
    </div>
  )
}
