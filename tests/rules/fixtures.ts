/**
 * SYNTHETIC fixtures for Firestore Rules tests (Phase 2A Step 3).
 *
 * Every uid, name and e-mail here is fictional ("@example.test"). No data is taken
 * from the legacy system or any real person. Shapes follow the DRAFT schema in
 * docs/FIRESTORE-SCHEMA.md and will change if that draft changes.
 *
 * Values that are still PENDING decisions are NOT invented here:
 * MAX_SEQ (P-10), COOLDOWN (P-11), the applicant actorRole for E15 (P-12),
 * first-request audit (P-13) and the final E15 code (P-14).
 */
import { Timestamp } from 'firebase/firestore';

export type Role = 'superAdmin' | 'admin' | 'officer' | 'viewer';

export interface TestUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  /** Undefined for applicants who have no `users/{uid}` document yet. */
  role?: Role;
  status?: 'approved' | 'suspended';
  healthAccess: boolean;
  canExport: boolean;
}

function account(
  uid: string,
  role: Role | undefined,
  options: Partial<Pick<TestUser, 'status' | 'healthAccess' | 'canExport' | 'emailVerified'>> = {},
): TestUser {
  return {
    uid,
    email: `${uid}@example.test`,
    emailVerified: options.emailVerified ?? true,
    ...(role === undefined ? {} : { role, status: options.status ?? 'approved' }),
    healthAccess: options.healthAccess ?? false,
    canExport: options.canExport ?? false,
  };
}

/** Synthetic test accounts (docs/EMULATOR-TEST-PLAN.md §2). */
export const USERS = {
  sa1: account('testsa1', 'superAdmin', { healthAccess: true, canExport: true }),
  sa2: account('testsa2', 'superAdmin'),
  sa3: account('testsa3', 'superAdmin'),
  adminHealth: account('testadh', 'admin', { healthAccess: true, canExport: true }),
  admin: account('testad1', 'admin'),
  admin2: account('testad2', 'admin'),
  officerHealthExport: account('testofhx', 'officer', { healthAccess: true, canExport: true }),
  officer: account('testof1', 'officer'),
  viewer: account('testvw1', 'viewer'),
  /** Viewer seeded with healthAccess=true: must still be denied health data (D2). */
  viewerHealth: account('testvwh', 'viewer', { healthAccess: true }),
  suspended: account('testsusp', 'officer', { status: 'suspended' }),
  /** Applicants: signed in, no users/{uid} document. */
  applicantU: account('testappu', undefined),
  applicantV: account('testappv', undefined),
  unverified: account('testunver', undefined, { emailVerified: false }),
} as const satisfies Record<string, TestUser>;

/** Fixed timestamp for seeded documents (seeding bypasses request.time checks). */
export const SEED_TIME = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));

/** requestId = `{uid}_{seq}` (DRAFT — P-14 Pending). */
export function requestId(uid: string, seq: number): string {
  return `${uid}_${String(seq)}`;
}

/** Audit document ID `{col}_{id}_v{n}`. */
export function auditId(col: string, id: string, version: number): string {
  return `${col}_${id}_v${String(version)}`;
}

export function userDoc(user: TestUser, approvedBy: TestUser, seq = 1) {
  if (user.role === undefined || user.status === undefined) {
    throw new Error(`${user.uid} is an applicant and has no users document`);
  }
  return {
    email: user.email,
    displayName: `ผู้ใช้ทดสอบ ${user.uid}`,
    rank: 'ยศทดสอบ',
    unitName: 'หน่วยทดสอบ 1',
    role: user.role,
    status: user.status,
    healthAccess: user.healthAccess,
    canExport: user.canExport,
    approvedBy: approvedBy.uid,
    approvedAt: SEED_TIME,
    requestId: requestId(user.uid, seq),
    requestedRole: user.role,
    requestedAt: SEED_TIME,
  };
}

export function accessRequestDoc(
  user: TestUser,
  seq: number,
  status: 'pending' | 'rejected',
  requestedRole: 'officer' | 'viewer' = 'officer',
) {
  return {
    uid: user.uid,
    seq,
    email: user.email,
    fullName: `ผู้สมัครทดสอบ ${user.uid}`,
    rank: 'ยศทดสอบ',
    unitName: 'หน่วยทดสอบ 1',
    reason: 'เหตุผลทดสอบ',
    requestedRole,
    status,
    createdAt: SEED_TIME,
    ...(status === 'rejected' ? { rejectedBy: USERS.admin.uid, rejectedAt: SEED_TIME } : {}),
  };
}
