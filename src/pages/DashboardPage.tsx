import { canSeeHealthAggregates } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { PageHeader, RoomStatusBadge, StatCard } from '../components/ui';
import { mockData } from '../mocks/data';
import { countRoomsByStatus, occupancyRate, ROOM_STATUSES } from '../mocks/selectors';

export function DashboardPage() {
  const { session } = useMockSession();
  const { rooms, zones, tickets, vehicles, healthAggregates } = mockData;
  const counts = countRoomsByStatus(rooms);
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'inProgress');

  return (
    <section>
      <PageHeader title="Dashboard" description="ภาพรวมบ้านพัก (ข้อมูลจำลอง)" />

      <div className="stat-grid">
        <StatCard label="ห้องทั้งหมด" value={rooms.length} />
        <StatCard label="มีผู้พัก" value={counts.occupied} />
        <StatCard label="ว่าง" value={counts.vacant} />
        <StatCard
          label="อัตราการเข้าพัก"
          value={`${String(occupancyRate(rooms))}%`}
          hint="ไม่นับห้องที่ปิดใช้งาน"
        />
        <StatCard label="งานซ่อมค้าง" value={openTickets.length} />
        <StatCard label="ยานพาหนะ" value={vehicles.length} />
      </div>

      <div className="card">
        <h2>สถานะห้องตามเขต</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เขต</th>
                {ROOM_STATUSES.map((s) => (
                  <th key={s}>
                    <RoomStatusBadge status={s} />
                  </th>
                ))}
                <th>รวม</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const zoneRooms = rooms.filter((r) => r.zoneId === zone.id);
                const zc = countRoomsByStatus(zoneRooms);
                return (
                  <tr key={zone.id}>
                    <td>{zone.name}</td>
                    {ROOM_STATUSES.map((s) => (
                      <td key={s} className="num">
                        {zc[s]}
                      </td>
                    ))}
                    <td className="num">{zoneRooms.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {canSeeHealthAggregates(session) && (
        <div className="card" data-testid="health-aggregate">
          <h2>สรุปข้อมูลสุขภาพ (ตัวเลขรวมเท่านั้น)</h2>
          <p className="muted small">
            แสดงเฉพาะผู้มี healthAccess · ไม่มีรายชื่อหรือรายละเอียดรายบุคคล (H-5) · รายการรหัสโรคยังไม่อนุมัติ
            (TBD)
          </p>
          <ul className="agg-list">
            {healthAggregates.map((h) => (
              <li key={h.label}>
                <span>{h.label}</span>
                <strong>{h.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
