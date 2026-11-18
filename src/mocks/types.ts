/**
 * Prototype domain types.
 *
 * These mirror the DRAFT schema in docs/FIRESTORE-SCHEMA.md for UI purposes only.
 * They are not an approved Firestore schema.
 */

/**
 * Prototype roles. Admin and Officer are merged into Staff (owner directive, 2026-11-18);
 * Staff capabilities come from per-user grants set by a Super Admin.
 * NOTE: docs/SECURITY-DECISIONS.md still lists Super Admin / Admin / Officer / Viewer.
 */
export type Role = 'superAdmin' | 'staff' | 'viewer';
export type AccountStatus = 'approved' | 'suspended';
export type RoomStatus = 'unknown' | 'vacant' | 'occupied' | 'repair' | 'closed';
export type StayStatus = 'active' | 'ended';
export type TicketStatus = 'open' | 'inProgress' | 'done' | 'cancelled';
export type VehicleType = 'car' | 'motorcycle';
export type AgeGroup = 'child' | 'youth' | 'adult' | 'senior' | 'unknown';
export type BuildingKind = 'housing' | 'office';

/** Data areas a Super Admin can grant per user. Health is NOT a module (healthAccess / Commander Group). */
export type PermModule = 'housing' | 'stays' | 'personnel' | 'vehicles' | 'maintenance' | 'auditLogs';
export type PermAction = 'view' | 'create' | 'update' | 'delete' | 'export';
export type Grants = Record<PermModule, Record<PermAction, boolean>>;

export interface Zone {
  id: string;
  name: string;
}

export interface Building {
  id: string;
  name: string;
  zoneId: string;
  kind: BuildingKind;
  floors: number;
  roomCount: number;
}

export interface Room {
  id: string;
  buildingId: string;
  zoneId: string;
  floor: number;
  roomNo: number;
  code: string;
  status: RoomStatus;
  type: string;
  /** General note — must never contain health information (C2/C3). */
  note: string;
  checked: boolean;
  submitted: boolean;
  updatedAt: string;
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
  checkOut: string | null;
  /** stayPrivate (Viewer may read — OI-1). Synthetic value only. */
  phone: string;
  /** Number of stayMembers for this stay. */
  memberCount: number;
  /** Age group per co-resident (length === memberCount). Used for aggregate charts only. */
  memberAgeGroups: AgeGroup[];
}

/** stayMembers (C3): household members, one document each. No health keys. */
export interface StayMember {
  id: string;
  stayId: string;
  roomId: string;
  name: string;
  relation: string;
  birthYear: number | null;
}

export type CareLimitation =
  | 'bedridden'
  | 'wheelchair'
  | 'mobilityAid'
  | 'needsCaregiver'
  | 'visualHearing'
  | 'other';

/**
 * personnelHealth/{stayId}_{subjectId} (H-S2): kept in its own collection, never joined into
 * rooms, stays, notes, tags, tooltips, search or summaries. Codes only, no free text (H-1/H-3).
 */
export interface PersonnelHealth {
  id: string;
  stayId: string;
  roomId: string;
  subjectType: 'occupant' | 'member';
  subjectId: string;
  conditionCodes: string[];
  careLimitations: CareLimitation[];
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
  status: AccountStatus;
  /** Read + write individual health data (Super Admin / Staff only, K3: granted by Super Admin). */
  healthAccess: boolean;
  /** Commander Group: read-only individual health data. Conflicts with D2 for Viewer — pending decision. */
  commanderGroup: boolean;
  grants: Grants;
}

export interface AccessRequest {
  uid: string;
  fullName: string;
  requestedRole: 'staff' | 'viewer';
  status: 'pending' | 'rejected';
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
  stayMembers: StayMember[];
  personnelHealth: PersonnelHealth[];
  vehicles: Vehicle[];
  tickets: MaintenanceTicket[];
  users: AppUser[];
  accessRequests: AccessRequest[];
  healthAggregates: HealthAggregate[];
}
