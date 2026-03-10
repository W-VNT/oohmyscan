import { create } from 'zustand'
import type { Profile } from '@/types'
import type { UserRole } from '@/lib/constants'

interface AppState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  role: UserRole | null
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile, role: profile?.role ?? null }),
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  role: null,
}))
