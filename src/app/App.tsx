import { Navigate, Route, Routes } from 'react-router-dom';

import { BuildingsPage } from '../pages/BuildingsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { MaintenancePage } from '../pages/MaintenancePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PersonnelPage } from '../pages/PersonnelPage';
import { RoomsPage } from '../pages/RoomsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { UsersPage } from '../pages/UsersPage';
import { VehiclesPage } from '../pages/VehiclesPage';
import { AppLayout } from './AppLayout';

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/buildings" element={<BuildingsPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/personnel" element={<PersonnelPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
