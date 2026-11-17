import type { ReactNode } from 'react';

import type { RoomStatus, TicketStatus } from '../mocks/types';
import { ROOM_STATUS_LABEL } from '../mocks/selectors';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description !== undefined && <p className="muted">{description}</p>}
      </div>
      {actions !== undefined && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint !== undefined && <div className="muted small">{hint}</div>}
    </div>
  );
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return <span className={`badge status-${status}`}>{ROOM_STATUS_LABEL[status]}</span>;
}

const TICKET_LABEL: Record<TicketStatus, string> = {
  open: 'รอดำเนินการ',
  inProgress: 'กำลังดำเนินการ',
  done: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge ticket-${status}`}>{TICKET_LABEL[status]}</span>;
}

export const TICKET_STATUS_LABEL = TICKET_LABEL;

/**
 * Prototype action button: always disabled because nothing is saved yet.
 * Callers decide visibility from the mock role (UI only — not a security control).
 */
export function ProtoAction({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="btn" disabled title="ต้นแบบ — ยังไม่เปิดใช้งาน">
      {children}
    </button>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <input
      type="search"
      className="input"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
    />
  );
}

export function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="muted center">
        ไม่พบข้อมูล
      </td>
    </tr>
  );
}
