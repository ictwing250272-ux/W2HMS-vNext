/**
 * SYNTHETIC site layout for the prototype map.
 *
 * Geometry is in metres on a local plane (x = east, y = north) and is generated from the mock
 * dataset's structure only. It does not correspond to any real building or to the legacy
 * system's geometry. The map places it at a configurable origin (see config/mapConfig.ts).
 */
import type { BuildingKind, MockDataset } from './types';

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ZoneShape {
  id: string;
  label: string;
  box: Box;
}

export interface BuildingShape {
  id: string;
  label: string;
  zoneId: string;
  kind: BuildingKind;
  box: Box;
}

/** One cell per room. Rooms on different floors share the building footprint. */
export interface RoomShape {
  roomId: string;
  buildingId: string;
  floor: number;
  box: Box;
}

export interface SiteLayout {
  zones: ZoneShape[];
  buildings: BuildingShape[];
  rooms: RoomShape[];
  extent: Box;
}

const ROOM_W = 6;
const ROOM_D = 9;
const BLOCK_PAD = 1;
const BLOCK_GAP = 26;
const OFFICE_W = 34;
const OFFICE_D = 16;
const ZONE_PAD = 12;
const ZONE_GAP = 28;
const ZONE_MIN_W = 70;

export function createSiteLayout(data: MockDataset): SiteLayout {
  const zones: ZoneShape[] = [];
  const buildings: BuildingShape[] = [];
  const rooms: RoomShape[] = [];
  let x0 = 0;
  let minY = 0;

  for (const zone of data.zones) {
    const zoneBuildings = data.buildings.filter((b) => b.zoneId === zone.id);
    // Offices first (top of the zone), then housing blocks.
    zoneBuildings.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'office' ? -1 : 1));
    const widths = zoneBuildings.map((b) =>
      b.kind === 'office'
        ? OFFICE_W
        : Math.ceil(b.roomCount / b.floors) * ROOM_W + BLOCK_PAD * 2,
    );
    const zoneW = Math.max(ZONE_MIN_W, ...widths.map((w) => w + ZONE_PAD * 2));
    let y = -ZONE_PAD - 4;

    zoneBuildings.forEach((building, i) => {
      const w = widths[i] ?? OFFICE_W;
      const d = building.kind === 'office' ? OFFICE_D : ROOM_D + BLOCK_PAD * 2;
      const left = x0 + (zoneW - w) / 2;
      const box: Box = { x1: left, y1: y - d, x2: left + w, y2: y };
      buildings.push({
        id: building.id,
        label: building.name,
        zoneId: zone.id,
        kind: building.kind,
        box,
      });

      if (building.kind === 'housing') {
        const perFloor = Math.ceil(building.roomCount / building.floors);
        for (const room of data.rooms.filter((r) => r.buildingId === building.id)) {
          const col = (room.roomNo - 1) % perFloor;
          const cx = left + BLOCK_PAD + col * ROOM_W;
          rooms.push({
            roomId: room.id,
            buildingId: building.id,
            floor: room.floor,
            box: { x1: cx, y1: y - BLOCK_PAD - ROOM_D, x2: cx + ROOM_W, y2: y - BLOCK_PAD },
          });
        }
      }
      y -= d + BLOCK_GAP;
    });

    const zoneBottom = y + BLOCK_GAP - ZONE_PAD;
    zones.push({ id: zone.id, label: zone.name, box: { x1: x0, y1: zoneBottom, x2: x0 + zoneW, y2: 0 } });
    minY = Math.min(minY, zoneBottom);
    x0 += zoneW + ZONE_GAP;
  }

  return {
    zones,
    buildings,
    rooms,
    extent: { x1: -10, y1: minY - 10, x2: x0 - ZONE_GAP + 10, y2: 14 },
  };
}

/** Metres → degrees around an origin (equirectangular; fine for a few hundred metres). */
export function toLatLng(origin: { lat: number; lng: number }, x: number, y: number): [number, number] {
  const metresPerDegLat = 111_320;
  const metresPerDegLng = metresPerDegLat * Math.cos((origin.lat * Math.PI) / 180);
  return [origin.lat + y / metresPerDegLat, origin.lng + x / metresPerDegLng];
}
