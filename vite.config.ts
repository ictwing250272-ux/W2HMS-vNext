/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Base path for GitHub Pages project sites: https://<owner>.github.io/<repo>/
 * Override with VITE_BASE_PATH (must start and end with "/").
 */
const DEFAULT_BASE_PATH = '/W2HMS-vNext/';

/**
 * Production Content-Security-Policy.
 *
 * GitHub Pages cannot set HTTP security headers, so the CSP is delivered via <meta>.
 * It is injected into production builds only: the Vite dev server needs inline
 * styles/scripts and a WebSocket for hot module replacement, and runs on 127.0.0.1.
 *
 * connect-src lists only origins the production bundle actually calls. In Phase 1 the
 * bundle makes no cross-origin requests (the Firebase SDK is not imported yet), so it
 * is 'self' only. When Phase 2 wires up Firebase, add the exact endpoints it uses
 * (e.g. https://firestore.googleapis.com, https://identitytoolkit.googleapis.com,
 * https://securetoken.googleapis.com) — never wildcards, loopback or ws:// hosts.
 */
const PRODUCTION_CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
] as const;

/** Tokens that must never appear in the production CSP (regression guard). */
const FORBIDDEN_PRODUCTION_CSP_TOKENS = [
  "'unsafe-inline'",
  "'unsafe-eval'",
  '127.0.0.1',
  'localhost',
  'ws:',
  'wss:',
  'http:',
  '*',
] as const;

function buildProductionCsp(): string {
  const csp = PRODUCTION_CSP_DIRECTIVES.join('; ');
  const found = FORBIDDEN_PRODUCTION_CSP_TOKENS.filter((token) => csp.includes(token));
  if (found.length > 0) {
    throw new Error(`Production CSP contains forbidden token(s): ${found.join(', ')}`);
  }
  return csp;
}

function cspMetaPlugin(): Plugin {
  const CONTENT_SECURITY_POLICY = buildProductionCsp();
  return {
    name: 'w2hms-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const fromEnv = env.VITE_BASE_PATH?.trim();
  const base = fromEnv ? fromEnv : DEFAULT_BASE_PATH;

  if (!base.startsWith('/') || !base.endsWith('/')) {
    throw new Error(`VITE_BASE_PATH must start and end with "/" (got "${base}")`);
  }

  return {
    base,
    plugins: [react(), cspMetaPlugin()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      target: 'es2022',
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  };
});
