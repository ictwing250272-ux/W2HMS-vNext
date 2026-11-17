import { useState } from 'react';

import { canEditGeneral } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import {
  EmptyRow,
  PageHeader,
  ProtoAction,
  StatCard,
  TICKET_STATUS_LABEL,
  TicketStatusBadge,
} from '../components/ui';
import { mockData } from '../mocks/data';
import type { TicketStatus } from '../mocks/types';
import { createLookups } from '../mocks/selectors';

const lookups = createLookups(mockData);
const STATUSES: TicketStatus[] = ['open', 'inProgress', 'done', 'cancelled'];

export function MaintenancePage() {
  const { session } = useMockSession();
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const rows = mockData.tickets.filter((t) => status === '' || t.status === status);
  const countOf = (s: TicketStatus) => mockData.tickets.filter((t) => t.status === s).length;

  return (
    <section>
      <PageHeader
        title="งานซ่อมบำรุง"
        actions={canEditGeneral(session) && <ProtoAction>แจ้งซ่อม</ProtoAction>}
      />

      <div className="stat-grid">
        {STATUSES.map((s) => (
          <StatCard key={s} label={TICKET_STATUS_LABEL[s]} value={countOf(s)} />
        ))}
      </div>

      <div className="filters">
        <select
          className="input"
          aria-label="กรองสถานะงานซ่อม"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TicketStatus | '');
          }}
        >
          <option value="">ทุกสถานะ</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <p className="muted small">หมวดงาน (C7) เป็นค่าตัวอย่าง · รายการจริงยังไม่อนุมัติ (TBD)</p>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>ห้อง</th>
              <th>หมวด</th>
              <th>เรื่อง</th>
              <th>วันที่แจ้ง</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={6} />}
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{lookups.roomById.get(t.roomId)?.code}</td>
                <td>{t.category}</td>
                <td>{t.title}</td>
                <td>{t.openedAt}</td>
                <td>
                  <TicketStatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
