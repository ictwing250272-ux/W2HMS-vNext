import { describe, expect, it } from 'vitest';

import type { Role } from '../mocks/types';
import {
  canDelete,
  canEditGeneral,
  canExport,
  canManageUsers,
  canReadAuditLogs,
  canSeeHealthAggregates,
  normaliseSession,
  type MockSession,
} from './permissions';

const s = (role: Role, healthAccess = false, exportFlag = false): MockSession => ({
  role,
  healthAccess,
  canExport: exportFlag,
});

describe('UI permission helpers mirror the approved policy', () => {
  it('Viewer is read-only; other roles can edit general data', () => {
    expect(canEditGeneral(s('viewer'))).toBe(false);
    expect(canEditGeneral(s('officer'))).toBe(true);
    expect(canEditGeneral(s('admin'))).toBe(true);
    expect(canEditGeneral(s('superAdmin'))).toBe(true);
  });

  it('no role can delete', () => {
    expect(canDelete()).toBe(false);
  });

  it('only Super Admin and Admin manage users', () => {
    expect(canManageUsers(s('superAdmin'))).toBe(true);
    expect(canManageUsers(s('admin'))).toBe(true);
    expect(canManageUsers(s('officer'))).toBe(false);
    expect(canManageUsers(s('viewer'))).toBe(false);
  });

  it('Officer cannot read general audit logs; Viewer can', () => {
    expect(canReadAuditLogs(s('officer'))).toBe(false);
    expect(canReadAuditLogs(s('viewer'))).toBe(true);
    expect(canReadAuditLogs(s('admin'))).toBe(true);
  });

  it('health aggregates need healthAccess and are never shown to Viewer', () => {
    expect(canSeeHealthAggregates(s('officer', true))).toBe(true);
    expect(canSeeHealthAggregates(s('officer', false))).toBe(false);
    expect(canSeeHealthAggregates(s('admin', false))).toBe(false);
    expect(canSeeHealthAggregates(s('superAdmin', false))).toBe(false);
    expect(canSeeHealthAggregates(s('viewer', true))).toBe(false);
  });

  it('export needs canExport and is never allowed for Viewer', () => {
    expect(canExport(s('officer', false, true))).toBe(true);
    expect(canExport(s('admin', false, false))).toBe(false);
    expect(canExport(s('viewer', false, true))).toBe(false);
  });

  it('normaliseSession strips healthAccess/canExport from Viewer', () => {
    expect(normaliseSession(s('viewer', true, true))).toEqual(s('viewer'));
    expect(normaliseSession(s('officer', true, true))).toEqual(s('officer', true, true));
  });
});
