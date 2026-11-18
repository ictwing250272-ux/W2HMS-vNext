import { Fragment, useState } from 'react';

import { canSeeHealthAggregates, suppressSmall } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { BarList, StackedBars, type StackSeries } from '../components/charts';
import { PageHeader, StatCard } from '../components/ui';
import { mockData } from '../mocks/data';
import {
  AGE_GROUP_LABEL,
  AGE_GROUPS,
  countRoomsByStatus,
  createLookups,
  filterByZone,
  isOpenTicket,
  occupancyRate,
  ROOM_STATUS_LABEL,
  ROOM_STATUSES,
  tally,
} from '../mocks/selectors';

const lookups = createLookups(mockData);

type TabId = 'housing' | 'personnel' | 'vehicles' | 'health';

const TABS: { id: TabId; label: string }[] = [
  { id: 'housing', label: 'บ้านพัก' },
  { id: 'personnel', label: 'กำลังพล' },
  { id: 'vehicles', label: 'ยานพาหนะ' },
  { id: 'health', label: 'สุขภาพ (ตัวเลขรวม)' },
];

const STATUS_SERIES: StackSeries[] = ROOM_STATUSES.map((s) => ({
  key: s,
  label: ROOM_STATUS_LABEL[s],
  className: `status-${s}`,
}));

const RESIDENT_SERIES: StackSeries[] = [
  { key: 'occupants', label: 'ผู้พักหลัก', className: 'tone-primary' },
  { key: 'members', label: 'ผู้อาศัยร่วม', className: 'tone-secondary' },
];

const VEHICLE_SERIES: StackSeries[] = [
  { key: 'car', label: 'รถยนต์', className: 'tone-primary' },
  { key: 'motorcycle', label: 'รถจักรยานยนต์', className: 'tone-secondary' },
];

export function DashboardPage() {
  const { session } = useMockSession();
  const showHealth = canSeeHealthAggregates(session);
  const [tab, setTab] = useState<TabId>('housing');
  const [zoneId, setZoneId] = useState('');
  // A tab the session may not see is never rendered, even if it was selected earlier.
  const activeTab: TabId = tab === 'health' && !showHealth ? 'housing' : tab;
  const visibleTabs = TABS.filter((t) => t.id !== 'health' || showHealth);

  return (
    <section>
      <PageHeader title="Dashboard" description="ภาพรวมจากข้อมูลจำลอง" />

      <div className="dash-toolbar">
        <div className="tabs" role="tablist" aria-label="มุมมอง Dashboard">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={activeTab === t.id}
              aria-controls={`panel-${t.id}`}
              className={activeTab === t.id ? 'tab active' : 'tab'}
              onClick={() => {
                setTab(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {activeTab !== 'health' && (
          <select
            className="input"
            aria-label="กรองตามเขต"
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
        )}
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'housing' && <HousingTab zoneId={zoneId} />}
        {activeTab === 'personnel' && <PersonnelTab zoneId={zoneId} />}
        {activeTab === 'vehicles' && <VehiclesTab zoneId={zoneId} />}
        {activeTab === 'health' && showHealth && <HealthTab />}
      </div>
    </section>
  );
}

function zonesFor(zoneId: string) {
  return mockData.zones.filter((z) => zoneId === '' || z.id === zoneId);
}

function HousingTab({ zoneId }: { zoneId: string }) {
  const { rooms, tickets } = filterByZone(mockData, zoneId);
  const counts = countRoomsByStatus(rooms);

  return (
    <>
      <div className="stat-grid">
        <StatCard label="ห้องทั้งหมด" value={rooms.length} />
        <StatCard label="มีผู้พัก" value={counts.occupied} />
        <StatCard label="ว่าง" value={counts.vacant} />
        <StatCard
          label="อัตราการเข้าพัก"
          value={`${String(occupancyRate(rooms))}%`}
          hint="ไม่นับห้องที่ปิดใช้งาน"
        />
        <StatCard label="ซ่อมบำรุง" value={counts.repair} />
        <StatCard label="งานซ่อมค้าง" value={tickets.filter(isOpenTicket).length} />
      </div>
      <div className="chart-grid">
        <StackedBars
          title="สถานะห้องรายเขต"
          series={STATUS_SERIES}
          rows={zonesFor(zoneId).map((z) => ({
            key: z.id,
            label: z.name,
            values: countRoomsByStatus(rooms.filter((r) => r.zoneId === z.id)),
          }))}
        />
        <BarList title="ประเภทห้อง" rows={tally(rooms, (r) => r.type)} />
        <BarList
          title="ห้องตามอาคาร"
          subtitle="จำนวนห้องที่มีผู้พัก"
          rows={tally(
            rooms.filter((r) => r.status === 'occupied'),
            (r) => lookups.buildingById.get(r.buildingId)?.name ?? '-',
          )}
        />
      </div>
    </>
  );
}

function PersonnelTab({ zoneId }: { zoneId: string }) {
  const { stays, rooms } = filterByZone(mockData, zoneId);
  const active = stays.filter((s) => s.status === 'active');
  const people = active.flatMap((s) => {
    const p = lookups.personById.get(s.personId);
    return p ? [p] : [];
  });
  const members = active.reduce((sum, s) => sum + s.memberCount, 0);
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const ages = active.flatMap((s) => s.memberAgeGroups);

  return (
    <>
      <div className="stat-grid">
        <StatCard label="ผู้พักหลัก" value={active.length} />
        <StatCard label="ผู้อาศัยร่วม" value={members} hint="ไม่รวมผู้พักหลัก" />
        <StatCard label="รวมผู้อยู่อาศัย" value={active.length + members} />
        <StatCard
          label="เฉลี่ยผู้อาศัยร่วม/ห้อง"
          value={occupiedRooms === 0 ? '0' : (members / occupiedRooms).toFixed(2)}
        />
      </div>
      <div className="chart-grid">
        <BarList title="ยศของผู้พักหลัก" rows={tally(people, (p) => p.rank)} maxRows={12} />
        <BarList title="หน่วยหลัก" rows={tally(people, (p) => p.unitName)} maxRows={12} />
        <BarList
          title="ช่วงอายุของผู้อาศัยร่วม"
          subtitle="ผู้พักหลักไม่มีอายุในข้อมูล"
          tone="secondary"
          rows={tally(ages, (a) => a, { order: AGE_GROUPS, labels: AGE_GROUP_LABEL })}
        />
        <StackedBars
          title="ผู้พักหลักและผู้อาศัยร่วมรายเขต"
          series={RESIDENT_SERIES}
          rows={zonesFor(zoneId).map((z) => {
            const zs = active.filter((s) => lookups.roomById.get(s.roomId)?.zoneId === z.id);
            return {
              key: z.id,
              label: z.name,
              values: {
                occupants: zs.length,
                members: zs.reduce((sum, s) => sum + s.memberCount, 0),
              },
            };
          })}
        />
      </div>
    </>
  );
}

function VehiclesTab({ zoneId }: { zoneId: string }) {
  const { vehicles, stays } = filterByZone(mockData, zoneId);
  const cars = vehicles.filter((v) => v.type === 'car').length;
  const perStay = stays
    .filter((s) => s.status === 'active')
    .map((s) => vehicles.filter((v) => v.stayId === s.id).length);

  return (
    <>
      <div className="stat-grid">
        <StatCard label="ยานพาหนะทั้งหมด" value={vehicles.length} />
        <StatCard label="รถยนต์" value={cars} />
        <StatCard label="รถจักรยานยนต์" value={vehicles.length - cars} />
        <StatCard label="ห้องที่มียานพาหนะ" value={perStay.filter((n) => n > 0).length} />
      </div>
      <div className="chart-grid">
        <StackedBars
          title="ยานพาหนะรายเขต"
          series={VEHICLE_SERIES}
          rows={zonesFor(zoneId).map((z) => {
            const zv = vehicles.filter((v) => lookups.roomById.get(v.roomId)?.zoneId === z.id);
            return {
              key: z.id,
              label: z.name,
              values: {
                car: zv.filter((v) => v.type === 'car').length,
                motorcycle: zv.filter((v) => v.type === 'motorcycle').length,
              },
            };
          })}
        />
        <BarList
          title="จำนวนยานพาหนะต่อห้อง"
          subtitle="นับเฉพาะห้องที่มีผู้พัก"
          rows={tally(perStay, (n) => `${String(n)} คัน`, { order: ['0 คัน', '1 คัน', '2 คัน'] })}
        />
      </div>
    </>
  );
}

/**
 * Health aggregates (H-5): totals only — no names, rooms, zones or per-person detail.
 * Not split by zone on purpose: small per-zone counts could identify individuals.
 */
function HealthTab() {
  return (
    <div data-testid="health-aggregate">
      <p className="notice">
        แสดงเฉพาะผู้มี healthAccess หรือ Commander Group · ตัวเลขรวมทั้งหน่วยเท่านั้น ไม่มีรายชื่อ ห้อง
        หรือการแยกเขต (H-5) · จำนวนน้อยกว่า 5 แสดงเป็น &lt;5 (N-2) · รายการกลุ่มโรคยังไม่อนุมัติ (TBD)
      </p>
      <div className="card">
        <h3>สรุปข้อมูลสุขภาพ (ตัวเลขรวม)</h3>
        <dl className="summary-kv">
          {mockData.healthAggregates.map((h) => (
            <Fragment key={h.label}>
              <dt>{h.label}</dt>
              <dd>{suppressSmall(h.count)}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}
