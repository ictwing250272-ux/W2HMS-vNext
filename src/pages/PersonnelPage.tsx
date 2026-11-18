import { useState } from 'react';

import { can } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { EmptyRow, PageHeader, ProtoAction, SearchInput } from '../components/ui';
import { mockData } from '../mocks/data';
import { createLookups, matches } from '../mocks/selectors';

const lookups = createLookups(mockData);

export function PersonnelPage() {
  const { session } = useMockSession();
  const [query, setQuery] = useState('');

  const rows = mockData.stays
    .filter((s) => s.status === 'active')
    .map((stay) => ({
      stay,
      person: lookups.personById.get(stay.personId),
      room: lookups.roomById.get(stay.roomId),
    }))
    .filter(({ person, room }) =>
      matches(query, person?.fullName, person?.rank, person?.unitName, room?.code),
    );

  return (
    <section>
      <PageHeader
        title="ข้อมูลกำลังพล"
        description={`ผู้พักปัจจุบัน ${String(rows.length)} คน`}
        actions={
          <>
            {can(session, 'personnel', 'create') && <ProtoAction>เพิ่มกำลังพล</ProtoAction>}
            {can(session, 'personnel', 'export') && <ProtoAction>ส่งออก</ProtoAction>}
          </>
        }
      />

      <div className="filters">
        <SearchInput
          label="ค้นหากำลังพล"
          value={query}
          onChange={setQuery}
          placeholder="ค้นหาชื่อ ยศ หน่วย หรือรหัสห้อง"
        />
      </div>

      <p className="muted small">
        เบอร์โทรและจำนวนผู้อาศัยร่วมเป็นข้อมูลส่วนบุคคล · ทุกค่าในหน้านี้เป็นข้อมูลจำลอง · ไม่มีข้อมูลสุขภาพในหน้านี้
      </p>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ยศ</th>
              <th>ชื่อ-สกุล</th>
              <th>หน่วย</th>
              <th>ห้อง</th>
              <th>เข้าพัก</th>
              <th>โทรศัพท์</th>
              <th>ผู้อาศัยร่วม</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={7} />}
            {rows.map(({ stay, person, room }) => (
              <tr key={stay.id}>
                <td>{person?.rank}</td>
                <td>{person?.fullName}</td>
                <td>{person?.unitName}</td>
                <td>{room?.code}</td>
                <td>{stay.checkIn}</td>
                <td>{stay.phone}</td>
                <td className="num">{stay.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
