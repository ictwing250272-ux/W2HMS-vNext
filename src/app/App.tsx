import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Notice, PageHeader } from '../components/ui';
import type { PermModule } from '../mocks/types';
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
import { can, MODULE_LABEL } from './permissions';
import { useMockSession } from './sessionContext';

/** Hides a page from users without View on its module (UI only — not a security control). */
function RequireView({
  module,
  title,
  children,
}: {
  module: PermModule;
  title: string;
  children: ReactNode;
}) {
  const { session } = useMockSession();
  if (can(session, module, 'view')) return <>{children}</>;
  return (
    <section>
      <PageHeader title={title} />
      <Notice>
        บัญชีนี้ไม่มีสิทธิ์ View โมดูล “{MODULE_LABEL[module]}”
        {session.status === 'suspended' ? ' (บัญชีถูกระงับ)' : ''}
      </Notice>
    </section>
  );
}

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/buildings"
          element={
            <RequireView module="housing" title="แผนผังอาคารและห้องพัก">
              <BuildingsPage />
            </RequireView>
          }
        />
        <Route
          path="/rooms"
          element={
            <RequireView module="housing" title="ข้อมูลบ้านพัก">
              <RoomsPage />
            </RequireView>
          }
        />
        <Route
          path="/personnel"
          element={
            <RequireView module="personnel" title="ข้อมูลกำลังพล">
              <PersonnelPage />
            </RequireView>
          }
        />
        <Route
          path="/vehicles"
          element={
            <RequireView module="vehicles" title="ข้อมูลยานพาหนะ">
              <VehiclesPage />
            </RequireView>
          }
        />
        <Route
          path="/maintenance"
          element={
            <RequireView module="maintenance" title="งานซ่อมบำรุง">
              <MaintenancePage />
            </RequireView>
          }
        />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
