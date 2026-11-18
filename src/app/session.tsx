import { useMemo, useState, type ReactNode } from 'react';

import { mockData } from '../mocks/data';
import type { AccessRequest, AppUser, MockDataset } from '../mocks/types';
import {
  can,
  canManageUsers,
  checkAccessEdit,
  isRoleLocked,
  normaliseUser,
  presetGrants,
  viewOnlyGrants,
  type EditCheck,
} from './permissions';
import { SessionContext, type SessionContextValue } from './sessionContext';

export const DEFAULT_UID = 'u_st2';

const deny = (reason: string): EditCheck => ({ ok: false, reason });
const OK: EditCheck = { ok: true };

/**
 * Mock app state: who we act as, user accounts and an in-memory copy of the dataset.
 * Every mutation re-checks the UI permission rules (still NOT a security control).
 */
export function MockSessionProvider({
  children,
  initialUid = DEFAULT_UID,
  initialUsers = mockData.users,
}: {
  children: ReactNode;
  initialUid?: string;
  initialUsers?: AppUser[];
}) {
  const [users, setUsers] = useState<AppUser[]>(() => initialUsers.map(normaliseUser));
  const [requests, setRequests] = useState<AccessRequest[]>(() => mockData.accessRequests);
  const [data, setData] = useState<MockDataset>(() => mockData);
  const [currentUid, setCurrentUid] = useState(initialUid);

  const value = useMemo<SessionContextValue>(() => {
    const fallback = users[0];
    const session = users.find((u) => u.uid === currentUid) ?? fallback;
    if (session === undefined) throw new Error('Mock session needs at least one user');

    return {
      session,
      users,
      accessRequests: requests,
      data,
      actAs: (uid) => {
        if (users.some((u) => u.uid === uid)) setCurrentUid(uid);
      },
      updateUser: (uid, patch) => {
        const target = users.find((u) => u.uid === uid);
        if (target === undefined) return deny('ไม่พบบัญชี');
        const check = checkAccessEdit(session, target);
        if (!check.ok) return check;
        if (patch.role === 'superAdmin') return deny('ห้ามสร้าง Super Admin จากหน้าจอ (P-5)');
        if (isRoleLocked(target) && (patch.role !== undefined || patch.status !== undefined)) {
          return deny('บทบาทและสถานะของ Super Admin แก้จากหน้าจอไม่ได้ (P-5 / N-6)');
        }
        let next: AppUser = { ...target, ...patch };
        // Changing to Viewer always resets to view-only; changing to Staff starts from no grants
        // unless grants were supplied in the same patch.
        if (patch.role === 'viewer') next = { ...next, grants: viewOnlyGrants() };
        if (patch.role === 'staff' && target.role !== 'staff' && patch.grants === undefined) {
          next = { ...next, grants: presetGrants('readOnly') };
        }
        const normalised = normaliseUser(next);
        setUsers((list) => list.map((u) => (u.uid === uid ? normalised : u)));
        return OK;
      },
      approveRequest: (uid, role) => {
        if (!canManageUsers(session)) return deny('เฉพาะ Super Admin');
        const request = requests.find((r) => r.uid === uid && r.status === 'pending');
        if (request === undefined) return deny('ไม่พบคำขอที่รออนุมัติ');
        const created = normaliseUser({
          uid,
          displayName: request.fullName,
          email: `${uid}@example.test`,
          role,
          status: 'approved',
          healthAccess: false,
          commanderGroup: false,
          grants: role === 'staff' ? presetGrants('readOnly') : viewOnlyGrants(),
        });
        setUsers((list) => [...list, created]);
        // P-8: the pending request is removed in the same step as creating the user.
        setRequests((list) => list.filter((r) => r.uid !== uid));
        return OK;
      },
      rejectRequest: (uid) => {
        if (!canManageUsers(session)) return deny('เฉพาะ Super Admin');
        setRequests((list) =>
          list.map((r) => (r.uid === uid && r.status === 'pending' ? { ...r, status: 'rejected' } : r)),
        );
        return OK;
      },
      updateRoom: (roomId, patch) => {
        if (!can(session, 'housing', 'update')) return deny('ไม่มีสิทธิ์แก้ไขข้อมูลห้อง');
        setData((d) => ({
          ...d,
          rooms: d.rooms.map((r) =>
            r.id === roomId ? { ...r, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : r,
          ),
        }));
        return OK;
      },
      deleteTicket: (ticketId) => {
        if (!can(session, 'maintenance', 'delete')) return deny('ไม่มีสิทธิ์ลบงานซ่อม');
        setData((d) => ({ ...d, tickets: d.tickets.filter((t) => t.id !== ticketId) }));
        return OK;
      },
    };
  }, [users, requests, data, currentUid]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
