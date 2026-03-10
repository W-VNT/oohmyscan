interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top-left corner */}
      <path
        d="M6 16V10C6 7.79086 7.79086 6 10 6H16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Top-right corner */}
      <path
        d="M32 6H38C40.2091 6 42 7.79086 42 10V16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bottom-left corner */}
      <path
        d="M6 32V38C6 40.2091 7.79086 42 10 42H16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bottom-right corner */}
      <path
        d="M32 42H38C40.2091 42 42 40.2091 42 38V32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* OOH text */}
      <text
        x="24"
        y="26.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="15"
        letterSpacing="0.5"
      >
        OOH
      </text>
    </svg>
  )
}

export function LogoFull({ size = 32, className }: LogoProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <Logo size={size} />
      <span
        style={{ fontSize: size * 0.45, fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        MYSCAN
      </span>
    </div>
  )
}
