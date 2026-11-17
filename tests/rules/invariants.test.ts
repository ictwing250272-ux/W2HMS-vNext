/**
 * Baseline invariants (docs/EMULATOR-TEST-PLAN.md §7.7).
 *
 * These must be DENY under the current deny-all placeholder AND under the future
 * real rules. A PASS here only shows that default deny works — it is NOT evidence
 * for P-8 / P-9 / E15 (see access-requests.test.ts, still NOT IMPLEMENTED).
 */
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { USERS, accessRequestDoc, auditId, requestId, userDoc } from './fixtures';
import {
  ALLOWED_EMULATOR_HOSTS,
  PROJECT_ID,
  RulesTestGuardError,
  asAnonymous,
  asUser,
  assertDemoProject,
  createTestEnv,
  dbOf,
  emulatorTarget,
  seed,
} from './helpers';

describe('test harness guard (no real Firebase project)', () => {
  it('GUARD-01 uses an offline demo- project', () => {
    expect(PROJECT_ID.startsWith('demo-')).toBe(true);
    expect(() => {
      assertDemoProject('w2hms-fbdcb');
    }).toThrow(RulesTestGuardError);
    expect(() => {
      assertDemoProject('bn2-housing');
    }).toThrow(RulesTestGuardError);
  });

  it('GUARD-02 accepts only a loopback emulator host', () => {
    expect(ALLOWED_EMULATOR_HOSTS).toEqual(['127.0.0.1', 'localhost']);
    expect(emulatorTarget('127.0.0.1:8080')).toEqual({ host: '127.0.0.1', port: 8080 });
    for (const bad of ['', 'firestore.googleapis.com:443', '10.0.0.5:8080', 'evil.example:8080']) {
      expect(() => emulatorTarget(bad)).toThrow(RulesTestGuardError);
    }
  });
});

describe('baseline invariants (default deny)', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await createTestEnv();
  });

  afterEach(async () => {
    await env.clearFirestore();
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it('INV-01 anonymous client cannot read an access request', async () => {
    const id = requestId(USERS.applicantU.uid, 1);
    await seed(env, async (db) => {
      await setDoc(doc(db, 'accessRequests', id), accessRequestDoc(USERS.applicantU, 1, 'pending'));
    });
    await assertFails(getDoc(doc(dbOf(asAnonymous(env)), 'accessRequests', id)));
  });

  it('INV-02 anonymous client cannot create a users document', async () => {
    await assertFails(
      setDoc(
        doc(dbOf(asAnonymous(env)), 'users', USERS.officer.uid),
        userDoc(USERS.officer, USERS.admin),
      ),
    );
  });

  it('INV-03 no client can write the Super Admin registry', async () => {
    for (const user of [USERS.applicantU, USERS.admin, USERS.sa1]) {
      await assertFails(
        setDoc(doc(dbOf(asUser(env, user)), 'system', 'superAdmins'), {
          uids: [user.uid],
        }),
      );
    }
  });

  it('INV-04 no client can delete an audit log', async () => {
    const id = auditId('users', USERS.officer.uid, 1);
    await seed(env, async (db) => {
      await setDoc(doc(db, 'userAuditLogs', id), { eventCode: 'REQUEST_APPROVED' });
    });
    for (const user of [USERS.sa1, USERS.admin, USERS.officer]) {
      await assertFails(deleteDoc(doc(dbOf(asUser(env, user)), 'userAuditLogs', id)));
    }
  });

  it('INV-05 an undefined collection is denied for everyone', async () => {
    await assertFails(
      setDoc(doc(dbOf(asUser(env, USERS.sa1)), 'undefinedCollection', 'x'), { a: 1 }),
    );
    await assertFails(getDoc(doc(dbOf(asAnonymous(env)), 'undefinedCollection', 'x')));
  });
});
