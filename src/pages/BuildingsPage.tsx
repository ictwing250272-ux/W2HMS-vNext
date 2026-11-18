/**
 * Site overview map (this round's scope): building search + filters | map | building info.
 * Office and housing buildings are shown as typed markers on SYNTHETIC coordinates.
 * Floor plans, floor selector, room map and room detail are parked for a later round.
 */
import { useMemo, useState } from 'react';

import { can, canSeeHealthAggregates, suppressSmall } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { Meter } from '../components/charts';
import {
  KIND_LABEL,
  MapView,
  type BuildingInfo,
  type MapBackground,
  type TilesState,
} from '../components/MapView';
import { ProtoAction } from '../components/ui';
import { getMapConfig } from '../config/mapConfig';
import { createSiteLayout } from '../mocks/layout';
import { countRoomsByStatus, matches, ROOM_STATUS_LABEL, ROOM_STATUSES } from '../mocks/selectors';
import type { Building, BuildingKind, MockDataset, Room } from '../mocks/types';

type KindFilter = 'all' | BuildingKind;

const TILES_NOTE: Record<TilesState, string> = {
  offline: 'แผนที่ออฟไลน์ (Leaflet · ไม่มีภาพพื้นหลัง)',
  loading: 'กำลังโหลด Google Map Tiles…',
  ready: 'Google Map Tiles',
  failed: 'โหลด Google Map Tiles ไม่สำเร็จ — ใช้แผนที่ออฟไลน์',
};

/** Aggregate, non-personal details for the marker popup and the side panel. */
function describeBuilding(data: MockDataset, b: Building): BuildingInfo {
  const zone = data.zones.find((z) => z.id === b.zoneId);
  const lines = [`${KIND_LABEL[b.kind]} · ${zone?.name ?? '-'}`, `${String(b.floors)} ชั้น`];
  if (b.kind === 'housing') {
    const c = countRoomsByStatus(data.rooms.filter((r) => r.buildingId === b.id));
    lines.push(
      `${String(b.roomCount)} ห้อง · มีผู้พัก ${String(c.occupied)} · ว่าง ${String(c.vacant)}`,
    );
  }
  return { title: b.name, lines };
}

export function BuildingsPage() {
  const { session, data } = useMockSession();
  const mapConfig = getMapConfig();
  const layout = useMemo(() => createSiteLayout(data), [data]);

  const [query, setQuery] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [background, setBackground] = useState<MapBackground>(
    mapConfig.tilesKey === null ? 'offline' : 'satellite',
  );
  const [tilesState, setTilesState] = useState<TilesState>('offline');
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [overviewToken, setOverviewToken] = useState(0);

  const building = data.buildings.find((b) => b.id === buildingId);
  const filtered = useMemo(
    () =>
      data.buildings.filter(
        (b) => (zoneId === '' || b.zoneId === zoneId) && (kind === 'all' || b.kind === kind),
      ),
    [data.buildings, zoneId, kind],
  );
  const visibleBuildingIds = useMemo(() => new Set(filtered.map((b) => b.id)), [filtered]);
  const buildingInfo = useMemo(
    () => new Map(data.buildings.map((b) => [b.id, describeBuilding(data, b)])),
    [data],
  );
  // Search covers building names only (no rooms, people or health data).
  const listed = filtered.filter((b) => matches(query, b.name, KIND_LABEL[b.kind]));
  const scopedRooms = data.rooms.filter((r) => visibleBuildingIds.has(r.buildingId));

  const showOverview = () => {
    setBuildingId(null);
    setOverviewToken((n) => n + 1);
  };

  return (
    <section className="map-page">
      <h1 className="sr-only">แผนที่ภาพรวมอาคาร</h1>

      {/* ---------- Left: search + filters + building list ---------- */}
      <aside className="map-pane map-left" aria-label="ค้นหาและตัวกรอง">
        <input
          type="search"
          className="input full"
          aria-label="ค้นหาอาคาร"
          placeholder="ค้นหาชื่ออาคาร"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
        />

        <div className="filter-row">
          <label className="field">
            <span>เขต</span>
            <select
              className="input"
              value={zoneId}
              onChange={(e) => {
                setZoneId(e.target.value);
              }}
            >
              <option value="">ทุกเขต</option>
              {data.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>ประเภทอาคาร</span>
            <select
              className="input"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as KindFilter);
              }}
            >
              <option value="all">ทั้งหมด</option>
              <option value="housing">อาคารบ้านพัก</option>
              <option value="office">อาคารสำนักงาน</option>
            </select>
          </label>
        </div>

        <div className="map-legend" aria-label="สัญลักษณ์">
          <span className="legend-item">
            <span className="legend-pin map-pin-office" aria-hidden="true" />
            อาคารสำนักงาน
          </span>
          <span className="legend-item">
            <span className="legend-pin map-pin-housing" aria-hidden="true" />
            อาคารบ้านพัก
          </span>
        </div>

        <ul className="building-list" aria-label="รายชื่ออาคาร">
          {listed.length === 0 && <li className="muted small">ไม่พบอาคาร</li>}
          {listed.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className={b.id === buildingId ? 'user-item active' : 'user-item'}
                aria-pressed={b.id === buildingId}
                onClick={() => {
                  setBuildingId(b.id);
                }}
              >
                <span className="user-name">
                  <span className={`legend-pin map-pin-${b.kind}`} aria-hidden="true" /> {b.name}
                </span>
                <span className="muted small">{buildingInfo.get(b.id)?.lines[0]}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- Center: map ---------- */}
      <div className="map-pane map-center">
        <div className="map-toolbar">
          <div className="segmented" role="group" aria-label="ชนิดแผนที่">
            {(['satellite', 'roadmap', 'offline'] as const).map((bg) => {
              const needsKey = bg !== 'offline' && mapConfig.tilesKey === null;
              return (
                <button
                  key={bg}
                  type="button"
                  className={background === bg ? 'seg active' : 'seg'}
                  aria-pressed={background === bg}
                  disabled={needsKey}
                  title={needsKey ? 'ยังไม่ได้ตั้งค่า VITE_GOOGLE_MAPS_API_KEY' : undefined}
                  onClick={() => {
                    setBackground(bg);
                  }}
                >
                  {bg === 'satellite' ? 'Satellite' : bg === 'roadmap' ? 'Roadmap' : 'ออฟไลน์'}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn btn-small" onClick={showOverview}>
            ภาพรวม
          </button>
          {can(session, 'housing', 'export') && <ProtoAction>ส่งออก</ProtoAction>}
          <span className="muted small" data-testid="tiles-state">
            {TILES_NOTE[tilesState]}
            {mapConfig.keyProblem !== null && ` · ${mapConfig.keyProblem}`} · พิกัดจำลอง
          </span>
        </div>

        <MapView
          layout={layout}
          origin={mapConfig.origin}
          tilesKey={mapConfig.tilesKey}
          background={tilesState === 'failed' ? 'offline' : background}
          visibleBuildingIds={visibleBuildingIds}
          buildingInfo={buildingInfo}
          selectedBuildingId={buildingId}
          overviewToken={overviewToken}
          onSelectBuilding={setBuildingId}
          onTilesState={setTilesState}
        />
      </div>

      {/* ---------- Right: overview or building info ---------- */}
      <aside className="map-pane map-right" aria-label="รายละเอียด" aria-live="polite">
        {building !== undefined ? (
          <BuildingSummary
            data={data}
            building={building}
            onClose={() => {
              setBuildingId(null);
            }}
          />
        ) : (
          <SiteOverview data={data} rooms={scopedRooms} buildings={filtered} />
        )}
      </aside>
    </section>
  );
}

function StatusList({ rooms }: { rooms: readonly Room[] }) {
  const counts = countRoomsByStatus(rooms);
  return (
    <ul className="summary-status">
      {ROOM_STATUSES.map((s) => (
        <li key={s}>
          <span className={`dot status-${s}`} aria-hidden="true" />
          <span>{ROOM_STATUS_LABEL[s]}</span>
          <strong>{counts[s]}</strong>
        </li>
      ))}
    </ul>
  );
}

function SiteOverview({
  data,
  rooms,
  buildings,
}: {
  data: MockDataset;
  rooms: readonly Room[];
  buildings: readonly Building[];
}) {
  const { session } = useMockSession();
  const counts = countRoomsByStatus(rooms);
  const housing = buildings.filter((b) => b.kind === 'housing').length;
  const limited = data.personnelHealth.filter((h) => h.careLimitations.length > 0).length;

  return (
    <div className="stack" data-testid="map-overview">
      <div>
        <h2>ภาพรวมพื้นที่</h2>
        <p className="muted small">
          {housing} อาคารบ้านพัก · {buildings.length - housing} อาคารสำนักงาน · {rooms.length} ห้อง
        </p>
      </div>
      <div className="summary-hero">
        <strong>{counts.occupied}</strong>
        <span className="muted"> / {rooms.length} ห้องมีผู้พัก</span>
      </div>
      <Meter value={counts.occupied} max={Math.max(1, rooms.length)} label="สัดส่วนห้องที่มีผู้พัก" />
      <StatusList rooms={rooms} />
      {canSeeHealthAggregates(session) && (
        <dl className="summary-kv">
          <dt>ผู้มีข้อจำกัดการดูแล (รวม)</dt>
          <dd data-testid="overview-health">{suppressSmall(limited)}</dd>
        </dl>
      )}
      <h3>แยกตามเขต</h3>
      <ul className="summary-zones">
        {data.zones.map((z) => {
          const zr = rooms.filter((r) => r.zoneId === z.id);
          const zc = countRoomsByStatus(zr);
          return (
            <li key={z.id}>
              <div className="summary-zone-head">
                <strong>{z.name}</strong>
                <span className="muted small">{zr.length} ห้อง</span>
              </div>
              <Meter
                value={zc.occupied}
                max={Math.max(1, zr.length)}
                label={`ห้องมีผู้พัก ${z.name}`}
              />
              <div className="muted small">
                ว่าง {zc.vacant} · พัก {zc.occupied} · ซ่อม {zc.repair} · ปิด {zc.closed}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted small">กด Marker บนแผนที่หรือรายชื่ออาคารเพื่อดูรายละเอียดอาคาร</p>
    </div>
  );
}

function BuildingSummary({
  data,
  building,
  onClose,
}: {
  data: MockDataset;
  building: Building;
  onClose: () => void;
}) {
  const rooms = data.rooms.filter((r) => r.buildingId === building.id);
  const zone = data.zones.find((z) => z.id === building.zoneId);
  const openTickets = data.tickets.filter(
    (t) => rooms.some((r) => r.id === t.roomId) && (t.status === 'open' || t.status === 'inProgress'),
  ).length;

  return (
    <div className="stack" data-testid="building-summary">
      <div className="detail-head">
        <span className={`legend-pin map-pin-${building.kind}`} aria-hidden="true" />
        <div className="detail-title">
          <h2>{building.name}</h2>
          <div className="muted small">
            {KIND_LABEL[building.kind]} · {zone?.name}
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="ปิดรายละเอียดอาคาร" onClick={onClose}>
          ×
        </button>
      </div>
      <dl className="summary-kv boxed">
        <dt>ประเภท</dt>
        <dd>{KIND_LABEL[building.kind]}</dd>
        <dt>จำนวนชั้น</dt>
        <dd>{building.floors}</dd>
        {building.kind === 'housing' && (
          <>
            <dt>จำนวนห้อง</dt>
            <dd>{rooms.length}</dd>
            <dt>งานซ่อมค้าง</dt>
            <dd>{openTickets}</dd>
          </>
        )}
      </dl>
      {building.kind === 'housing' ? (
        <StatusList rooms={rooms} />
      ) : (
        <p className="muted small">อาคารสำนักงาน · ไม่มีห้องพัก</p>
      )}
      <p className="muted small">ผังชั้นและรายละเอียดห้องจะพัฒนาในรอบถัดไป</p>
    </div>
  );
}
