import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseEnv, type AppConfig } from '../config/env';
import { assertEmulatorOnly, createFirebaseClients, FirebaseGuardError } from './firebase';

// Mock the Firebase SDK so no test can initialise Firebase or open a connection.
const sdk = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getAuth: vi.fn(() => ({ name: 'mock-auth' })),
  connectAuthEmulator: vi.fn(),
  initializeFirestore: vi.fn(() => ({ name: 'mock-db' })),
  memoryLocalCache: vi.fn(() => ({ kind: 'memory' })),
  connectFirestoreEmulator: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: sdk.initializeApp }));
vi.mock('firebase/auth', () => ({
  getAuth: sdk.getAuth,
  connectAuthEmulator: sdk.connectAuthEmulator,
}));
vi.mock('firebase/firestore', () => ({
  initializeFirestore: sdk.initializeFirestore,
  memoryLocalCache: sdk.memoryLocalCache,
  connectFirestoreEmulator: sdk.connectFirestoreEmulator,
}));

function withFirebase(overrides: Partial<AppConfig['firebase']>): AppConfig {
  const base = parseEnv({});
  return { ...base, firebase: { ...base.firebase, ...overrides } };
}

/** Builds an AppConfig by hand with an arbitrary host, bypassing parseEnv(). */
function withHost(host: unknown): AppConfig {
  const base = parseEnv({});
  return withFirebase({ emulator: { ...base.firebase.emulator, host: host as string } });
}

const DISALLOWED_HOSTS: unknown[] = [
  // external IPs / other loopback addresses
  '8.8.8.8',
  '10.0.0.5',
  '192.168.1.10',
  '127.0.0.2',
  '0.0.0.0',
  // external domains
  'evil.example.com',
  'localhost.evil.com',
  'firebase.google.com',
  // URLs, ports, paths, credentials
  'http://127.0.0.1',
  'https://localhost',
  '127.0.0.1:8080',
  'localhost:9099',
  'localhost/path',
  '127.0.0.1/x?y=1',
  'user@localhost',
  // alternative notations / formatting
  'localhost.',
  'LOCALHOST',
  ' localhost',
  'localhost ',
  '[::1]',
  '::1',
  '2130706433',
  '0x7f.0.0.1',
  '127.1',
  // empty / wrong type
  '',
  undefined,
  null,
  42,
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('assertEmulatorOnly (Phase 1 guard)', () => {
  it('allows the emulator with a demo project', () => {
    expect(() => {
      assertEmulatorOnly(parseEnv({}));
    }).not.toThrow();
  });

  it('blocks a real (non-emulator) connection', () => {
    expect(() => {
      assertEmulatorOnly(withFirebase({ useEmulator: false }));
    }).toThrow(FirebaseGuardError);
  });

  it('blocks a non-demo project ID even in emulator mode', () => {
    const base = parseEnv({});
    const config = withFirebase({ web: { ...base.firebase.web, projectId: 'real-project' } });
    expect(() => {
      assertEmulatorOnly(config);
    }).toThrow(/demo-/);
  });

  it.each(['localhost', '127.0.0.1'])('allows loopback host %s', (host) => {
    expect(() => {
      assertEmulatorOnly(withHost(host));
    }).not.toThrow();
  });

  it.each(DISALLOWED_HOSTS)('blocks host %j in a hand-built config', (host) => {
    expect(() => {
      assertEmulatorOnly(withHost(host));
    }).toThrow(FirebaseGuardError);
  });
});

describe('createFirebaseClients', () => {
  it.each(['localhost', '127.0.0.1'])('connects both emulators to %s', (host) => {
    createFirebaseClients(withHost(host));

    expect(sdk.initializeApp).toHaveBeenCalledTimes(1);
    expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(
      expect.anything(),
      `http://${host}:9099`,
      expect.anything(),
    );
    expect(sdk.connectFirestoreEmulator).toHaveBeenCalledWith(expect.anything(), host, 8080);
  });

  it.each(DISALLOWED_HOSTS)(
    'rejects host %j before Firebase is initialised or connected',
    (host) => {
      expect(() => createFirebaseClients(withHost(host))).toThrow(FirebaseGuardError);

      expect(sdk.initializeApp).not.toHaveBeenCalled();
      expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();
      expect(sdk.connectFirestoreEmulator).not.toHaveBeenCalled();
    },
  );

  it('rejects a non-emulator config before Firebase is initialised', () => {
    expect(() => createFirebaseClients(withFirebase({ useEmulator: false }))).toThrow(
      FirebaseGuardError,
    );
    expect(sdk.initializeApp).not.toHaveBeenCalled();
  });
});
