import { describe, expect, it } from 'vitest';

import { EnvConfigError, isDemoProjectId, parseEnv } from './env';

describe('parseEnv', () => {
  it('defaults to development + emulator with a demo project', () => {
    const config = parseEnv({});
    expect(config.appEnv).toBe('development');
    expect(config.basePath).toBe('/W2HMS-vNext/');
    expect(config.firebase.useEmulator).toBe(true);
    expect(config.firebase.web.projectId).toBe('demo-w2hms');
    expect(config.firebase.emulator).toEqual({
      host: '127.0.0.1',
      authPort: 9099,
      firestorePort: 8080,
    });
  });

  it('rejects emulator mode with a non-demo project ID', () => {
    expect(() =>
      parseEnv({ VITE_USE_FIREBASE_EMULATOR: 'true', VITE_FIREBASE_PROJECT_ID: 'real-project' }),
    ).toThrow(EnvConfigError);
  });

  it('requires web config when emulator mode is off', () => {
    expect(() =>
      parseEnv({ VITE_USE_FIREBASE_EMULATOR: 'false', VITE_FIREBASE_PROJECT_ID: 'some-project' }),
    ).toThrow(/VITE_FIREBASE_API_KEY/);
  });

  it('rejects an invalid app env', () => {
    expect(() => parseEnv({ VITE_APP_ENV: 'staging' })).toThrow(EnvConfigError);
  });

  it('rejects a base path without leading/trailing slash', () => {
    expect(() => parseEnv({ VITE_BASE_PATH: 'W2HMS-vNext' })).toThrow(/VITE_BASE_PATH/);
  });

  it('rejects an invalid boolean', () => {
    expect(() => parseEnv({ VITE_USE_FIREBASE_EMULATOR: 'yes' })).toThrow(EnvConfigError);
  });

  it('rejects an invalid port', () => {
    expect(() => parseEnv({ VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: '99999' })).toThrow(
      /valid TCP port/,
    );
  });
});

describe('isDemoProjectId', () => {
  it('recognises demo- project IDs only', () => {
    expect(isDemoProjectId('demo-w2hms')).toBe(true);
    expect(isDemoProjectId('w2hms-demo')).toBe(false);
  });
});

describe('VITE_FIREBASE_EMULATOR_HOST (loopback only)', () => {
  const hostOf = (value: string | boolean | undefined) =>
    parseEnv({ VITE_FIREBASE_EMULATOR_HOST: value }).firebase.emulator.host;

  it('defaults to 127.0.0.1 when unset', () => {
    expect(hostOf(undefined)).toBe('127.0.0.1');
  });

  it.each(['localhost', '127.0.0.1'])('accepts %s', (host) => {
    expect(hostOf(host)).toBe(host);
  });

  it('trims surrounding whitespace', () => {
    expect(hostOf('  localhost  ')).toBe('localhost');
  });

  it.each(['8.8.8.8', '10.0.0.5', '192.168.1.10', '127.0.0.2', '0.0.0.0'])(
    'rejects other IP address %s',
    (host) => {
      expect(() => hostOf(host)).toThrow(EnvConfigError);
    },
  );

  it.each(['evil.example.com', 'localhost.evil.com', 'evil-localhost', 'firebase.google.com'])(
    'rejects external domain %s',
    (host) => {
      expect(() => hostOf(host)).toThrow(EnvConfigError);
    },
  );

  it.each(['', '   '])('rejects an empty value %j', (host) => {
    expect(() => hostOf(host)).toThrow(/must not be empty/);
  });

  it.each([
    'http://127.0.0.1',
    '127.0.0.1:8080',
    'localhost/path',
    'user@localhost',
    'localhost.',
    'LOCALHOST',
    '[::1]',
    '2130706433',
    '0x7f.0.0.1',
    '127.1',
    '127.0.0.1 evil.com',
  ])('rejects malformed or alternative notation %j', (host) => {
    expect(() => hostOf(host)).toThrow(EnvConfigError);
  });

  it('rejects a non-string value', () => {
    expect(() => hostOf(true)).toThrow(EnvConfigError);
  });
});
