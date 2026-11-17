/**
 * UI-ONLY permission helpers for the Phase 1.6 prototype.
 *
 * They decide what the prototype SHOWS for a mock role, mirroring the approved
 * policy in docs/SECURITY-DESIGN.md. They are NOT a security control: real
 * enforcement must come from Firestore Security Rules (not implemented yet).
 */
import type { Role } from '../mocks/types';

export interface MockSession {
  role: Role;
  healthAccess: boolean;
  canExport: boolean;
}

export const ROLE_LABEL: Record<Role, string> = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  officer: 'Officer',
  viewer: 'Viewer — ผู้บังคับบัญชา',
};

const isAdminRole = (role: Role) => role === 'superAdmin' || role === 'admin';

/** Create/update general housing data. Viewer is read-only. */
export function canEditGeneral(session: MockSession): boolean {
  return session.role !== 'viewer';
}

/** No role deletes documents (status/active is used instead). */
export function canDelete(): boolean {
  return false;
}

export function canManageUsers(session: MockSession): boolean {
  return isAdminRole(session.role);
}

/** General audit logs: Super Admin, Admin and Viewer. Officer cannot. */
export function canReadAuditLogs(session: MockSession): boolean {
  return isAdminRole(session.role) || session.role === 'viewer';
}

/** Health aggregates (H-5): needs healthAccess; Viewer is always denied (D2/D4). */
export function canSeeHealthAggregates(session: MockSession): boolean {
  return session.role !== 'viewer' && session.healthAccess;
}

/** Export: canExport and never Viewer (D3). */
export function canExport(session: MockSession): boolean {
  return session.role !== 'viewer' && session.canExport;
}

/** Normalise a mock session so it can never express a policy-invalid state. */
export function normaliseSession(session: MockSession): MockSession {
  if (session.role === 'viewer') {
    return { role: 'viewer', healthAccess: false, canExport: false };
  }
  return session;
}
