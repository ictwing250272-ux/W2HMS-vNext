import { describe, expect, it } from 'vitest';

import { createMockDataset, mockData } from './data';
import { createSiteLayout } from './layout';
import { countRoomsByStatus, filterByZone, occupancyRate, tally } from './selectors';

describe('mock dataset', () => {
  it('is deterministic for the same seed', () => {
    expect(createMockDataset(2026)).toEqual(createMockDataset(2026));
  });

  it('has referential integrity between rooms, stays, people and vehicles', () => {
    const roomIds = new Set(mockData.rooms.map((r) => r.id));
    const personIds = new Set(mockData.people.map((p) => p.id));
    const stayIds = new Set(mockData.stays.map((s) => s.id));
    for (const stay of mockData.stays) {
      expect(roomIds.has(stay.roomId)).toBe(true);
      expect(personIds.has(stay.personId)).toBe(true);
    }
    for (const v of mockData.vehicles) {
      expect(stayIds.has(v.stayId)).toBe(true);
    }
    for (const room of mockData.rooms) {
      expect(room.currentStayId !== null).toBe(room.status === 'occupied');
    }
  });

  it('uses only synthetic identifiers (no real-looking personal data)', () => {
    for (const p of mockData.people) expect(p.fullName).toMatch(/^ผู้พักทดสอบ \d{3}$/);
    for (const s of mockData.stays) expect(s.phone).toMatch(/^000-000-\d{4}$/);
    for (const v of mockData.vehicles) expect(v.plate).toMatch(/^ทดสอบ \d{4}$/);
    for (const u of mockData.users) expect(u.email).toMatch(/@example\.test$/);
  });

  it('never gives a Viewer account healthAccess or canExport', () => {
    for (const u of mockData.users.filter((x) => x.role === 'viewer')) {
      expect(u.healthAccess).toBe(false);
      expect(u.canExport).toBe(false);
    }
  });

  it('computes status counts and occupancy consistently', () => {
    const counts = countRoomsByStatus(mockData.rooms);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(mockData.rooms.length);
    expect(occupancyRate(mockData.rooms)).toBeGreaterThanOrEqual(0);
    expect(occupancyRate(mockData.rooms)).toBeLessThanOrEqual(100);
    expect(occupancyRate([])).toBe(0);
  });

  it('keeps the Phase 1.6 dataset stable after adding co-resident age groups', () => {
    expect(mockData.rooms).toHaveLength(54);
    expect(mockData.stays).toHaveLength(37);
    expect(mockData.vehicles).toHaveLength(38);
    for (const s of mockData.stays) expect(s.memberAgeGroups).toHaveLength(s.memberCount);
  });

  it('tallies with a fixed order (zeros kept) or by count descending', () => {
    expect(tally(['b', 'a', 'b'], (x) => x)).toEqual([
      { key: 'b', label: 'b', count: 2 },
      { key: 'a', label: 'a', count: 1 },
    ]);
    expect(tally(['a'], (x) => x, { order: ['z', 'a'], labels: { z: 'Z' } })).toEqual([
      { key: 'z', label: 'Z', count: 0 },
      { key: 'a', label: 'a', count: 1 },
    ]);
  });

  it('filters room-scoped collections by zone', () => {
    const all = filterByZone(mockData, '');
    expect(all.rooms).toHaveLength(mockData.rooms.length);
    const z1 = filterByZone(mockData, 'z01');
    expect(z1.rooms.every((r) => r.zoneId === 'z01')).toBe(true);
    const z1Rooms = new Set(z1.rooms.map((r) => r.id));
    expect(z1.stays.every((s) => z1Rooms.has(s.roomId))).toBe(true);
    expect(z1.vehicles.every((v) => z1Rooms.has(v.roomId))).toBe(true);
  });

  it('builds a synthetic plan layout with one non-overlapping shape per room', () => {
    const layout = createSiteLayout(mockData);
    expect(layout.rooms).toHaveLength(mockData.rooms.length);
    expect(layout.zones).toHaveLength(mockData.zones.length);
    const boxes = layout.rooms.map((r) => r.bounds);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [[ay1, ax1], [ay2, ax2]] = boxes[i] ?? [
          [0, 0],
          [0, 0],
        ];
        const [[by1, bx1], [by2, bx2]] = boxes[j] ?? [
          [0, 0],
          [0, 0],
        ];
        const overlap = ax1 < bx2 && bx1 < ax2 && ay1 < by2 && by1 < ay2;
        expect(overlap).toBe(false);
      }
    }
  });
});
