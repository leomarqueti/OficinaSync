
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { LoginPage } from './pages/LoginPage'
import { UserRegisterPage } from './pages/UserRegisterPage'
import { TenantRegisterPage } from './pages/TenantRegisterPage'
import { EmailSendPage } from './pages/EmailSendPage'
import { DashboardPage } from './pages/dashBoardPage'
import { SidebarProvider } from '@/components/ui/sidebar'
import { OsCreateClientPage } from './pages/osCreateClientPage'
import { OsCreateCarPage } from './pages/osCreateCarPage'
import { OsVehicleDefectPage } from './pages/osVehicleDefectPage'
import { OsMediaDefectPage } from './pages/osMediaDefectPage'
import { PublicServiceOrderPage } from './pages/PublicServiceOrderPage'
import { OsVehicleEntryPhotosPage } from './pages/OsVehicleEntryPhotosPage'
import { OsWorkPage } from './pages/OsWorkPage'
import { OsFinishPage } from './pages/OsFinishPage'


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
        <Route path="/os-client-create" element={<OsCreateClientPage />} />
        <Route path="/os-car-create" element={<OsCreateCarPage />} />
        <Route path="/os-defect-create" element={<OsVehicleDefectPage />} />
        <Route path="/os-media-upload" element={<OsMediaDefectPage />} />
        <Route path="/servico/:token" element={<PublicServiceOrderPage />} />
        <Route path="/os-entry-photos" element={<OsVehicleEntryPhotosPage />} />

        <Route path="/os/:id" element={<OsWorkPage />} />

        <Route path="/os/:id/finalizar" element={<OsFinishPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
