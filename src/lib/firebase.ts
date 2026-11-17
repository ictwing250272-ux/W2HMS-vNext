/**
 * Firebase client factory.
 *
 * PHASE 1 GUARD: only the local Firebase Emulator Suite with a "demo-" project
 * ID is allowed. Connecting a real Firebase project (e.g. w2hms-fbdcb) is not
 * approved yet; lifting this guard is a Phase 2 decision.
 *
 * Nothing in the Phase 1 app imports this module, so it is not part of the
 * production bundle until a later phase uses it.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';

import {
  ALLOWED_EMULATOR_HOSTS,
  isAllowedEmulatorHost,
  isDemoProjectId,
  type AppConfig,
} from '../config/env';

export interface FirebaseClients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

export class FirebaseGuardError extends Error {
  override readonly name = 'FirebaseGuardError';
}

/**
 * Throws unless the config targets the local emulator with a demo project on a
 * loopback host.
 *
 * The host check repeats the one in parseEnv() on purpose (defence in depth): an
 * AppConfig built by hand, without parseEnv(), must not be able to point the
 * plain-HTTP emulator connection — and the auth tokens sent over it — at another
 * machine. Exact match only: no trimming, scheme, port, path or other notation.
 */
export function assertEmulatorOnly(config: AppConfig): void {
  const { useEmulator, web, emulator } = config.firebase;
  if (!useEmulator) {
    throw new FirebaseGuardError(
      'Phase 1: connecting a real Firebase project is not approved. Set VITE_USE_FIREBASE_EMULATOR=true.',
    );
  }
  if (!isDemoProjectId(web.projectId)) {
    throw new FirebaseGuardError(
      `Phase 1: emulator project ID must start with "demo-" (got "${web.projectId}").`,
    );
  }
  if (!isAllowedEmulatorHost(emulator.host)) {
    throw new FirebaseGuardError(
      `Emulator host must be one of ${ALLOWED_EMULATOR_HOSTS.join(', ')} (got "${emulator.host}").`,
    );
  }
}

export function createFirebaseClients(config: AppConfig): FirebaseClients {
  assertEmulatorOnly(config);

  const { web, emulator } = config.firebase;
  const app = initializeApp({
    projectId: web.projectId,
    apiKey: web.apiKey,
    authDomain: web.authDomain,
    appId: web.appId,
  });

  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${emulator.host}:${String(emulator.authPort)}`, {
    disableWarnings: true,
  });

  // Memory-only cache: never persist Firestore data (personal data) in the browser.
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  connectFirestoreEmulator(db, emulator.host, emulator.firestorePort);

  return { app, auth, db };
}
