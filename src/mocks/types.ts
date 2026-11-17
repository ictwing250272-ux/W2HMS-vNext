/**
 * Prototype domain types (Phase 1.6).
 *
 * These mirror the DRAFT schema in docs/FIRESTORE-SCHEMA.md for UI purposes only.
 * They are not an approved Firestore schema.
 */

export type Role = 'superAdmin' | 'admin' | 'officer' | 'viewer';
export type RoomStatus = 'unknown' | 'vacant' | 'occupied' | 'repair' | 'closed';
export type StayStatus = 'active' | 'ended';
export type TicketStatus = 'open' | 'inProgress' | 'done' | 'cancelled';
export type VehicleType = 'car' | 'motorcycle';
export type AgeGroup = 'child' | 'youth' | 'adult' | 'senior' | 'unknown';

export interface Zone {
  id: string;
  name: string;
}

export interface Building {
  id: string;
  name: string;
  zoneId: string;
  kind: 'block' | 'single';
  roomCount: number;
}

export interface Room {
  id: string;
  buildingId: string;
  zoneId: string;
  roomNo: number;
  code: string;
  status: RoomStatus;
  type: string;
  currentStayId: string | null;
}

export interface Person {
  id: string;
  fullName: string;
  rank: string;
  unitName: string;
}

export interface Stay {
  id: string;
  roomId: string;
  personId: string;
  status: StayStatus;
  checkIn: string;
  /** stayPrivate (Viewer may read — OI-1). Synthetic value only. */
  phone: string;
  /** Count only; individual stayMembers are not shown in the prototype. */
  memberCount: number;
  /** Age group per co-resident (length === memberCount). Used for aggregate charts only. */
  memberAgeGroups: AgeGroup[];
}

export interface Vehicle {
  id: string;
  stayId: string;
  roomId: string;
  personId: string;
  type: VehicleType;
  plate: string;
  province: string;
}

export interface MaintenanceTicket {
  id: string;
  roomId: string;
  category: string;
  title: string;
  status: TicketStatus;
  openedAt: string;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  status: 'approved' | 'suspended';
  healthAccess: boolean;
  canExport: boolean;
}

export interface AccessRequest {
  uid: string;
  fullName: string;
  requestedRole: 'officer' | 'viewer';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/** Aggregated counts only (H-5): no names or per-person details. */
export interface HealthAggregate {
  label: string;
  count: number;
}

export interface MockDataset {
  zones: Zone[];
  buildings: Building[];
  rooms: Room[];
  people: Person[];
  stays: Stay[];
  vehicles: Vehicle[];
  tickets: MaintenanceTicket[];
  users: AppUser[];
  accessRequests: AccessRequest[];
  healthAggregates: HealthAggregate[];
}
