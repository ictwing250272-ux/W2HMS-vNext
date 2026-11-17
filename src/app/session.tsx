import { useMemo, useState, type ReactNode } from 'react';

import { normaliseSession, type MockSession } from './permissions';
import { SessionContext, type SessionContextValue } from './sessionContext';

const DEFAULT_SESSION: MockSession = { role: 'officer', healthAccess: false, canExport: false };

export function MockSessionProvider({
  children,
  initial = DEFAULT_SESSION,
}: {
  children: ReactNode;
  initial?: MockSession;
}) {
  const [session, setRaw] = useState<MockSession>(() => normaliseSession(initial));
  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      setSession: (next) => {
        setRaw(normaliseSession(next));
      },
    }),
    [session],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
