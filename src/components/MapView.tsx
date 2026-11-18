/**
 * Site overview map: Leaflet + Google Map Tiles API (satellite / roadmap), offline fallback.
 *
 * - Building positions are SYNTHETIC (mocks/layout.ts) placed at a configurable origin.
 * - Tiles come only from https://tile.googleapis.com when a key is configured; on any failure
 *   the map stays usable on the plain offline background (Leaflet only).
 * - One marker per building, styled by type (office / housing). Clicking a marker opens a popup
 *   with the building's name and basic, aggregate details — never personal or health data.
 * - Marker icons and popups are built with DOM nodes + textContent (no HTML strings).
 * - Floor plans and room cells are out of scope for this round.
 */
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import type { LatLng } from '../config/mapConfig';
import {
  fetchAttribution,
  getTileSession,
  tileUrlTemplate,
  type BaseMap,
  type TileSession,
} from '../lib/mapTiles';
import { toLatLng, type Box, type SiteLayout } from '../mocks/layout';
import type { BuildingKind } from '../mocks/types';

export type MapBackground = BaseMap | 'offline';
export type TilesState = 'offline' | 'loading' | 'ready' | 'failed';

/** Basic, aggregate building details shown in the marker popup. No personal data. */
export interface BuildingInfo {
  title: string;
  lines: string[];
}

export interface MapViewProps {
  layout: SiteLayout;
  origin: LatLng;
  tilesKey: string | null;
  background: MapBackground;
  /** Building ids to draw (zone / type filters). */
  visibleBuildingIds: ReadonlySet<string>;
  buildingInfo: ReadonlyMap<string, BuildingInfo>;
  selectedBuildingId: string | null;
  /** Bumped by the parent to re-fit the whole site ("ภาพรวม"). */
  overviewToken: number;
  onSelectBuilding: (buildingId: string) => void;
  onTilesState: (state: TilesState) => void;
}

export const KIND_LABEL: Record<BuildingKind, string> = {
  office: 'อาคารสำนักงาน',
  housing: 'อาคารบ้านพัก',
};

const boundsOf = (origin: LatLng, box: Box) =>
  L.latLngBounds(toLatLng(origin, box.x1, box.y1), toLatLng(origin, box.x2, box.y2));

/** Label element built with textContent (no HTML strings). */
function labelIcon(text: string, className: string): L.DivIcon {
  const el = document.createElement('span');
  el.textContent = text;
  // Size and centring come from CSS (see .map-label in global.css).
  return L.divIcon({ html: el, className: `map-label ${className}` });
}

/** Pin marker per building type; the glyph is decorative, the type is in the title. */
function markerIcon(kind: BuildingKind, selected: boolean): L.DivIcon {
  const el = document.createElement('span');
  el.className = 'map-pin-body';
  el.dataset.glyph = kind === 'office' ? 'สนง' : 'บพ';
  return L.divIcon({
    html: el,
    className: `map-pin map-pin-${kind}${selected ? ' map-pin-selected' : ''}`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

function popupContent(info: BuildingInfo): HTMLElement {
  const root = document.createElement('div');
  root.className = 'map-popup';
  const title = document.createElement('strong');
  title.textContent = info.title;
  root.appendChild(title);
  for (const line of info.lines) {
    const row = document.createElement('div');
    row.textContent = line;
    root.appendChild(row);
  }
  return root;
}

export function MapView(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const propsRef = useRef(props);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    propsRef.current = props;
  });

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const map = L.map(container, {
      zoomSnap: 0.5,
      minZoom: 15,
      maxZoom: 21,
      attributionControl: true,
      zoomControl: true,
    });
    map.attributionControl.setPrefix('Leaflet');
    const overlay = L.layerGroup().addTo(map);
    mapRef.current = map;
    overlayRef.current = overlay;

    const { layout, origin } = propsRef.current;
    const extent = boundsOf(origin, layout.extent);
    map.setMaxBounds(extent.pad(1.5));
    // jsdom (tests) has no layout, so guard fitBounds against a zero-size container.
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      map.fitBounds(extent, { padding: [16, 16] });
    } else {
      map.setView(extent.getCenter(), 17);
    }
    setZoom(map.getZoom());
    const onZoom = () => {
      setZoom(map.getZoom());
    };
    map.on('zoomend', onZoom);

    const resize = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resize.observe(container);
    return () => {
      resize.disconnect();
      map.off('zoomend', onZoom);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Base layer: Google Map Tiles (satellite / roadmap) or offline.
  const { tilesKey, background } = props;
  useEffect(() => {
    const map = mapRef.current;
    if (map === null) return;
    const report = (s: TilesState) => {
      propsRef.current.onTilesState(s);
    };
    if (tilesKey === null || background === 'offline') {
      report('offline');
      return;
    }
    let cancelled = false;
    let layer: L.TileLayer | null = null;
    let session: TileSession | null = null;
    let attribution = 'Google';

    const updateAttribution = () => {
      if (session === null) return;
      const b = map.getBounds();
      void fetchAttribution(tilesKey, session, map.getZoom(), {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      })
        .then((text) => {
          if (cancelled || layer === null) return;
          map.attributionControl.removeAttribution(attribution);
          attribution = text;
          map.attributionControl.addAttribution(attribution);
        })
        .catch(() => undefined);
    };

    report('loading');
    void getTileSession(tilesKey, background)
      .then((s) => {
        if (cancelled) return;
        session = s;
        layer = L.tileLayer(tileUrlTemplate(tilesKey, s), {
          tileSize: s.tileWidth,
          maxZoom: 21,
          maxNativeZoom: 20,
          attribution,
        });
        let failures = 0;
        layer.on('tileerror', () => {
          failures += 1;
          if (failures === 6 && layer !== null) {
            map.removeLayer(layer);
            report('failed');
          }
        });
        layer.addTo(map);
        map.getContainer().classList.add('has-tiles');
        map.on('moveend', updateAttribution);
        updateAttribution();
        report('ready');
      })
      .catch(() => {
        if (!cancelled) report('failed');
      });

    return () => {
      cancelled = true;
      map.off('moveend', updateAttribution);
      map.getContainer().classList.remove('has-tiles');
      if (layer !== null) map.removeLayer(layer);
    };
  }, [tilesKey, background]);

  // Overlays: zones, building footprints, one marker per building.
  const { layout, origin, visibleBuildingIds, buildingInfo, selectedBuildingId } = props;
  useEffect(() => {
    const overlay = overlayRef.current;
    if (overlay === null) return;
    overlay.clearLayers();
    const showLabels = zoom >= 18;

    for (const zone of layout.zones) {
      const b = boundsOf(origin, zone.box);
      L.rectangle(b, { className: 'map-zone', interactive: false }).addTo(overlay);
      L.marker(b.getNorthWest(), {
        icon: labelIcon(zone.label.replace(/\s*\(.*\)$/, ''), 'map-zone-tag'),
        interactive: false,
        keyboard: false,
      }).addTo(overlay);
    }

    for (const building of layout.buildings) {
      if (!visibleBuildingIds.has(building.id)) continue;
      const b = boundsOf(origin, building.box);
      const selected = building.id === selectedBuildingId;
      L.rectangle(b, {
        className: `map-building map-kind-${building.kind}${selected ? ' map-selected' : ''}`,
        interactive: false,
      }).addTo(overlay);

      const info = buildingInfo.get(building.id) ?? { title: building.label, lines: [] };
      const marker = L.marker(b.getCenter(), {
        icon: markerIcon(building.kind, selected),
        title: `${building.label} (${KIND_LABEL[building.kind]})`,
        alt: building.label,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0,
      })
        .bindPopup(popupContent(info), { closeButton: true, autoPan: true, maxWidth: 260 })
        .on('click', () => {
          propsRef.current.onSelectBuilding(building.id);
        })
        .addTo(overlay);
      if (selected) marker.openPopup();
      if (showLabels) {
        L.marker(b.getCenter(), {
          icon: labelIcon(building.label, 'map-building-label'),
          interactive: false,
          keyboard: false,
        }).addTo(overlay);
      }
    }
  }, [layout, origin, visibleBuildingIds, buildingInfo, selectedBuildingId, zoom]);

  // Zoom to the selected building.
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || selectedBuildingId === null) return;
    const shape = layout.buildings.find((b) => b.id === selectedBuildingId);
    if (shape === undefined) return;
    if (map.getContainer().clientWidth > 0) {
      map.flyToBounds(boundsOf(origin, shape.box).pad(2), { maxZoom: 19, duration: 0.5 });
    }
  }, [selectedBuildingId, layout, origin]);

  // Back to the whole site.
  const { overviewToken } = props;
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || overviewToken === 0 || map.getContainer().clientWidth === 0) return;
    map.flyToBounds(boundsOf(origin, layout.extent), { padding: [16, 16], duration: 0.5 });
  }, [overviewToken, layout, origin]);

  return (
    <div
      ref={containerRef}
      className="site-map"
      role="region"
      aria-label="แผนที่ภาพรวมอาคาร (พิกัดจำลอง)"
      data-testid="site-map"
    />
  );
}
