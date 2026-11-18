import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { MockSessionProvider } from './session';

/** Mock users from src/mocks/data.ts */
const SA = 'u_sa1'; // Super Admin, healthAccess
const STAFF_H = 'u_st1'; // Staff "supervisor" preset (export, audit), healthAccess
const STAFF = 'u_st2'; // Staff "operator" preset, no healthAccess, no export
const SUSPENDED = 'u_st4';
const COMMANDER = 'u_vw1'; // Viewer + Commander Group
const VIEWER = 'u_vw2'; // Viewer only

const HEALTH_TAB = 'สุขภาพ (ตัวเลขรวม)';

function renderAt(path: string, uid: string = STAFF) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MockSessionProvider initialUid={uid}>
        <App />
      </MockSessionProvider>
    </MemoryRouter>,
  );
}

function openBuilding(name: string) {
  const list = screen.getByRole('list', { name: 'รายชื่ออาคาร' });
  fireEvent.click(within(list).getByRole('button', { name: new RegExp(name) }));
  return screen.getByTestId('building-summary');
}

describe('App routing', () => {
  it('redirects / to the dashboard and shows the dev banner', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('ข้อมูลจำลอง');
  });

  it.each([
    ['/dashboard', 'Dashboard'],
    ['/buildings', 'แผนที่ภาพรวมอาคาร'],
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

  it('blocks module pages for a suspended account', () => {
    renderAt('/vehicles', SUSPENDED);
    expect(screen.getByText(/ไม่มีสิทธิ์ View โมดูล/)).toBeInTheDocument();
  });
});

describe('mock role UI (not a security control)', () => {
  it('hides edit and export actions from Viewer', () => {
    renderAt('/rooms', VIEWER);
    expect(screen.queryByRole('button', { name: 'เพิ่มข้อมูล' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ส่งออก' })).not.toBeInTheDocument();
  });

  it('shows prototype actions according to Staff grants', () => {
    renderAt('/rooms', STAFF_H);
    expect(screen.getByRole('button', { name: 'เพิ่มข้อมูล' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ส่งออก' })).toBeDisabled();
  });

  it('hides export from Staff without the export grant', () => {
    renderAt('/rooms', STAFF);
    expect(screen.getByRole('button', { name: 'เพิ่มข้อมูล' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ส่งออก' })).not.toBeInTheDocument();
  });

  it('never exposes health aggregates to Viewer or Staff without healthAccess', () => {
    for (const uid of [VIEWER, STAFF]) {
      const { unmount } = renderAt('/dashboard', uid);
      expect(screen.queryByRole('tab', { name: HEALTH_TAB })).not.toBeInTheDocument();
      expect(screen.queryByTestId('health-aggregate')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('shows health aggregates with healthAccess or Commander Group', () => {
    for (const uid of [STAFF_H, COMMANDER]) {
      const { unmount } = renderAt('/dashboard', uid);
      fireEvent.click(screen.getByRole('tab', { name: HEALTH_TAB }));
      const panel = screen.getByTestId('health-aggregate');
      expect(panel).not.toHaveTextContent(/ผู้พักทดสอบ|สมาชิกทดสอบ|ห้อง [A-F]-|เขต \d/);
      unmount();
    }
  });

  it('keeps health data out of the global summary panel', () => {
    renderAt('/dashboard', STAFF_H);
    expect(screen.getByTestId('summary-panel')).not.toHaveTextContent(/สุขภาพ|โรค|TBD-/);
  });

  it('switching the acting user to a Viewer removes the health tab', () => {
    renderAt('/dashboard', STAFF_H);
    expect(screen.getByRole('tab', { name: HEALTH_TAB })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'สวมบทผู้ใช้จำลอง' }), {
      target: { value: VIEWER },
    });
    expect(screen.queryByRole('tab', { name: HEALTH_TAB })).not.toBeInTheDocument();
    expect(screen.getByTestId('session-chips')).toHaveTextContent('อ่านอย่างเดียว');
  });
});

describe('overview map', () => {
  it('shows the map, typed building markers and the offline fallback without a key', () => {
    renderAt('/buildings', STAFF);
    expect(screen.getByTestId('site-map')).toBeInTheDocument();
    expect(screen.getByTestId('tiles-state')).toHaveTextContent('แผนที่ออฟไลน์');
    expect(screen.getByTitle('อาคาร A (อาคารบ้านพัก)')).toBeInTheDocument();
    expect(screen.getByTitle('อาคารสำนักงาน 1 (อาคารสำนักงาน)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Satellite' })).toBeDisabled();
    expect(screen.getByTestId('map-overview')).toBeInTheDocument();
  });

  it('clicking a building marker opens its basic details', () => {
    renderAt('/buildings', STAFF);
    fireEvent.click(screen.getByTitle('อาคาร C (อาคารบ้านพัก)'));
    const summary = screen.getByTestId('building-summary');
    expect(within(summary).getByRole('heading', { name: 'อาคาร C' })).toBeInTheDocument();
  });

  it('selecting a building from the list shows basic, non-personal details', () => {
    renderAt('/buildings', VIEWER);
    const summary = openBuilding('^อาคาร C');
    expect(summary).toHaveTextContent('อาคารบ้านพัก');
    expect(summary).toHaveTextContent('จำนวนห้อง');
    expect(summary).not.toHaveTextContent(/ผู้พักทดสอบ|สมาชิกทดสอบ|000-000|TBD-/);
    fireEvent.click(within(summary).getByRole('button', { name: 'ปิดรายละเอียดอาคาร' }));
    expect(screen.getByTestId('map-overview')).toBeInTheDocument();
  });

  it('filters buildings by type and by search', () => {
    renderAt('/buildings', STAFF);
    fireEvent.change(screen.getByRole('combobox', { name: 'ประเภทอาคาร' }), {
      target: { value: 'office' },
    });
    const list = screen.getByRole('list', { name: 'รายชื่ออาคาร' });
    expect(within(list).getAllByRole('button')).toHaveLength(3);
    expect(within(list).queryByRole('button', { name: /^อาคาร A/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'ค้นหาอาคาร' }), {
      target: { value: 'อเนกประสงค์' },
    });
    expect(within(list).getAllByRole('button')).toHaveLength(1);
  });

  it('has no floor plan, floor selector or room detail in this round', () => {
    renderAt('/buildings', STAFF_H);
    openBuilding('^อาคาร C');
    expect(screen.queryByRole('button', { name: 'ชั้น 1' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('room-detail')).not.toBeInTheDocument();
  });

  it('export appears only with the export grant; never for Viewer', () => {
    const { unmount } = renderAt('/buildings', VIEWER);
    expect(screen.queryByRole('button', { name: 'ส่งออก' })).not.toBeInTheDocument();
    unmount();
    renderAt('/buildings', STAFF_H);
    expect(screen.getByRole('button', { name: 'ส่งออก' })).toBeDisabled();
  });

  it('overview shows the suppressed health count only to health readers', () => {
    for (const uid of [STAFF, VIEWER]) {
      const { unmount } = renderAt('/buildings', uid);
      expect(screen.queryByTestId('overview-health')).not.toBeInTheDocument();
      unmount();
    }
    for (const uid of [STAFF_H, COMMANDER]) {
      const { unmount } = renderAt('/buildings', uid);
      expect(screen.getByTestId('overview-health')).toHaveTextContent(/^(<5|\d+)$/);
      unmount();
    }
  });
});

describe('user & access control', () => {
  it('blocks user management for Staff and Viewer', () => {
    for (const uid of [STAFF_H, VIEWER]) {
      const { unmount } = renderAt('/users', uid);
      expect(screen.getByText(/ไม่มีสิทธิ์จัดการผู้ใช้งาน/)).toBeInTheDocument();
      unmount();
    }
  });

  it('shows pending requests and the user list to Super Admin', () => {
    renderAt('/users', SA);
    expect(screen.getByRole('heading', { name: /คำขอใช้งานที่รออนุมัติ/ })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'รายชื่อผู้ใช้' })).toBeInTheDocument();
  });

  it('Super Admin cannot change their own account', () => {
    renderAt('/users', SA);
    fireEvent.click(screen.getByRole('button', { name: /ผู้ดูแลสูงสุด ทดสอบ 1/ }));
    expect(screen.getByText(/ห้ามแก้ไขบทบาท สถานะ หรือสิทธิ์ของบัญชีตนเอง/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'บันทึกสิทธิ์' })).toBeDisabled();
  });

  it('grants a Staff user Export on vehicles, which then shows on the vehicles page', () => {
    renderAt('/users', SA);
    fireEvent.click(screen.getByRole('button', { name: /เจ้าหน้าที่ ทดสอบ 2/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'ยานพาหนะ Export' }));
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกสิทธิ์' }));
    expect(screen.getByText(/บันทึกแล้ว/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'สวมบทผู้ใช้จำลอง' }), {
      target: { value: STAFF },
    });
    fireEvent.click(screen.getByRole('link', { name: 'ยานพาหนะ' }));
    expect(screen.getByRole('button', { name: 'ส่งออก' })).toBeDisabled();
  });

  it('a Viewer stays view-only: matrix locked and healthAccess unavailable', () => {
    renderAt('/users', SA);
    fireEvent.click(screen.getByRole('button', { name: /ผู้ใช้อ่านอย่างเดียว ทดสอบ 2/ }));
    expect(screen.getByRole('checkbox', { name: 'ยานพาหนะ Export' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /healthAccess/ })).toBeDisabled();
  });
});
