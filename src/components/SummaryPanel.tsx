/**
 * Right-hand summary panel (all pages). Aggregates only; never shows health data.
 */
import { mockData } from '../mocks/data';
import {
  countRoomsByStatus,
  isOpenTicket,
  occupancyRate,
  ROOM_STATUS_LABEL,
  ROOM_STATUSES,
} from '../mocks/selectors';
import { Meter } from './charts';

export function SummaryPanel() {
  const { rooms, buildings, zones, stays, vehicles, tickets } = mockData;
  const counts = countRoomsByStatus(rooms);
  const activeStays = stays.filter((s) => s.status === 'active');
  const members = activeStays.reduce((sum, s) => sum + s.memberCount, 0);
  const cars = vehicles.filter((v) => v.type === 'car').length;
  const openTickets = tickets.filter(isOpenTicket).length;

  return (
    <aside className="summary" aria-label="สรุปข้อมูล" data-testid="summary-panel">
      <h2>ภาพรวมบ้านพัก</h2>
      <p className="muted small">
        {buildings.length} อาคาร · {rooms.length} ห้อง · ข้อมูลจำลอง
      </p>

      <div className="summary-hero">
        <strong>{counts.occupied}</strong>
        <span className="muted"> / {rooms.length} ห้องมีผู้พัก</span>
      </div>
      <Meter value={counts.occupied} max={rooms.length} label="สัดส่วนห้องที่มีผู้พัก" />

      <ul className="summary-status">
        {ROOM_STATUSES.map((s) => (
          <li key={s}>
            <span className={`dot status-${s}`} aria-hidden="true" />
            <span>{ROOM_STATUS_LABEL[s]}</span>
            <strong>{counts[s]}</strong>
          </li>
        ))}
      </ul>

      <h3>ผู้อยู่อาศัยและยานพาหนะ</h3>
      <dl className="summary-kv">
        <dt>ผู้พักหลัก</dt>
        <dd>{activeStays.length}</dd>
        <dt>ผู้อาศัยร่วม</dt>
        <dd>{members}</dd>
        <dt>รถยนต์</dt>
        <dd>{cars}</dd>
        <dt>รถจักรยานยนต์</dt>
        <dd>{vehicles.length - cars}</dd>
        <dt>งานซ่อมค้าง</dt>
        <dd>{openTickets}</dd>
      </dl>

      <h3>แยกตามเขต</h3>
      <ul className="summary-zones">
        {zones.map((zone) => {
          const zoneRooms = rooms.filter((r) => r.zoneId === zone.id);
          const zc = countRoomsByStatus(zoneRooms);
          return (
            <li key={zone.id}>
              <div className="summary-zone-head">
                <strong>{zone.name}</strong>
                <span className="muted small">{zoneRooms.length} ห้อง</span>
              </div>
              <Meter
                value={zc.occupied}
                max={zoneRooms.length}
                label={`สัดส่วนห้องที่มีผู้พัก ${zone.name}`}
              />
              <div className="muted small">
                ว่าง {zc.vacant} · พัก {zc.occupied} · ซ่อม {zc.repair} · ปิด {zc.closed} · เข้าพัก{' '}
                {occupancyRate(zoneRooms)}%
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
