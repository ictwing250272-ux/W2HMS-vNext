import { describe, expect, it } from 'vitest';

import { createMockDataset, mockData } from './data';
import { countRoomsByStatus, occupancyRate } from './selectors';

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
});
