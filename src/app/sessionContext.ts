import { createContext, useContext } from 'react';

import type { AccessRequest, AppUser, MockDataset, Room } from '../mocks/types';
import type { EditCheck, MockSession } from './permissions';

export type RoomPatch = Partial<Pick<Room, 'status' | 'type' | 'note' | 'checked' | 'submitted'>>;
export type UserPatch = Partial<
  Pick<AppUser, 'role' | 'status' | 'healthAccess' | 'commanderGroup' | 'grants'>
>;

export interface SessionContextValue {
  /** The mock user currently acted as (normalised). */
  session: MockSession;
  users: AppUser[];
  accessRequests: AccessRequest[];
  /** In-memory copy of the synthetic dataset; changes are lost on reload. */
  data: MockDataset;
  actAs: (uid: string) => void;
  updateUser: (uid: string, patch: UserPatch) => EditCheck;
  approveRequest: (uid: string, role: 'staff' | 'viewer') => EditCheck;
  rejectRequest: (uid: string) => EditCheck;
  updateRoom: (roomId: string, patch: RoomPatch) => EditCheck;
  deleteTicket: (ticketId: string) => EditCheck;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useMockSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useMockSession must be used inside <MockSessionProvider>');
  }
  return value;
}
