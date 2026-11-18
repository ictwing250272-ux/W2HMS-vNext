/**
 * UI-ONLY permission helpers for the prototype.
 *
 * They decide what the prototype SHOWS for the mock user being acted as. They are NOT a
 * security control: real enforcement must come from Firebase Authentication and Firestore
 * Security Rules, which are not implemented yet.
 *
 * Model (owner directive 2026-11-18 — not yet recorded in docs/SECURITY-DECISIONS.md):
 * - Super Admin: full control; the only role that grants or revokes permissions.
 * - Staff (Admin + Officer merged): per-user grants by module × action.
 * - Viewer: read-only, always. Never create / update / delete / export.
 * - Health data is outside the module grants: `healthAccess` (Super Admin / Staff, read + write)
 *   or `commanderGroup` (read-only). Viewer + commanderGroup conflicts with D2 — pending decision.
 */
import type { AppUser, Grants, PermAction, PermModule, Role } from '../mocks/types';

export type MockSession = AppUser;

export const ROLE_LABEL: Record<Role, string> = {
  superAdmin: 'Super Admin',
  staff: 'Staff',
  viewer: 'Viewer',
};

export const ROLE_HINT: Record<Role, string> = {
  superAdmin: 'ควบคุมทั้งหมด · กำหนด/เพิกถอนสิทธิ์',
  staff: 'สิทธิ์ตามที่ Super Admin กำหนดรายบุคคล',
  viewer: 'อ่านอย่างเดียวเสมอ',
};

export const MODULES: readonly PermModule[] = [
  'housing',
  'stays',
  'personnel',
  'vehicles',
  'maintenance',
  'auditLogs',
];

export const MODULE_LABEL: Record<PermModule, string> = {
  housing: 'อาคารและห้องพัก',
  stays: 'การเข้าพัก / ครัวเรือน',
  personnel: 'กำลังพล',
  vehicles: 'ยานพาหนะ',
  maintenance: 'ซ่อมบำรุง',
  auditLogs: 'บันทึกการแก้ไข (Audit)',
};

export const ACTIONS: readonly PermAction[] = ['view', 'create', 'update', 'delete', 'export'];

export const ACTION_LABEL: Record<PermAction, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  export: 'Export',
};

/** Actions that make sense per module. Audit logs are append-only and read-only in the UI. */
export function isApplicable(module: PermModule, action: PermAction): boolean {
  return module !== 'auditLogs' || action === 'view';
}

function buildGrants(pick: (module: PermModule, action: PermAction) => boolean): Grants {
  const entries = MODULES.map((m) => {
    const row = Object.fromEntries(
      ACTIONS.map((a) => [a, isApplicable(m, a) && pick(m, a)]),
    ) as Record<PermAction, boolean>;
    return [m, row] as const;
  });
  return Object.fromEntries(entries) as Grants;
}

export const emptyGrants = (): Grants => buildGrants(() => false);
export const fullGrants = (): Grants => buildGrants(() => true);
/** Viewer: view everything general (VIEWER / OI-1), nothing else. */
export const viewOnlyGrants = (): Grants => buildGrants((_, a) => a === 'view');

export interface GrantPreset {
  id: string;
  label: string;
  description: string;
  grants: () => Grants;
}

/** Starting points for Staff. A Super Admin can adjust any cell afterwards. */
export const STAFF_PRESETS: readonly GrantPreset[] = [
  {
    id: 'readOnly',
    label: 'อ่านอย่างเดียว',
    description: 'View ทุกโมดูลยกเว้น Audit',
    grants: () => buildGrants((m, a) => a === 'view' && m !== 'auditLogs'),
  },
  {
    id: 'operator',
    label: 'เจ้าหน้าที่ปฏิบัติงาน',
    description: 'View / Create / Update ข้อมูลทั่วไป (เทียบ Officer เดิม)',
    grants: () =>
      buildGrants((m, a) => m !== 'auditLogs' && (a === 'view' || a === 'create' || a === 'update')),
  },
  {
    id: 'supervisor',
    label: 'หัวหน้างาน',
    description: 'เพิ่ม Export และอ่าน Audit (เทียบ Admin เดิม ไม่รวมจัดการผู้ใช้)',
    grants: () => buildGrants((_, a) => a !== 'delete'),
  },
];

export function presetGrants(id: string): Grants {
  return (STAFF_PRESETS.find((p) => p.id === id) ?? STAFF_PRESETS[0])?.grants() ?? emptyGrants();
}

export function sameGrants(a: Grants, b: Grants): boolean {
  return MODULES.every((m) => ACTIONS.every((x) => a[m][x] === b[m][x]));
}

export function countGrants(g: Grants): number {
  return MODULES.reduce((n, m) => n + ACTIONS.filter((a) => g[m][a]).length, 0);
}

/**
 * Normalise a user so it can never express a policy-invalid state:
 * Super Admin always has full grants; Viewer is view-only with no healthAccess;
 * non-applicable cells are always false.
 */
export function normaliseUser(user: AppUser): AppUser {
  if (user.role === 'superAdmin') {
    return { ...user, grants: fullGrants() };
  }
  if (user.role === 'viewer') {
    return { ...user, healthAccess: false, grants: viewOnlyGrants() };
  }
  return { ...user, grants: buildGrants((m, a) => user.grants[m][a]) };
}

const active = (s: MockSession) => s.status === 'approved';

/** The single check every screen uses: may the current user do `action` on `module`? */
export function can(session: MockSession, module: PermModule, action: PermAction): boolean {
  if (!active(session) || !isApplicable(module, action)) return false;
  if (session.role === 'superAdmin') return true;
  if (session.role === 'viewer') return action === 'view';
  return session.grants[module][action];
}

/** True when the user holds any non-view grant (used to show a "can edit" hint). */
export function canWriteAny(session: MockSession): boolean {
  return MODULES.some((m) => (['create', 'update', 'delete'] as const).some((a) => can(session, m, a)));
}

/** Only an approved Super Admin grants or revokes permissions (and approves requests). */
export function canManageUsers(session: MockSession): boolean {
  return active(session) && session.role === 'superAdmin';
}

/** Individual health data, read: healthAccess (Super Admin / Staff) or Commander Group. */
export function canViewHealth(session: MockSession): boolean {
  if (!active(session)) return false;
  if (session.commanderGroup) return true;
  return session.role !== 'viewer' && session.healthAccess;
}

/** Individual health data, write: healthAccess only. Commander Group is read-only. */
export function canEditHealth(session: MockSession): boolean {
  return active(session) && session.role !== 'viewer' && session.healthAccess;
}

/** Health aggregates (H-5 / N-2) follow the same read rule as individual health data. */
export function canSeeHealthAggregates(session: MockSession): boolean {
  return canViewHealth(session);
}

export function canReadAuditLogs(session: MockSession): boolean {
  return can(session, 'auditLogs', 'view');
}

/** Small-cell suppression for health counts (N-2): counts below 5 are shown as "<5". */
export function suppressSmall(count: number): string {
  return count > 0 && count < 5 ? '<5' : String(count);
}

export type EditCheck = { ok: true } | { ok: false; reason: string };

/**
 * May `actor` change `target`'s access? Mirrors the approved constraints that still apply:
 * no self-service changes, no client-side Super Admin creation or demotion (P-5 / N-6).
 */
export function checkAccessEdit(actor: MockSession, target: AppUser): EditCheck {
  if (!canManageUsers(actor)) {
    return { ok: false, reason: 'เฉพาะ Super Admin เท่านั้นที่กำหนดหรือเพิกถอนสิทธิ์ได้' };
  }
  if (actor.uid === target.uid) {
    return { ok: false, reason: 'ห้ามแก้ไขบทบาท สถานะ หรือสิทธิ์ของบัญชีตนเอง' };
  }
  return { ok: true };
}

/** Super Admin role/status cannot be changed from the client (P-5, N-6). */
export function isRoleLocked(target: AppUser): boolean {
  return target.role === 'superAdmin';
}
