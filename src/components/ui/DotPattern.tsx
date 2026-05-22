export function DotPattern({ className }: { className?: string }) {
  const dots = [
    { cx: 10, cy: 20, r: 1.8, fill: '#F4C400' },
    { cx: 35, cy: 10, r: 1.2, fill: '#111111' },
    { cx: 55, cy: 25, r: 2.2, fill: '#D94F2D' },
    { cx: 75, cy: 12, r: 1.4, fill: '#F4C400' },
    { cx: 20, cy: 55, r: 1.6, fill: '#D94F2D' },
    { cx: 45, cy: 60, r: 1.0, fill: '#111111' },
    { cx: 65, cy: 50, r: 2.0, fill: '#F4C400' },
    { cx: 85, cy: 65, r: 1.3, fill: '#111111' },
    { cx: 30, cy: 80, r: 1.8, fill: '#F4C400' },
    { cx: 60, cy: 85, r: 1.1, fill: '#D94F2D' },
    { cx: 90, cy: 40, r: 1.6, fill: '#D94F2D' },
    { cx: 15, cy: 40, r: 0.9, fill: '#111111' },
    { cx: 50, cy: 40, r: 1.4, fill: '#F4C400' },
    { cx: 80, cy: 20, r: 1.0, fill: '#D94F2D' },
  ]
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {dots.map((d, i) => <circle key={i} {...d} opacity={0.8} />)}
    </svg>
  )
}
