import { createContext, useContext } from 'react';

import type { MockSession } from './permissions';

export interface SessionContextValue {
  session: MockSession;
  setSession: (next: MockSession) => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useMockSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useMockSession must be used inside <MockSessionProvider>');
  }
  return value;
}
