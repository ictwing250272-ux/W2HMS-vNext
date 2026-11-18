import { describe, expect, it } from 'vitest';

import type { AppUser, Role } from '../mocks/types';
import {
  ACTIONS,
  can,
  canEditHealth,
  canManageUsers,
  canReadAuditLogs,
  canSeeHealthAggregates,
  canViewHealth,
  checkAccessEdit,
  emptyGrants,
  fullGrants,
  MODULES,
  normaliseUser,
  presetGrants,
  suppressSmall,
} from './permissions';

const u = (role: Role, extra: Partial<AppUser> = {}): AppUser =>
  normaliseUser({
    uid: `u_${role}`,
    displayName: role,
    email: `${role}@example.test`,
    role,
    status: 'approved',
    healthAccess: false,
    commanderGroup: false,
    grants: emptyGrants(),
    ...extra,
  });

describe('UI permission model (Super Admin / Staff / Viewer)', () => {
  it('Super Admin has every applicable grant', () => {
    const sa = u('superAdmin');
    for (const m of MODULES) expect(can(sa, m, 'view')).toBe(true);
    expect(can(sa, 'housing', 'delete')).toBe(true);
    expect(can(sa, 'auditLogs', 'delete')).toBe(false); // not applicable
  });

  it('Viewer is read-only in every module, even if grants claim otherwise', () => {
    const viewer = u('viewer', { grants: fullGrants(), healthAccess: true });
    for (const m of MODULES) {
      expect(can(viewer, m, 'view')).toBe(true);
      for (const a of ACTIONS.filter((x) => x !== 'view')) expect(can(viewer, m, a)).toBe(false);
    }
    expect(viewer.healthAccess).toBe(false);
  });

  it('Staff gets exactly the grants set by the Super Admin', () => {
    const staff = u('staff', { grants: presetGrants('operator') });
    expect(can(staff, 'housing', 'update')).toBe(true);
    expect(can(staff, 'housing', 'delete')).toBe(false);
    expect(can(staff, 'housing', 'export')).toBe(false);
    expect(canReadAuditLogs(staff)).toBe(false);

    const grants = presetGrants('operator');
    grants.maintenance.delete = true;
    expect(can(u('staff', { grants }), 'maintenance', 'delete')).toBe(true);
  });

  it('a suspended account can do nothing', () => {
    const s = u('superAdmin', { status: 'suspended', healthAccess: true });
    expect(can(s, 'housing', 'view')).toBe(false);
    expect(canManageUsers(s)).toBe(false);
    expect(canViewHealth(s)).toBe(false);
  });

  it('only Super Admin manages users', () => {
    expect(canManageUsers(u('superAdmin'))).toBe(true);
    expect(canManageUsers(u('staff', { grants: fullGrants() }))).toBe(false);
    expect(canManageUsers(u('viewer'))).toBe(false);
  });

  it('health: healthAccess reads + writes; Commander Group reads only; Viewer alone never', () => {
    expect(canViewHealth(u('staff', { healthAccess: true }))).toBe(true);
    expect(canEditHealth(u('staff', { healthAccess: true }))).toBe(true);
    expect(canViewHealth(u('staff'))).toBe(false);
    expect(canViewHealth(u('superAdmin'))).toBe(false); // not automatic by role

    const commander = u('viewer', { commanderGroup: true });
    expect(canViewHealth(commander)).toBe(true);
    expect(canEditHealth(commander)).toBe(false);
    expect(canSeeHealthAggregates(commander)).toBe(true);

    expect(canViewHealth(u('viewer', { healthAccess: true }))).toBe(false);
  });

  it('access edits: Super Admin only, never on their own account', () => {
    const sa = u('superAdmin');
    expect(checkAccessEdit(sa, u('staff')).ok).toBe(true);
    expect(checkAccessEdit(sa, sa).ok).toBe(false);
    expect(checkAccessEdit(u('staff', { grants: fullGrants() }), u('viewer')).ok).toBe(false);
  });

  it('suppresses small health counts', () => {
    expect(suppressSmall(0)).toBe('0');
    expect(suppressSmall(3)).toBe('<5');
    expect(suppressSmall(5)).toBe('5');
  });
});
