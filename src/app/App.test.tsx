import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import type { MockSession } from './permissions';
import { MockSessionProvider } from './session';

function renderAt(path: string, initial?: MockSession) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MockSessionProvider {...(initial ? { initial } : {})}>
        <App />
      </MockSessionProvider>
    </MemoryRouter>,
  );
}

const VIEWER: MockSession = { role: 'viewer', healthAccess: false, canExport: false };
const OFFICER_H: MockSession = { role: 'officer', healthAccess: true, canExport: true };
const ADMIN: MockSession = { role: 'admin', healthAccess: false, canExport: false };

describe('App routing', () => {
  it('redirects / to the dashboard and shows the dev banner', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('ข้อมูลจำลอง');
  });

  it.each([
    ['/dashboard', 'Dashboard'],
    ['/buildings', 'แผนผังอาคารและห้องพัก'],
    ['/rooms', 'ข้อมูลบ้านพัก'],
    ['/personnel', 'ข้อมูลกำลังพล'],
    ['/vehicles', 'ข้อมูลยานพาหนะ'],
    ['/maintenance', 'งานซ่อมบำรุง'],
    ['/users', 'ผู้ใช้งานและสิทธิ์'],
    ['/settings', 'ตั้งค่าระบบ'],
  ])('renders %s', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('renders the not-found page for unknown routes', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: 'ไม่พบหน้าที่ต้องการ' })).toBeInTheDocument();
  });

  it('shows the emulator backend on the settings page', () => {
    renderAt('/settings');
    expect(screen.getByTestId('backend')).toHaveTextContent('Firebase Emulator (demo)');
  });
});

describe('mock role UI (not a security control)', () => {
  it('hides edit and export actions from Viewer', () => {
    renderAt('/rooms', VIEWER);
    expect(screen.queryByRole('button', { name: 'เพิ่มข้อมูล' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ส่งออก' })).not.toBeInTheDocument();
  });

  it('shows disabled prototype actions to Officer with canExport', () => {
    renderAt('/rooms', OFFICER_H);
    expect(screen.getByRole('button', { name: 'เพิ่มข้อมูล' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ส่งออก' })).toBeDisabled();
  });

  it('never shows health aggregates to Viewer, even if healthAccess is requested', () => {
    renderAt('/dashboard', { role: 'viewer', healthAccess: true, canExport: true });
    expect(screen.queryByTestId('health-aggregate')).not.toBeInTheDocument();
  });

  it('shows health aggregates only with healthAccess', () => {
    renderAt('/dashboard', OFFICER_H);
    expect(screen.getByTestId('health-aggregate')).toBeInTheDocument();
  });

  it('hides health aggregates from Admin without healthAccess', () => {
    renderAt('/dashboard', ADMIN);
    expect(screen.queryByTestId('health-aggregate')).not.toBeInTheDocument();
  });

  it('blocks user management for Officer and Viewer', () => {
    renderAt('/users', VIEWER);
    expect(screen.getByText(/ไม่มีสิทธิ์จัดการผู้ใช้งาน/)).toBeInTheDocument();
  });

  it('shows user management to Admin', () => {
    renderAt('/users', ADMIN);
    expect(screen.getByRole('heading', { name: /คำขอใช้งานที่รออนุมัติ/ })).toBeInTheDocument();
  });

  it('switching the mock role to Viewer clears healthAccess and canExport', () => {
    renderAt('/dashboard', OFFICER_H);
    expect(screen.getByTestId('health-aggregate')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'viewer' } });
    expect(screen.queryByTestId('health-aggregate')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'healthAccess' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'canExport' })).toBeDisabled();
  });

  it('shows room details when a room cell is selected', () => {
    renderAt('/buildings');
    const cell = screen.getAllByRole('button', { name: /^ห้อง A-01/ })[0];
    if (!cell) throw new Error('room cell not found');
    fireEvent.click(cell);
    expect(screen.getByRole('heading', { name: 'ห้อง A-01' })).toBeInTheDocument();
  });
});
