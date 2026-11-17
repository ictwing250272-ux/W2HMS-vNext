import type { MockDataset, Room, RoomStatus } from './types';

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  occupied: 'มีผู้พัก',
  vacant: 'ว่าง',
  repair: 'ซ่อมบำรุง',
  unknown: 'ยังไม่ระบุ',
  closed: 'ปิดใช้งาน',
};

export const ROOM_STATUSES: readonly RoomStatus[] = [
  'occupied',
  'vacant',
  'repair',
  'unknown',
  'closed',
];

export function countRoomsByStatus(rooms: readonly Room[]): Record<RoomStatus, number> {
  const counts: Record<RoomStatus, number> = {
    occupied: 0,
    vacant: 0,
    repair: 0,
    unknown: 0,
    closed: 0,
  };
  for (const room of rooms) {
    counts[room.status] += 1;
  }
  return counts;
}

/** Occupancy % over rooms that can be occupied (excludes closed rooms). */
export function occupancyRate(rooms: readonly Room[]): number {
  const usable = rooms.filter((r) => r.status !== 'closed').length;
  if (usable === 0) return 0;
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  return Math.round((occupied / usable) * 100);
}

export function createLookups(data: MockDataset) {
  const zoneById = new Map(data.zones.map((z) => [z.id, z]));
  const buildingById = new Map(data.buildings.map((b) => [b.id, b]));
  const roomById = new Map(data.rooms.map((r) => [r.id, r]));
  const personById = new Map(data.people.map((p) => [p.id, p]));
  const stayById = new Map(data.stays.map((s) => [s.id, s]));
  return { zoneById, buildingById, roomById, personById, stayById };
}

/** Case-insensitive substring match over the given fields. */
export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return fields.some((f) => f?.toLowerCase().includes(q) ?? false);
}
