/**
 * Prototype site map (Leaflet, offline).
 *
 * - CRS.Simple: a flat plane in abstract plan units — no latitude/longitude, no projection.
 * - No tile layer, no tile provider, no external requests: the background is plain CSS.
 * - No markers (Leaflet's default marker icons are image files) — rectangles only.
 * - Geometry comes from the synthetic layout in src/mocks/layout.ts.
 * - Leaflet positions elements through the CSSOM at runtime, which the production CSP
 *   (`style-src 'self'`) allows; its stylesheet is bundled from node_modules.
 */
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

import { createSiteLayout } from '../mocks/layout';
import { ROOM_STATUS_LABEL } from '../mocks/selectors';
import type { MockDataset } from '../mocks/types';

export function SiteMap({
  data,
  selectedRoomId,
  onSelectRoom,
}: {
  data: MockDataset;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomLayersRef = useRef(new Map<string, L.Rectangle>());
  const onSelectRef = useRef(onSelectRoom);

  useEffect(() => {
    onSelectRef.current = onSelectRoom;
  }, [onSelectRoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const layout = createSiteLayout(data);
    const roomById = new Map(data.rooms.map((r) => [r.id, r]));
    const map = L.map(container, {
      crs: L.CRS.Simple,
      attributionControl: false,
      zoomSnap: 0.25,
      minZoom: -2,
      maxZoom: 4,
      maxBounds: L.latLngBounds(layout.extent).pad(0.5),
    });

    for (const zone of layout.zones) {
      L.rectangle(zone.bounds, { className: 'map-zone', interactive: false }).addTo(map);
      // Label pinned to the zone's top edge (a bound tooltip would sit at the shape's centre).
      const [[, left], [top, right]] = zone.bounds;
      L.tooltip({ permanent: true, direction: 'top', className: 'map-zone-label', offset: [0, -4] })
        .setLatLng([top, (left + right) / 2])
        // Short form on the map ("เขต 1"); the full name stays in the summary panel.
        .setContent(zone.label.replace(/\s*\(.*\)$/, ''))
        .addTo(map);
    }
    for (const building of layout.buildings) {
      L.rectangle(building.bounds, { className: 'map-building', interactive: false }).addTo(map);
    }

    const roomLayers = roomLayersRef.current;
    roomLayers.clear();
    for (const shape of layout.rooms) {
      const room = roomById.get(shape.roomId);
      if (room === undefined) continue;
      const rect = L.rectangle(shape.bounds, {
        className: `map-room map-st-${room.status}`,
        weight: 1,
      })
        // Room hover label opens below the room so it never covers the zone labels (top edge).
        .bindTooltip(`ห้อง ${room.code} · ${ROOM_STATUS_LABEL[room.status]}`, {
          direction: 'bottom',
          offset: [0, 4],
        })
        .on('click', () => {
          // The detail panel shows the selection; close the label so it does not stay
          // open after a tap on touch screens.
          rect.closeTooltip();
          onSelectRef.current(room.id);
        })
        .addTo(map);
      roomLayers.set(room.id, rect);
    }

    // jsdom (tests) has no layout, so guard fitBounds against a zero-size container.
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      map.fitBounds(L.latLngBounds(layout.extent), { padding: [12, 12] });
    } else {
      map.setView([0, 0], 0);
    }

    const resize = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resize.observe(container);

    return () => {
      resize.disconnect();
      roomLayers.clear();
      map.remove();
    };
  }, [data]);

  useEffect(() => {
    for (const [roomId, rect] of roomLayersRef.current) {
      const el = rect.getElement();
      el?.classList.toggle('map-selected', roomId === selectedRoomId);
      if (roomId === selectedRoomId) rect.bringToFront();
    }
  }, [selectedRoomId]);

  return (
    <div
      ref={containerRef}
      className="site-map"
      role="region"
      aria-label="แผนที่ผังอาคาร (พิกัดสมมติ)"
      data-testid="site-map"
    />
  );
}
