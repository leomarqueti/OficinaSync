
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import './App.css'
import { LoginPage } from './pages/LoginPage'
import { UserRegisterPage } from './pages/UserRegisterPage'
import { TenantRegisterPage } from './pages/TenantRegisterPage'
import { EmailSendPage } from './pages/EmailSendPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamPage } from './pages/TeamPage'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { ClientsPage } from './pages/ClientsPage'
import { CarsPage } from './pages/CarsPage'
import { DashboardPage } from './pages/dashBoardPage'
import { SidebarProvider } from '@/components/ui/sidebar'
import { OsCreateWizardPage } from './pages/OsCreateWizardPage'
import { PublicServiceOrderPage } from './pages/PublicServiceOrderPage'
import { OsWorkPage } from './pages/OsWorkPage'
import { OsFinishPage } from './pages/OsFinishPage'


function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors closeButton theme="dark" />
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
        <Route path="/os-client-create" element={<OsCreateWizardPage />} />
        <Route path="/servico/:token" element={<PublicServiceOrderPage />} />

        <Route path="/os/:id" element={<OsWorkPage />} />

        <Route path="/os/:id/finalizar" element={<OsFinishPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
