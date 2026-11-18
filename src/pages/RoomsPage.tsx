import { useState } from 'react';

import { can } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { EmptyRow, PageHeader, ProtoAction, RoomStatusBadge, SearchInput } from '../components/ui';
import { mockData } from '../mocks/data';
import type { RoomStatus } from '../mocks/types';
import { createLookups, matches, ROOM_STATUS_LABEL, ROOM_STATUSES } from '../mocks/selectors';

const lookups = createLookups(mockData);

export function RoomsPage() {
  const { session } = useMockSession();
  const [query, setQuery] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [status, setStatus] = useState<RoomStatus | ''>('');

  const rows = mockData.rooms.filter((room) => {
    if (zoneId !== '' && room.zoneId !== zoneId) return false;
    if (status !== '' && room.status !== status) return false;
    const stay = room.currentStayId ? lookups.stayById.get(room.currentStayId) : undefined;
    const person = stay ? lookups.personById.get(stay.personId) : undefined;
    return matches(query, room.code, person?.fullName, person?.unitName);
  });

  return (
    <section>
      <PageHeader
        title="ข้อมูลบ้านพัก"
        description={`${String(rows.length)} จาก ${String(mockData.rooms.length)} ห้อง`}
        actions={
          <>
            {can(session, 'housing', 'create') && <ProtoAction>เพิ่มข้อมูล</ProtoAction>}
            {can(session, 'housing', 'export') && <ProtoAction>ส่งออก</ProtoAction>}
          </>
        }
      />

      <div className="filters">
        <SearchInput
          label="ค้นหาห้อง"
          value={query}
          onChange={setQuery}
          placeholder="ค้นหารหัสห้อง ชื่อผู้พัก หรือหน่วย"
        />
        <select
          className="input"
          aria-label="กรองเขต"
          value={zoneId}
          onChange={(e) => {
            setZoneId(e.target.value);
          }}
        >
          <option value="">ทุกเขต</option>
          {mockData.zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="กรองสถานะ"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RoomStatus | '');
          }}
        >
          <option value="">ทุกสถานะ</option>
          {ROOM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ROOM_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>รหัสห้อง</th>
              <th>อาคาร</th>
              <th>เขต</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
              <th>ผู้พัก</th>
              <th>เข้าพัก</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={7} />}
            {rows.map((room) => {
              const stay = room.currentStayId
                ? lookups.stayById.get(room.currentStayId)
                : undefined;
              const person = stay ? lookups.personById.get(stay.personId) : undefined;
              return (
                <tr key={room.id}>
                  <td>{room.code}</td>
                  <td>{lookups.buildingById.get(room.buildingId)?.name}</td>
                  <td>{lookups.zoneById.get(room.zoneId)?.name}</td>
                  <td>{room.type}</td>
                  <td>
                    <RoomStatusBadge status={room.status} />
                  </td>
                  <td>{person ? `${person.rank} ${person.fullName}` : '-'}</td>
                  <td>{stay?.checkIn ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
