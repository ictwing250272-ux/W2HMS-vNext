import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { getConfig } from '../config/env';
import type { Role } from '../mocks/types';
import { ROLE_LABEL } from './permissions';
import { useMockSession } from './sessionContext';

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/buildings', label: 'แผนผังอาคาร' },
  { to: '/rooms', label: 'ข้อมูลบ้านพัก' },
  { to: '/personnel', label: 'กำลังพล' },
  { to: '/vehicles', label: 'ยานพาหนะ' },
  { to: '/maintenance', label: 'ซ่อมบำรุง' },
  { to: '/users', label: 'ผู้ใช้และสิทธิ์' },
  { to: '/settings', label: 'ตั้งค่าระบบ' },
];

const ROLES: Role[] = ['superAdmin', 'admin', 'officer', 'viewer'];

function MockRoleSwitcher() {
  const { session, setSession } = useMockSession();
  const isViewer = session.role === 'viewer';

  return (
    <div className="role-switcher" aria-label="บทบาทจำลอง">
      <label>
        บทบาทจำลอง
        <select
          className="input"
          value={session.role}
          onChange={(e) => {
            setSession({ ...session, role: e.target.value as Role });
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={session.healthAccess}
          disabled={isViewer}
          onChange={(e) => {
            setSession({ ...session, healthAccess: e.target.checked });
          }}
        />
        healthAccess
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={session.canExport}
          disabled={isViewer}
          onChange={(e) => {
            setSession({ ...session, canExport: e.target.checked });
          }}
        />
        canExport
      </label>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { appEnv, firebase } = getConfig();
  const showDevBanner = appEnv !== 'production' || firebase.useEmulator;

  return (
    <div className="app">
      {showDevBanner && (
        <div className="dev-banner" role="status">
          DEV — ต้นแบบ UI ใช้ข้อมูลจำลองเท่านั้น · บทบาทจำลองไม่ใช่การควบคุมสิทธิ์จริง
        </div>
      )}
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">W2HMS vNext</div>
          <nav aria-label="เมนูหลัก">
            <ul>
              {NAV_ITEMS.map((item) => (
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
        </aside>
        <div className="content">
          <MockRoleSwitcher />
          <main className="main">{children}</main>
        </div>
      </div>
    </div>
  );
}
