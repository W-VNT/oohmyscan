import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from '@/components/shared/OfflineBanner'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)]">
      {/* Status bar backdrop — hides scrolling content behind iOS status bar */}
      <div className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-background" />
      <OfflineBanner />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
