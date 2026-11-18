import { useState } from 'react';

import { can } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { EmptyRow, PageHeader, ProtoAction, SearchInput, StatCard } from '../components/ui';
import { mockData } from '../mocks/data';
import { createLookups, matches } from '../mocks/selectors';

const lookups = createLookups(mockData);
const TYPE_LABEL = { car: 'รถยนต์', motorcycle: 'รถจักรยานยนต์' } as const;

export function VehiclesPage() {
  const { session } = useMockSession();
  const [query, setQuery] = useState('');
  const rows = mockData.vehicles.filter((v) => {
    const person = lookups.personById.get(v.personId);
    return matches(query, v.plate, person?.fullName, lookups.roomById.get(v.roomId)?.code);
  });
  const cars = mockData.vehicles.filter((v) => v.type === 'car').length;

  return (
    <section>
      <PageHeader
        title="ข้อมูลยานพาหนะ"
        actions={
          <>
            {can(session, 'vehicles', 'create') && <ProtoAction>เพิ่มยานพาหนะ</ProtoAction>}
            {can(session, 'vehicles', 'export') && <ProtoAction>ส่งออก</ProtoAction>}
          </>
        }
      />

      <div className="stat-grid">
        <StatCard label="ทั้งหมด" value={mockData.vehicles.length} />
        <StatCard label="รถยนต์" value={cars} />
        <StatCard label="รถจักรยานยนต์" value={mockData.vehicles.length - cars} />
      </div>

      <div className="filters">
        <SearchInput
          label="ค้นหายานพาหนะ"
          value={query}
          onChange={setQuery}
          placeholder="ค้นหาทะเบียน ชื่อเจ้าของ หรือรหัสห้อง"
        />
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ทะเบียน</th>
              <th>จังหวัด</th>
              <th>ประเภท</th>
              <th>เจ้าของ</th>
              <th>ห้อง</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={5} />}
            {rows.map((v) => {
              const person = lookups.personById.get(v.personId);
              return (
                <tr key={v.id}>
                  <td>{v.plate}</td>
                  <td>{v.province}</td>
                  <td>{TYPE_LABEL[v.type]}</td>
                  <td>{person ? `${person.rank} ${person.fullName}` : '-'}</td>
                  <td>{lookups.roomById.get(v.roomId)?.code}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
