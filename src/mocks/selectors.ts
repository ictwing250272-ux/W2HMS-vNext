import type { AgeGroup, MockDataset, Room, RoomStatus } from './types';

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

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  child: 'เด็ก (0–12)',
  youth: 'เยาวชน (13–24)',
  adult: 'วัยทำงาน (25–59)',
  senior: 'ผู้สูงอายุ (60+)',
  unknown: 'ไม่ระบุอายุ',
};

export const AGE_GROUPS: readonly AgeGroup[] = ['child', 'youth', 'adult', 'senior', 'unknown'];

export interface Tally {
  key: string;
  label: string;
  count: number;
}

/**
 * Count items by key. With `order`, every listed key appears (zero counts included) in that
 * order; otherwise keys are sorted by count descending, then label.
 */
export function tally<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  options: { order?: readonly string[]; labels?: Readonly<Record<string, string>> } = {},
): Tally[] {
  const counts = new Map<string, number>();
  for (const key of options.order ?? []) counts.set(key, 0);
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = [...counts].map(([key, count]) => ({
    key,
    label: options.labels?.[key] ?? key,
    count,
  }));
  if (options.order === undefined) {
    rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'th'));
  }
  return rows;
}

/** Restrict the dataset's room-scoped collections to one zone ('' = all zones). */
export function filterByZone(data: MockDataset, zoneId: string) {
  if (zoneId === '') {
    return { rooms: data.rooms, stays: data.stays, vehicles: data.vehicles, tickets: data.tickets };
  }
  const roomIds = new Set(data.rooms.filter((r) => r.zoneId === zoneId).map((r) => r.id));
  return {
    rooms: data.rooms.filter((r) => roomIds.has(r.id)),
    stays: data.stays.filter((s) => roomIds.has(s.roomId)),
    vehicles: data.vehicles.filter((v) => roomIds.has(v.roomId)),
    tickets: data.tickets.filter((t) => roomIds.has(t.roomId)),
  };
}

export function isOpenTicket(t: { status: string }): boolean {
  return t.status === 'open' || t.status === 'inProgress';
}
