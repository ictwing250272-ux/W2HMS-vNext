import { useState } from 'react';

import { canEditGeneral } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { SiteMap } from '../components/SiteMap';
import { PageHeader, ProtoAction, RoomStatusBadge } from '../components/ui';
import { mockData } from '../mocks/data';
import { createLookups, ROOM_STATUS_LABEL, ROOM_STATUSES } from '../mocks/selectors';

const lookups = createLookups(mockData);

export function BuildingsPage() {
  const { session } = useMockSession();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'grid'>('map');
  const selected = selectedRoomId === null ? undefined : lookups.roomById.get(selectedRoomId);
  const stay = selected?.currentStayId ? lookups.stayById.get(selected.currentStayId) : undefined;
  const person = stay ? lookups.personById.get(stay.personId) : undefined;
  const roomVehicles = selected ? mockData.vehicles.filter((v) => v.roomId === selected.id) : [];
  const roomTickets = selected
    ? mockData.tickets.filter(
        (t) => t.roomId === selected.id && (t.status === 'open' || t.status === 'inProgress'),
      )
    : [];

  return (
    <section>
      <PageHeader
        title="แผนผังอาคารและห้องพัก"
        description="แผนที่ต้นแบบ · พิกัดสมมติ ไม่มีแผนที่พื้นหลังหรือภาพดาวเทียม"
      />

      <div className="view-toggle" role="group" aria-label="รูปแบบการแสดงผล">
        <button
          type="button"
          className={view === 'map' ? 'tab active' : 'tab'}
          aria-pressed={view === 'map'}
          onClick={() => {
            setView('map');
          }}
        >
          แผนที่
        </button>
        <button
          type="button"
          className={view === 'grid' ? 'tab active' : 'tab'}
          aria-pressed={view === 'grid'}
          onClick={() => {
            setView('grid');
          }}
        >
          ผังห้อง
        </button>
      </div>

      <div className="legend" aria-label="คำอธิบายสี">
        {ROOM_STATUSES.map((s) => (
          <RoomStatusBadge key={s} status={s} />
        ))}
      </div>

      <div className="plan-layout">
        {view === 'map' ? (
          <SiteMap
            data={mockData}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
        ) : (
          <div className="plan">
            {mockData.zones.map((zone) => (
              <div key={zone.id} className="card zone">
                <h2>{zone.name}</h2>
                {mockData.buildings
                  .filter((b) => b.zoneId === zone.id)
                  .map((building) => (
                    <div key={building.id} className="building">
                      <h3>{building.name}</h3>
                      <div className="room-grid">
                        {mockData.rooms
                          .filter((r) => r.buildingId === building.id)
                          .map((room) => (
                            <button
                              key={room.id}
                              type="button"
                              className={`room-cell status-${room.status}${room.id === selectedRoomId ? ' selected' : ''}`}
                              aria-label={`ห้อง ${room.code} ${ROOM_STATUS_LABEL[room.status]}`}
                              aria-pressed={room.id === selectedRoomId}
                              onClick={() => {
                                setSelectedRoomId(room.id);
                              }}
                            >
                              {String(room.roomNo).padStart(2, '0')}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        <aside className="card detail" aria-live="polite">
          {selected === undefined ? (
            <p className="muted">เลือกห้องเพื่อดูรายละเอียด</p>
          ) : (
            <>
              <h2>ห้อง {selected.code}</h2>
              <dl className="meta">
                <dt>สถานะ</dt>
                <dd>
                  <RoomStatusBadge status={selected.status} />
                </dd>
                <dt>ประเภท</dt>
                <dd>{selected.type}</dd>
                <dt>ผู้พัก</dt>
                <dd>{person ? `${person.rank} ${person.fullName}` : '-'}</dd>
                <dt>เข้าพัก</dt>
                <dd>{stay?.checkIn ?? '-'}</dd>
                <dt>ผู้อาศัยร่วม</dt>
                <dd>{stay ? `${String(stay.memberCount)} คน` : '-'}</dd>
                <dt>ยานพาหนะ</dt>
                <dd>
                  {roomVehicles.length > 0 ? roomVehicles.map((v) => v.plate).join(', ') : '-'}
                </dd>
                <dt>งานซ่อมค้าง</dt>
                <dd>{roomTickets.length}</dd>
              </dl>
              {canEditGeneral(session) && (
                <div className="page-actions">
                  <ProtoAction>แก้ไขห้อง</ProtoAction>
                  <ProtoAction>{stay ? 'ย้ายออก' : 'บันทึกเข้าพัก'}</ProtoAction>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
