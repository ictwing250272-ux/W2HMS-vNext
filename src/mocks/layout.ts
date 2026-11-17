/**
 * SYNTHETIC site layout for the prototype map.
 *
 * Coordinates are abstract plan units in Leaflet's CRS.Simple (a flat x/y plane), not
 * latitude/longitude. They are generated from the mock dataset's structure only and do not
 * correspond to any real location or to the legacy system's geometry.
 */
import type { MockDataset } from './types';

/** [[y1, x1], [y2, x2]] in plan units (CRS.Simple: y is "up"). */
export type PlanBounds = [[number, number], [number, number]];

export interface RoomShape {
  roomId: string;
  bounds: PlanBounds;
}

export interface LabelledShape {
  id: string;
  label: string;
  bounds: PlanBounds;
}

export interface SiteLayout {
  zones: LabelledShape[];
  buildings: LabelledShape[];
  rooms: RoomShape[];
  extent: PlanBounds;
}

const ROOMS_PER_ROW = 4;
const ROOM_W = 10;
const ROOM_H = 7;
const GAP = 2;
const BUILDING_GAP = 8;
const ZONE_PAD = 6;
const ZONE_GAP = 16;
const ZONE_WIDTH = ROOMS_PER_ROW * (ROOM_W + GAP) - GAP + ZONE_PAD * 2;

export function createSiteLayout(data: MockDataset): SiteLayout {
  const zones: LabelledShape[] = [];
  const buildings: LabelledShape[] = [];
  const rooms: RoomShape[] = [];
  let maxDepth = 0;

  data.zones.forEach((zone, zoneIndex) => {
    const x0 = zoneIndex * (ZONE_WIDTH + ZONE_GAP);
    // Lay buildings out downward from y = 0 (negative y), top to bottom.
    let y = -ZONE_PAD - 6;
    for (const building of data.buildings.filter((b) => b.zoneId === zone.id)) {
      const buildingRooms = data.rooms.filter((r) => r.buildingId === building.id);
      const rows = Math.ceil(buildingRooms.length / ROOMS_PER_ROW);
      const top = y;
      buildingRooms.forEach((room, i) => {
        const col = i % ROOMS_PER_ROW;
        const row = Math.floor(i / ROOMS_PER_ROW);
        const left = x0 + ZONE_PAD + col * (ROOM_W + GAP);
        const roomTop = top - row * (ROOM_H + GAP);
        rooms.push({
          roomId: room.id,
          bounds: [
            [roomTop - ROOM_H, left],
            [roomTop, left + ROOM_W],
          ],
        });
      });
      const bottom = top - rows * (ROOM_H + GAP) + GAP;
      buildings.push({
        id: building.id,
        label: building.name,
        bounds: [
          [bottom - 1, x0 + ZONE_PAD - 1],
          [top + 1, x0 + ZONE_WIDTH - ZONE_PAD + 1],
        ],
      });
      y = bottom - BUILDING_GAP;
    }
    const depth = -y;
    maxDepth = Math.max(maxDepth, depth);
    zones.push({
      id: zone.id,
      label: zone.name,
      bounds: [
        [y + BUILDING_GAP - ZONE_PAD, x0],
        [0, x0 + ZONE_WIDTH],
      ],
    });
  });

  const width = data.zones.length * (ZONE_WIDTH + ZONE_GAP) - ZONE_GAP;
  return {
    zones,
    buildings,
    rooms,
    extent: [
      [-maxDepth - 4, -8],
      [12, width + 8],
    ],
  };
}
