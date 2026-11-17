import { defineConfig } from 'vitest/config';

// Firestore Rules tests: run only via `npm run test:rules` (Firebase Emulator, demo-w2hms).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    // Test files share one emulator project and clear it between tests.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
