import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { SummaryPanel } from '../components/SummaryPanel';
import { getConfig } from '../config/env';
import type { PermModule } from '../mocks/types';
import { can, canManageUsers, canViewHealth, canWriteAny, ROLE_LABEL } from './permissions';
import { useMockSession } from './sessionContext';

const NAV_ITEMS: { to: string; label: string; module?: PermModule; superAdminOnly?: boolean }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/buildings', label: 'แผนที่ภาพรวม', module: 'housing' },
  { to: '/rooms', label: 'ข้อมูลบ้านพัก', module: 'housing' },
  { to: '/personnel', label: 'กำลังพล', module: 'personnel' },
  { to: '/vehicles', label: 'ยานพาหนะ', module: 'vehicles' },
  { to: '/maintenance', label: 'ซ่อมบำรุง', module: 'maintenance' },
  { to: '/users', label: 'ผู้ใช้และสิทธิ์', superAdminOnly: true },
  { to: '/settings', label: 'ตั้งค่าระบบ' },
];

/** Pages with their own right-hand panel do not show the global summary. */
const FULL_WIDTH_ROUTES = ['/buildings', '/users'];

function MockUserSwitcher() {
  const { session, users, actAs } = useMockSession();

  return (
    <div className="role-switcher" aria-label="ผู้ใช้จำลอง">
      <label>
        สวมบทผู้ใช้จำลอง
        <select
          className="input"
          value={session.uid}
          onChange={(e) => {
            actAs(e.target.value);
          }}
        >
          {users.map((u) => (
            <option key={u.uid} value={u.uid}>
              {ROLE_LABEL[u.role]} — {u.displayName}
              {u.status === 'suspended' ? ' (ระงับ)' : ''}
            </option>
          ))}
        </select>
      </label>
      <span className="chip-row" data-testid="session-chips">
        <span className={`chip role-${session.role}`}>{ROLE_LABEL[session.role]}</span>
        {session.status === 'suspended' && <span className="chip chip-danger">ถูกระงับ</span>}
        {session.role === 'viewer' && <span className="chip">อ่านอย่างเดียว</span>}
        {session.role === 'staff' && canWriteAny(session) && (
          <span className="chip">แก้ไขได้ตามสิทธิ์</span>
        )}
        {canViewHealth(session) && (
          <span className="chip chip-health">
            {session.healthAccess && session.role !== 'viewer' ? 'healthAccess' : 'Commander Group'}
          </span>
        )}
      </span>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { appEnv, firebase } = getConfig();
  const showDevBanner = appEnv !== 'production' || firebase.useEmulator;
  const { session } = useMockSession();
  const { pathname } = useLocation();
  const fullWidth = FULL_WIDTH_ROUTES.includes(pathname);
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly === true) return canManageUsers(session);
    return item.module === undefined || can(session, item.module, 'view');
  });

  return (
    <div className="app">
      {showDevBanner && (
        <div className="dev-banner" role="status">
          DEV — ต้นแบบ UI ใช้ข้อมูลจำลองเท่านั้น · บทบาทจำลองไม่ใช่การควบคุมสิทธิ์จริง
        </div>
      )}
      <header className="topbar">
        <div className="brand">W2HMS</div>
        <nav aria-label="เมนูหลัก" className="topnav">
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <MockUserSwitcher />
      <div className={fullWidth ? 'workspace workspace-full' : 'workspace'}>
        <main className="main">{children}</main>
        {!fullWidth && <SummaryPanel />}
      </div>
    </div>
  );
}
