import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Layouts
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'

// Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { ScanPage } from '@/pages/operator/ScanPage'
import { RegisterPanelPage } from '@/pages/operator/RegisterPanelPage'
import { AssignCampaignPage } from '@/pages/operator/AssignCampaignPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { MapPage } from '@/pages/admin/MapPage'
import { PanelsPage } from '@/pages/admin/PanelsPage'
import { PanelDetailPage } from '@/pages/admin/PanelDetailPage'
import { CampaignsPage } from '@/pages/admin/CampaignsPage'
import { CampaignDetailPage } from '@/pages/admin/CampaignDetailPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Operator routes (mobile-first) */}
          <Route element={<ProtectedRoute role="operator" />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/scan" replace />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/register/:panelId" element={<RegisterPanelPage />} />
              <Route path="/assign/:panelId" element={<AssignCampaignPage />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="panels" element={<PanelsPage />} />
              <Route path="panels/:id" element={<PanelDetailPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
