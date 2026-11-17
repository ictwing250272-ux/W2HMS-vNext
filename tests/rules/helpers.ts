/**
 * Firestore Rules test helpers (Phase 2A Step 3).
 *
 * SAFETY: these helpers only ever talk to the local Firestore Emulator for the
 * offline "demo-" project. They refuse to start if the emulator host is not a
 * loopback address or the project ID is not the demo project — they never touch
 * a real Firebase project (w2hms-fbdcb) or the legacy project (bn2-housing).
 *
 * Run through `npm run test:rules`, which starts the emulator with
 * `firebase emulators:exec --project demo-w2hms` and sets FIRESTORE_EMULATOR_HOST.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

import type { Firestore } from 'firebase/firestore';

import type { TestUser } from './fixtures';

export const PROJECT_ID = 'demo-w2hms';
export const ALLOWED_EMULATOR_HOSTS: readonly string[] = ['127.0.0.1', 'localhost'];

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url));

export class RulesTestGuardError extends Error {
  override readonly name = 'RulesTestGuardError';
}

/** Throws unless the project ID is an offline "demo-" project. */
export function assertDemoProject(projectId: string): void {
  if (!projectId.startsWith('demo-')) {
    throw new RulesTestGuardError(`Rules tests must use a "demo-" project (got "${projectId}").`);
  }
  // emulators:exec exports the project it was started with; it must match.
  const fromCli = process.env.GCLOUD_PROJECT;
  if (fromCli !== undefined && fromCli !== projectId) {
    throw new RulesTestGuardError(
      `Emulator was started for "${fromCli}", expected "${projectId}".`,
    );
  }
}

/** Reads FIRESTORE_EMULATOR_HOST and only accepts a loopback host. */
export function emulatorTarget(raw = process.env.FIRESTORE_EMULATOR_HOST): {
  host: string;
  port: number;
} {
  if (raw === undefined || raw === '') {
    throw new RulesTestGuardError(
      'FIRESTORE_EMULATOR_HOST is not set. Run the rules tests with `npm run test:rules`.',
    );
  }
  const match = /^([^:]+):(\d{1,5})$/.exec(raw);
  const host = match?.[1];
  const portText = match?.[2];
  if (host === undefined || portText === undefined) {
    throw new RulesTestGuardError(`Unrecognised FIRESTORE_EMULATOR_HOST "${raw}".`);
  }
  if (!ALLOWED_EMULATOR_HOSTS.includes(host)) {
    throw new RulesTestGuardError(
      `Firestore emulator host must be one of ${ALLOWED_EMULATOR_HOSTS.join(', ')} (got "${host}").`,
    );
  }
  return { host, port: Number(portText) };
}

/** Creates a test environment that loads the repository's firestore.rules. */
export async function createTestEnv(): Promise<RulesTestEnvironment> {
  assertDemoProject(PROJECT_ID);
  const { host, port } = emulatorTarget();
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host, port },
  });
}

/** A signed-in client for a synthetic test user (token claims mirror Firebase Auth). */
export function asUser(env: RulesTestEnvironment, user: TestUser): RulesTestContext {
  return env.authenticatedContext(user.uid, {
    email: user.email,
    email_verified: user.emailVerified,
  });
}

/** A client that is not signed in. */
export function asAnonymous(env: RulesTestEnvironment): RulesTestContext {
  return env.unauthenticatedContext();
}

/**
 * Firestore handle for the modular SDK.
 *
 * RulesTestContext.firestore() returns the compat instance; the modular functions
 * (doc, getDoc, setDoc, writeBatch, …) accept it and unwrap it internally, which is
 * the bridge documented by @firebase/rules-unit-testing. The cast is kept here, in
 * one place, so tests use the modular `Firestore` type everywhere else.
 */
export function dbOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

/** Writes fixture data with Security Rules disabled (emulator only). */
export async function seed(
  env: RulesTestEnvironment,
  write: (db: Firestore) => Promise<void>,
): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await write(dbOf(context));
  });
}
