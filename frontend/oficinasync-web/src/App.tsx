
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import './App.css'
import { LoginPage } from './pages/LoginPage'
import { UserRegisterPage } from './pages/UserRegisterPage'
import { TenantRegisterPage } from './pages/TenantRegisterPage'
import { EmailSendPage } from './pages/EmailSendPage'
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
        <Route
          path="/dashboard"
          element={
            <SidebarProvider>
              <DashboardPage />
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
