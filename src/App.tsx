import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Layouts (always loaded)
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ToastContainer } from '@/components/shared/Toast'
import { ScrollToTop } from '@/components/shared/ScrollToTop'
import { PWAUpdatePrompt } from '@/components/shared/PWAUpdatePrompt'
import { InstallBanner } from '@/components/shared/InstallBanner'

// Lazy loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

// Operator pages
const ScanPage = lazy(() => import('@/pages/operator/ScanPage').then((m) => ({ default: m.ScanPage })))
const RegisterPanelPage = lazy(() => import('@/pages/operator/RegisterPanelPage').then((m) => ({ default: m.RegisterPanelPage })))
const AssignCampaignPage = lazy(() => import('@/pages/operator/AssignCampaignPage').then((m) => ({ default: m.AssignCampaignPage })))
const OperatorDashboardPage = lazy(() => import('@/pages/operator/OperatorDashboardPage').then((m) => ({ default: m.OperatorDashboardPage })))
const OperatorPanelsPage = lazy(() => import('@/pages/operator/OperatorPanelsPage').then((m) => ({ default: m.OperatorPanelsPage })))
const OperatorMapPage = lazy(() => import('@/pages/operator/OperatorMapPage').then((m) => ({ default: m.OperatorMapPage })))
const OperatorPanelDetailPage = lazy(() => import('@/pages/operator/OperatorPanelDetailPage').then((m) => ({ default: m.OperatorPanelDetailPage })))
const ProfilePage = lazy(() => import('@/pages/operator/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const MyCampaignsPage = lazy(() => import('@/pages/operator/MyCampaignsPage').then((m) => ({ default: m.MyCampaignsPage })))

// Admin pages
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const MapPage = lazy(() => import('@/pages/admin/MapPage').then((m) => ({ default: m.MapPage })))
const PanelsPage = lazy(() => import('@/pages/admin/PanelsPage').then((m) => ({ default: m.PanelsPage })))
const PanelDetailPage = lazy(() => import('@/pages/admin/PanelDetailPage').then((m) => ({ default: m.PanelDetailPage })))
const CampaignsPage = lazy(() => import('@/pages/admin/CampaignsPage').then((m) => ({ default: m.CampaignsPage })))
const CampaignDetailPage = lazy(() => import('@/pages/admin/CampaignDetailPage').then((m) => ({ default: m.CampaignDetailPage })))
const ClientsPage = lazy(() => import('@/pages/admin/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const QuotesPage = lazy(() => import('@/pages/admin/quotes/QuotesPage').then((m) => ({ default: m.QuotesPage })))
const InvoicesPage = lazy(() => import('@/pages/admin/invoices/InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const QRPage = lazy(() => import('@/pages/admin/qr/QRPage').then((m) => ({ default: m.QRPage })))
const UsersPage = lazy(() => import('@/pages/admin/users/UsersPage').then((m) => ({ default: m.UsersPage })))
const QuoteDetailPage = lazy(() => import('@/pages/admin/quotes/QuoteDetailPage').then((m) => ({ default: m.QuoteDetailPage })))
const InvoiceDetailPage = lazy(() => import('@/pages/admin/invoices/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const ProofOfPostingPage = lazy(() => import('@/pages/admin/reports/ProofOfPostingPage').then((m) => ({ default: m.ProofOfPostingPage })))
const SettingsPage = lazy(() => import('@/pages/admin/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />

              {/* Operator routes (mobile-first) — admin can also access */}
              <Route element={<ProtectedRoute role="operator" />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<OperatorDashboardPage />} />
                  <Route path="/scan" element={<ScanPage />} />
                  <Route path="/panels" element={<OperatorPanelsPage />} />
                  <Route path="/panels/:id" element={<OperatorPanelDetailPage />} />
                  <Route path="/map" element={<OperatorMapPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/my-campaigns" element={<MyCampaignsPage />} />
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
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="quotes" element={<QuotesPage />} />
                  <Route path="quotes/:id" element={<QuoteDetailPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                  <Route path="qr" element={<QRPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="reports/:campaignId" element={<ProofOfPostingPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <ToastContainer />
          <PWAUpdatePrompt />
          <InstallBanner />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
