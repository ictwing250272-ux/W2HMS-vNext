/**
 * Typed, validated access to build-time environment variables.
 *
 * Every VITE_* value is embedded in the public bundle, so this module must
 * never be used for secrets.
 */

export type AppEnv = 'development' | 'production';

export interface FirebaseEmulatorConfig {
  host: string;
  authPort: number;
  firestorePort: number;
}

export interface FirebaseWebConfig {
  projectId: string;
  apiKey: string;
  authDomain: string;
  appId: string;
}

export interface AppConfig {
  appEnv: AppEnv;
  basePath: string;
  firebase: {
    useEmulator: boolean;
    web: FirebaseWebConfig;
    emulator: FirebaseEmulatorConfig;
  };
}

export type RawEnv = Readonly<Record<string, string | boolean | undefined>>;

export class EnvConfigError extends Error {
  override readonly name = 'EnvConfigError';
}

const DEMO_PROJECT_PREFIX = 'demo-';

function str(raw: RawEnv, key: string, fallback?: string): string {
  const value = raw[key];
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new EnvConfigError(`Missing required environment variable ${key}`);
}

function bool(raw: RawEnv, key: string, fallback: boolean): boolean {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new EnvConfigError(`${key} must be "true" or "false"`);
}

function port(raw: RawEnv, key: string, fallback: number): number {
  const value = str(raw, key, String(fallback));
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new EnvConfigError(`${key} must be a valid TCP port (got "${value}")`);
  }
  return n;
}

export function isDemoProjectId(projectId: string): boolean {
  return projectId.startsWith(DEMO_PROJECT_PREFIX);
}

/**
 * Emulator traffic (including auth tokens) is plain HTTP, so it must never leave
 * this machine. Only these exact loopback hostnames are accepted.
 */
export const ALLOWED_EMULATOR_HOSTS: readonly string[] = ['localhost', '127.0.0.1'];
const DEFAULT_EMULATOR_HOST = '127.0.0.1';
const EMULATOR_HOST_KEY = 'VITE_FIREBASE_EMULATOR_HOST';

export function isAllowedEmulatorHost(host: string): boolean {
  return ALLOWED_EMULATOR_HOSTS.includes(host);
}

/**
 * Unset → default loopback host. Set but empty, not a string, or anything other
 * than an exact allowed hostname (no scheme, port, path, credentials, trailing dot,
 * alternative IP notation or other case) → rejected.
 */
function emulatorHost(raw: RawEnv): string {
  const value = raw[EMULATOR_HOST_KEY];
  if (value === undefined) {
    return DEFAULT_EMULATOR_HOST;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new EnvConfigError(`${EMULATOR_HOST_KEY} must not be empty when set`);
  }
  const host = value.trim();
  if (!isAllowedEmulatorHost(host)) {
    throw new EnvConfigError(
      `${EMULATOR_HOST_KEY} must be one of ${ALLOWED_EMULATOR_HOSTS.join(', ')} (got "${host}")`,
    );
  }
  return host;
}

/** Parse and validate raw env values. Pure function — safe to unit test. */
export function parseEnv(raw: RawEnv): AppConfig {
  const appEnvRaw = str(raw, 'VITE_APP_ENV', 'development');
  if (appEnvRaw !== 'development' && appEnvRaw !== 'production') {
    throw new EnvConfigError(`VITE_APP_ENV must be "development" or "production"`);
  }

  const basePath = str(raw, 'VITE_BASE_PATH', '/W2HMS-vNext/');
  if (!basePath.startsWith('/') || !basePath.endsWith('/')) {
    throw new EnvConfigError('VITE_BASE_PATH must start and end with "/"');
  }

  const useEmulator = bool(raw, 'VITE_USE_FIREBASE_EMULATOR', true);
  const projectId = str(raw, 'VITE_FIREBASE_PROJECT_ID', 'demo-w2hms');

  if (useEmulator && !isDemoProjectId(projectId)) {
    throw new EnvConfigError(
      `Emulator mode requires a "${DEMO_PROJECT_PREFIX}" project ID so no real Firebase project is contacted (got "${projectId}")`,
    );
  }

  return {
    appEnv: appEnvRaw,
    basePath,
    firebase: {
      useEmulator,
      web: {
        projectId,
        apiKey: str(raw, 'VITE_FIREBASE_API_KEY', useEmulator ? 'demo-api-key' : undefined),
        authDomain: str(
          raw,
          'VITE_FIREBASE_AUTH_DOMAIN',
          useEmulator ? `${projectId}.firebaseapp.com` : undefined,
        ),
        appId: str(raw, 'VITE_FIREBASE_APP_ID', useEmulator ? 'demo-app-id' : undefined),
      },
      emulator: {
        host: emulatorHost(raw),
        authPort: port(raw, 'VITE_FIREBASE_AUTH_EMULATOR_PORT', 9099),
        firestorePort: port(raw, 'VITE_FIREBASE_FIRESTORE_EMULATOR_PORT', 8080),
      },
    },
  };
}

let cached: AppConfig | undefined;

/** Application config parsed from `import.meta.env` (memoised). */
export function getConfig(): AppConfig {
  cached ??= parseEnv(import.meta.env);
  return cached;
}
