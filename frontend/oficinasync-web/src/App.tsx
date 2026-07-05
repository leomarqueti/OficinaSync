import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import './App.css'
import { SidebarProvider } from '@/components/ui/sidebar'

// Code-splitting por rota: cada página vira um chunk separado, carregado sob
// demanda — importa principalmente pra página pública do cliente (aberta no 4G)
// não pagar o peso do painel do mecânico inteiro.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const UserRegisterPage = lazy(() => import('./pages/UserRegisterPage').then((m) => ({ default: m.UserRegisterPage })))
const TenantRegisterPage = lazy(() => import('./pages/TenantRegisterPage').then((m) => ({ default: m.TenantRegisterPage })))
const EmailSendPage = lazy(() => import('./pages/EmailSendPage').then((m) => ({ default: m.EmailSendPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })))
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })))
const ClientsPage = lazy(() => import('./pages/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const CarsPage = lazy(() => import('./pages/CarsPage').then((m) => ({ default: m.CarsPage })))
const CarHistoryPage = lazy(() => import('./pages/CarHistoryPage').then((m) => ({ default: m.CarHistoryPage })))
const DashboardPage = lazy(() => import('./pages/dashBoardPage').then((m) => ({ default: m.DashboardPage })))
const OsCreateWizardPage = lazy(() => import('./pages/OsCreateWizardPage').then((m) => ({ default: m.OsCreateWizardPage })))
const PublicServiceOrderPage = lazy(() => import('./pages/PublicServiceOrderPage').then((m) => ({ default: m.PublicServiceOrderPage })))
const OsWorkPage = lazy(() => import('./pages/OsWorkPage').then((m) => ({ default: m.OsWorkPage })))
const OsFinishPage = lazy(() => import('./pages/OsFinishPage').then((m) => ({ default: m.OsFinishPage })))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400/30 border-t-lime-400" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors closeButton theme="dark" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/register" element={<UserRegisterPage />} />
          <Route path="/tenant-register" element={<TenantRegisterPage />} />
          <Route path="/email-send" element={<EmailSendPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/convite" element={<AcceptInvitePage />} />
          <Route
            path="/dashboard"
            element={
              <SidebarProvider>
                <DashboardPage />
              </SidebarProvider>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <SidebarProvider>
                <SettingsPage />
              </SidebarProvider>
            }
          />
          <Route
            path="/equipe"
            element={
              <SidebarProvider>
                <TeamPage />
              </SidebarProvider>
            }
          />
          <Route
            path="/clientes"
            element={
              <SidebarProvider>
                <ClientsPage />
              </SidebarProvider>
            }
          />
          <Route
            path="/veiculos"
            element={
              <SidebarProvider>
                <CarsPage />
              </SidebarProvider>
            }
          />
          <Route
            path="/veiculos/:id"
            element={
              <SidebarProvider>
                <CarHistoryPage />
              </SidebarProvider>
            }
          />
          <Route path="/os-client-create" element={<OsCreateWizardPage />} />
          <Route path="/servico/:token" element={<PublicServiceOrderPage />} />

          <Route path="/os/:id" element={<OsWorkPage />} />

          <Route path="/os/:id/finalizar" element={<OsFinishPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
