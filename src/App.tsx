import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Layouts (always loaded)
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ToastContainer } from '@/components/shared/Toast'
import { ConfirmDialogProvider } from '@/components/shared/ConfirmDialog'
import { ScrollToTop } from '@/components/shared/ScrollToTop'
import { DynamicFavicon } from '@/components/shared/DynamicFavicon'
import { DynamicTheme } from '@/components/shared/DynamicTheme'
import { LandingGate } from '@/components/landing/LandingGate'
import { PWAUpdatePrompt } from '@/components/shared/PWAUpdatePrompt'
import { InstallBanner } from '@/components/shared/InstallBanner'

// Lazy loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const PublicDocumentPage = lazy(() => import('@/pages/public/PublicDocumentPage').then((m) => ({ default: m.PublicDocumentPage })))
const PublicReportPage = lazy(() => import('@/pages/public/PublicReportPage').then((m) => ({ default: m.PublicReportPage })))
const LandingPage = lazy(() => import('@/pages/landing/LandingPage').then((m) => ({ default: m.LandingPage })))
const MentionsLegalesPage = lazy(() => import('@/pages/legal/MentionsLegalesPage').then((m) => ({ default: m.MentionsLegalesPage })))
const ConfidentialitePage = lazy(() => import('@/pages/legal/ConfidentialitePage').then((m) => ({ default: m.ConfidentialitePage })))

// Operator pages
const ScanPage = lazy(() => import('@/pages/operator/ScanPage').then((m) => ({ default: m.ScanPage })))
const RegisterPanelPage = lazy(() => import('@/pages/operator/RegisterPanelPage').then((m) => ({ default: m.RegisterPanelPage })))
const InstallWizardPage = lazy(() => import('@/pages/operator/InstallWizardPage').then((m) => ({ default: m.InstallWizardPage })))
const AssignCampaignPage = lazy(() => import('@/pages/operator/AssignCampaignPage').then((m) => ({ default: m.AssignCampaignPage })))
const DiffusePage = lazy(() => import('@/pages/operator/DiffusePage').then((m) => ({ default: m.DiffusePage })))
const DepositWizardPage = lazy(() => import('@/pages/operator/DepositWizardPage').then((m) => ({ default: m.DepositWizardPage })))
const OperatorDashboardPage = lazy(() => import('@/pages/operator/OperatorDashboardPage').then((m) => ({ default: m.OperatorDashboardPage })))
const OperatorPanelsPage = lazy(() => import('@/pages/operator/OperatorPanelsPage').then((m) => ({ default: m.OperatorPanelsPage })))
const OperatorMapPage = lazy(() => import('@/pages/operator/OperatorMapPage').then((m) => ({ default: m.OperatorMapPage })))
const OperatorPanelDetailPage = lazy(() => import('@/pages/operator/OperatorPanelDetailPage').then((m) => ({ default: m.OperatorPanelDetailPage })))
const ProfilePage = lazy(() => import('@/pages/operator/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const MyCampaignsPage = lazy(() => import('@/pages/operator/MyCampaignsPage').then((m) => ({ default: m.MyCampaignsPage })))
const ContractPage = lazy(() => import('@/pages/operator/ContractPage').then((m) => ({ default: m.ContractPage })))
const OperatorLocationPage = lazy(() => import('@/pages/operator/OperatorLocationPage').then((m) => ({ default: m.OperatorLocationPage })))
const ActivityPage = lazy(() => import('@/pages/operator/ActivityPage').then((m) => ({ default: m.ActivityPage })))
const OperatorCampaignDetailPage = lazy(() => import('@/pages/operator/OperatorCampaignDetailPage').then((m) => ({ default: m.OperatorCampaignDetailPage })))

// Admin pages
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const MapPage = lazy(() => import('@/pages/admin/MapPage').then((m) => ({ default: m.MapPage })))
const PanelsPage = lazy(() => import('@/pages/admin/PanelsPage').then((m) => ({ default: m.PanelsPage })))
const PanelDetailPage = lazy(() => import('@/pages/admin/PanelDetailPage').then((m) => ({ default: m.PanelDetailPage })))
const CampaignsPage = lazy(() => import('@/pages/admin/CampaignsPage').then((m) => ({ default: m.CampaignsPage })))
const CampaignDetailPage = lazy(() => import('@/pages/admin/CampaignDetailPage').then((m) => ({ default: m.CampaignDetailPage })))
const CampaignNewPage = lazy(() => import('@/pages/admin/CampaignNewPage').then((m) => ({ default: m.CampaignNewPage })))
const ClientsPage = lazy(() => import('@/pages/admin/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const LeadsPage = lazy(() => import('@/pages/admin/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })))
const LeadDetailPage = lazy(() => import('@/pages/admin/leads/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })))
const ClientNewPage = lazy(() => import('@/pages/admin/clients/ClientNewPage').then((m) => ({ default: m.ClientNewPage })))
const ClientDetailPage = lazy(() => import('@/pages/admin/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })))
const QuotesPage = lazy(() => import('@/pages/admin/quotes/QuotesPage').then((m) => ({ default: m.QuotesPage })))
const InvoicesPage = lazy(() => import('@/pages/admin/invoices/InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const QRPage = lazy(() => import('@/pages/admin/qr/QRPage').then((m) => ({ default: m.QRPage })))
const UsersPage = lazy(() => import('@/pages/admin/users/UsersPage').then((m) => ({ default: m.UsersPage })))
const QuoteDetailPage = lazy(() => import('@/pages/admin/quotes/QuoteDetailPage').then((m) => ({ default: m.QuoteDetailPage })))
const InvoiceDetailPage = lazy(() => import('@/pages/admin/invoices/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })))
const PotentialPage = lazy(() => import('@/pages/admin/potential/PotentialPage').then((m) => ({ default: m.PotentialPage })))
const PotentialNewPage = lazy(() => import('@/pages/admin/potential/PotentialNewPage').then((m) => ({ default: m.PotentialNewPage })))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const LogsPage = lazy(() => import('@/pages/admin/logs/LogsPage').then((m) => ({ default: m.LogsPage })))
const CampaignReportEditorPage = lazy(() => import('@/pages/admin/reports/CampaignReportEditorPage').then((m) => ({ default: m.CampaignReportEditorPage })))
const AdminProfilePage = lazy(() => import('@/pages/admin/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/pages/admin/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const LocationsPage = lazy(() => import('@/pages/admin/locations/LocationsPage').then((m) => ({ default: m.LocationsPage })))
const LocationDetailPage = lazy(() => import('@/pages/admin/locations/LocationDetailPage').then((m) => ({ default: m.LocationDetailPage })))

/**
 * Hostname-based redirect for subdomain routing.
 * app.oohmyad.fr → /app, admin.oohmyad.fr → /admin
 */
function HostnameRedirect() {
  const { pathname } = useLocation()
  const host = window.location.hostname

  if (host.startsWith('app.') && pathname === '/') {
    return <Navigate to="/app/dashboard" replace />
  }
  if (host.startsWith('admin.') && pathname === '/') {
    return <Navigate to="/admin" replace />
  }
  return null
}

/**
 * Redirige /scan?id=... vers /app/scan?id=... (anciens QR pré-fix path).
 */
function ScanRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/app/scan${search}`} replace />
}

/**
 * Layout qui protège les routes landing par un mot de passe (phase beta).
 * Désactivable en ne mettant pas VITE_LANDING_PASSWORD dans .env.
 */
function GatedLandingLayout() {
  return (
    <LandingGate>
      <Outlet />
    </LandingGate>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfirmDialogProvider>
        <BrowserRouter>
          <ScrollToTop />
          <DynamicFavicon />
          <DynamicTheme />
          <HostnameRedirect />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public — landing protégée par mot de passe pendant la phase beta */}
              <Route element={<GatedLandingLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/landing" element={<Navigate to="/" replace />} />
                <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
                <Route path="/confidentialite" element={<ConfidentialitePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* App login — accessible directement, pas de gate */}
              <Route path="/login" element={<LoginPage />} />

              {/* Backward-compat : anciens QR avec /scan → /app/scan en préservant query */}
              <Route path="/scan" element={<ScanRedirect />} />

              {/* Operator routes (mobile-first) — admin can also access */}
              <Route element={<ProtectedRoute role="operator" />}>
                <Route element={<AppLayout />}>
                  <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="/app/dashboard" element={<OperatorDashboardPage />} />
                  <Route path="/app/scan" element={<ScanPage />} />
                  <Route path="/app/panels" element={<OperatorPanelsPage />} />
                  <Route path="/app/panels/:id" element={<OperatorPanelDetailPage />} />
                  <Route path="/app/map" element={<OperatorMapPage />} />
                  <Route path="/app/profile" element={<ProfilePage />} />
                  <Route path="/app/my-campaigns" element={<MyCampaignsPage />} />
                  <Route path="/app/register/:panelId" element={<RegisterPanelPage />} />
                  <Route path="/app/install" element={<InstallWizardPage />} />
                  <Route path="/app/install/:panelId" element={<InstallWizardPage />} />
                  <Route path="/app/assign/:panelId" element={<AssignCampaignPage />} />
                  <Route path="/app/diffuse" element={<DiffusePage />} />
                  <Route path="/app/notifications" element={<NotificationsPage />} />
                  <Route path="/app/deposit/:campaignId" element={<DepositWizardPage />} />
                  <Route path="/app/contract/:panelId" element={<ContractPage />} />
                  <Route path="/app/locations/:id" element={<OperatorLocationPage />} />
                  <Route path="/app/activity" element={<ActivityPage />} />
                  <Route path="/app/campaigns/:id" element={<OperatorCampaignDetailPage />} />
                </Route>
              </Route>

              {/* Admin routes */}
              <Route element={<ProtectedRoute role="admin" />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="map" element={<MapPage />} />
                  <Route path="panels" element={<PanelsPage />} />
                  <Route path="panels/:id" element={<PanelDetailPage />} />
                  <Route path="locations" element={<LocationsPage />} />
                  <Route path="locations/:id" element={<LocationDetailPage />} />
                  <Route path="campaigns" element={<CampaignsPage />} />
                  <Route path="campaigns/new" element={<CampaignNewPage />} />
                  <Route path="campaigns/:id" element={<CampaignDetailPage />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="clients/new" element={<ClientNewPage />} />
                  <Route path="clients/:id" element={<ClientDetailPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="leads/:id" element={<LeadDetailPage />} />
                  <Route path="quotes" element={<QuotesPage />} />
                  <Route path="quotes/:id" element={<QuoteDetailPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                  <Route path="potential" element={<PotentialPage />} />
                  <Route path="potential/new" element={<PotentialNewPage />} />
                  <Route path="potential/:id" element={<PotentialNewPage />} />
                  <Route path="qr" element={<QRPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="logs" element={<LogsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="campaigns/:campaignId/report" element={<CampaignReportEditorPage />} />
                  <Route path="profile" element={<AdminProfilePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>
              </Route>

              {/* Public portal — accessible directement, pas de gate */}
              <Route path="/view/:token" element={<PublicDocumentPage />} />
              <Route path="/view/rapport/:token" element={<PublicReportPage />} />
            </Routes>
          </Suspense>
          <ToastContainer />
          <PWAUpdatePrompt />
          <InstallBanner />
        </BrowserRouter>
        </ConfirmDialogProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
