import { useState, useRef, useCallback, type ReactNode } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
}

const THRESHOLD = 80

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pullingRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Check if the page is scrolled to the top (window scroll)
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY
      pullingRef.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || refreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      // Prevent native pull-to-refresh and page scroll during pull gesture
      e.preventDefault()
      setPullDistance(Math.min(delta * 0.5, 120))
    } else {
      // User is scrolling up, cancel pull
      pullingRef.current = false
      setPullDistance(0)
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPullDistance(THRESHOLD)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, refreshing, onRefresh])

  const progress = Math.min(pullDistance / THRESHOLD, 1)

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator — only animate transition on release, not during drag */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : '0px',
          transition: pullingRef.current ? 'none' : 'height 200ms ease-out',
        }}
      >
        {refreshing ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <ArrowDown
            className="size-5 text-muted-foreground"
            style={{
              transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
              opacity: progress,
              transition: 'transform 200ms ease',
            }}
          />
        )}
      </div>

      {children}
    </div>
  )
}
