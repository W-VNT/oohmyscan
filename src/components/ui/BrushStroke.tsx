export function BrushStroke({ color = '#111111', className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 300 20" className={className} aria-hidden="true">
      <path
        d="M5,14 C40,4 80,18 130,10 C180,2 220,16 260,8 C280,4 295,12 298,9"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  )
}
