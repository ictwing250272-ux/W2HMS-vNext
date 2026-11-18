import { describe, expect, it } from 'vitest';

import { createMockDataset, mockData } from './data';
import { createSiteLayout, toLatLng } from './layout';
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

  it('keeps household and health data in their own collections (C3 / H-S2)', () => {
    const activeStayIds = new Set(mockData.stays.filter((s) => s.status === 'active').map((s) => s.id));
    for (const m of mockData.stayMembers) {
      expect(activeStayIds.has(m.stayId)).toBe(true);
      expect(Object.keys(m)).not.toContain('conditionCodes');
    }
    for (const h of mockData.personnelHealth) {
      expect(h.id).toBe(`${h.stayId}_${h.subjectId}`);
      expect(activeStayIds.has(h.stayId)).toBe(true);
    }
    for (const r of mockData.rooms) {
      expect(Object.keys(r)).not.toContain('occupant');
      expect(r.note).not.toMatch(/TBD-|โรค|สุขภาพ/);
    }
  });

  it('places every room on a valid floor of its building', () => {
    for (const r of mockData.rooms) {
      const b = mockData.buildings.find((x) => x.id === r.buildingId);
      expect(b?.kind).toBe('housing');
      expect(r.floor).toBeGreaterThanOrEqual(1);
      expect(r.floor).toBeLessThanOrEqual(b?.floors ?? 0);
    }
    expect(mockData.buildings.some((b) => b.kind === 'office')).toBe(true);
  });

  it('uses only synthetic identifiers (no real-looking personal data)', () => {
    for (const p of mockData.people) expect(p.fullName).toMatch(/^ผู้พักทดสอบ \d{3}$/);
    for (const m of mockData.stayMembers) expect(m.name).toMatch(/^สมาชิกทดสอบ \d{3}-\d+$/);
    for (const s of mockData.stays) expect(s.phone).toMatch(/^000-000-\d{4}$/);
    for (const v of mockData.vehicles) expect(v.plate).toMatch(/^ทดสอบ \d{4}$/);
    for (const u of mockData.users) expect(u.email).toMatch(/@example\.test$/);
  });

  it('never gives a Viewer account healthAccess or any non-view grant', () => {
    for (const u of mockData.users.filter((x) => x.role === 'viewer')) {
      expect(u.healthAccess).toBe(false);
      for (const row of Object.values(u.grants)) {
        expect(row.create || row.update || row.delete || row.export).toBe(false);
      }
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
    expect(mockData.stays.filter((s) => s.status === 'active')).toHaveLength(37);
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

  it('builds a synthetic layout: one cell per room, no overlap on the same floor', () => {
    const layout = createSiteLayout(mockData);
    expect(layout.rooms).toHaveLength(mockData.rooms.length);
    expect(layout.zones).toHaveLength(mockData.zones.length);
    expect(layout.buildings).toHaveLength(mockData.buildings.length);
    const cells = layout.rooms;
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i];
        const b = cells[j];
        if (a === undefined || b === undefined || a.floor !== b.floor) continue;
        const overlap =
          a.box.x1 < b.box.x2 && b.box.x1 < a.box.x2 && a.box.y1 < b.box.y2 && b.box.y1 < a.box.y2;
        expect(overlap).toBe(false);
      }
    }
    for (const b of layout.buildings) {
      for (const other of layout.buildings) {
        if (b === other) continue;
        const o = b.box;
        const p = other.box;
        expect(o.x1 < p.x2 && p.x1 < o.x2 && o.y1 < p.y2 && p.y1 < o.y2).toBe(false);
      }
    }
  });

  it('converts metres to degrees around the origin', () => {
    const [lat, lng] = toLatLng({ lat: 0, lng: 0 }, 111_320, 111_320);
    expect(lat).toBeCloseTo(1, 6);
    expect(lng).toBeCloseTo(1, 6);
  });
});
