import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { LoginPage } from './pages/LoginPage'
import { UserRegisterPage } from './pages/UserRegisterPage'
import { TenantRegisterPage } from './pages/TenantRegisterPage'
import { EmailSendPage } from './pages/EmailSendPage'
import { DashboardPage } from './pages/dashBoardPage'
import { SidebarProvider } from '@/components/ui/sidebar'

function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  )
}

export default App