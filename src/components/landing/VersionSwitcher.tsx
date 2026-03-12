export type LandingVersion = 'A' | 'B' | 'C'

interface Props {
  version: LandingVersion
  onChange: (v: LandingVersion) => void
}

const LABELS: Record<LandingVersion, string> = {
  A: 'Cinématique',
  B: 'Énergie',
  C: 'Editorial',
}

export function VersionSwitcher({ version, onChange }: Props) {
  return (
    <div className="fixed right-4 top-20 z-[100] flex flex-col gap-1 rounded-xl bg-black/80 p-2 backdrop-blur-xl">
      {(['A', 'B', 'C'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            version === v
              ? 'bg-[#F5C400] text-[#0A0A0A]'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          {v} — {LABELS[v]}
        </button>
      ))}
    </div>
  )
}
