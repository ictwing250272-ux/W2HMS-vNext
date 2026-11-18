/**
 * Right-hand room detail panel. Every tab is gated by the UI permission helpers; health data
 * lives only in the "สุขภาพ" tab, which is not rendered at all without read permission.
 */
import { useState } from 'react';

import {
  can,
  canEditHealth,
  canReadAuditLogs,
  canViewHealth,
  type MockSession,
} from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { ROOM_STATUS_LABEL, ROOM_STATUSES } from '../mocks/selectors';
import type { CareLimitation, MockDataset, Room, RoomStatus } from '../mocks/types';
import { Notice, ProtoAction, TicketStatusBadge } from './ui';

type TabId = 'info' | 'occupant' | 'household' | 'history' | 'maintenance' | 'health';

export const CARE_LIMITATION_LABEL: Record<CareLimitation, string> = {
  bedridden: 'ติดเตียง',
  wheelchair: 'ใช้รถเข็น',
  mobilityAid: 'ใช้อุปกรณ์ช่วยเดิน',
  needsCaregiver: 'ต้องมีผู้ดูแล',
  visualHearing: 'บกพร่องการมองเห็น/ได้ยิน',
  other: 'อื่น ๆ',
};

const NOTE_MAX = 200;

function age(birthYear: number | null): string {
  return birthYear === null ? 'ไม่ระบุ' : `${String(new Date().getFullYear() - birthYear)} ปี`;
}

function roomContext(data: MockDataset, room: Room) {
  const stay = room.currentStayId === null ? undefined : data.stays.find((s) => s.id === room.currentStayId);
  const person = stay === undefined ? undefined : data.people.find((p) => p.id === stay.personId);
  const members = stay === undefined ? [] : data.stayMembers.filter((m) => m.stayId === stay.id);
  const history = data.stays
    .filter((s) => s.roomId === room.id && s.status === 'ended')
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  const tickets = data.tickets.filter((t) => t.roomId === room.id);
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'inProgress');
  return { stay, person, members, history, tickets, openTickets };
}

export function RoomDetail({
  room,
  onPrev,
  onNext,
  onClose,
  position,
}: {
  room: Room;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  position: string;
}) {
  const { session, data } = useMockSession();
  const [tab, setTab] = useState<TabId>('info');
  const ctx = roomContext(data, room);
  const building = data.buildings.find((b) => b.id === room.buildingId);
  const zone = data.zones.find((z) => z.id === room.zoneId);
  const showHealth = canViewHealth(session);
  const canSeeStays = can(session, 'stays', 'view');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'info', label: 'ข้อมูล' },
    ...(canSeeStays
      ? [
          { id: 'occupant' as const, label: 'ผู้พัก' },
          { id: 'household' as const, label: 'ครัวเรือน', count: ctx.members.length },
          { id: 'history' as const, label: 'ประวัติ', count: ctx.history.length },
        ]
      : []),
    ...(can(session, 'maintenance', 'view')
      ? [{ id: 'maintenance' as const, label: 'ซ่อม', count: ctx.openTickets.length }]
      : []),
    ...(showHealth ? [{ id: 'health' as const, label: 'สุขภาพ' }] : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : 'info';

  return (
    <div className="room-detail" data-testid="room-detail">
      <div className="detail-head">
        <button type="button" className="icon-btn" aria-label="ห้องก่อนหน้า" onClick={onPrev}>
          ‹
        </button>
        <div className="detail-title">
          <h2>ห้อง {room.code}</h2>
          <div className="muted small">
            {building?.name} · ชั้น {room.floor} · ห้อง {position} · {zone?.name}
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="ห้องถัดไป" onClick={onNext}>
          ›
        </button>
        <button type="button" className="icon-btn" aria-label="ปิดรายละเอียด" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="detail-tabs" role="tablist" aria-label="รายละเอียดห้อง">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={active === t.id ? 'dtab active' : 'dtab'}
            onClick={() => {
              setTab(t.id);
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="detail-body" role="tabpanel">
        {active === 'info' && <InfoTab key={room.id} room={room} session={session} ctx={ctx} />}
        {active === 'occupant' && <OccupantTab session={session} ctx={ctx} />}
        {active === 'household' && <HouseholdTab session={session} ctx={ctx} />}
        {active === 'history' && <HistoryTab data={data} ctx={ctx} />}
        {active === 'maintenance' && <MaintenanceTab session={session} ctx={ctx} />}
        {active === 'health' && showHealth && <HealthTab data={data} session={session} ctx={ctx} />}
      </div>
    </div>
  );
}

type Ctx = ReturnType<typeof roomContext>;

function InfoTab({ room, session, ctx }: { room: Room; session: MockSession; ctx: Ctx }) {
  const { updateRoom } = useMockSession();
  const editable = can(session, 'housing', 'update');
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [type, setType] = useState(room.type);
  const [note, setNote] = useState(room.note);
  const [checked, setChecked] = useState(room.checked);
  const [submitted, setSubmitted] = useState(room.submitted);
  const [message, setMessage] = useState<string | null>(null);
  const dirty =
    status !== room.status ||
    type !== room.type ||
    note !== room.note ||
    checked !== room.checked ||
    submitted !== room.submitted;
  // Occupancy is managed through check-in / check-out, not by flipping the status.
  const statusLocked = (s: RoomStatus) =>
    (room.currentStayId !== null && s !== 'occupied') || (room.currentStayId === null && s === 'occupied');

  return (
    <div className="stack">
      <fieldset className="field-group" disabled={!editable}>
        <legend>สถานะห้อง</legend>
        <div className="segmented wrap" role="radiogroup" aria-label="สถานะห้อง">
          {ROOM_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              className={status === s ? `seg active seg-${s}` : 'seg'}
              disabled={statusLocked(s)}
              onClick={() => {
                setStatus(s);
                setMessage(null);
              }}
            >
              {ROOM_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <label className="field">
          <span>ประเภท / ชื่อแบบบ้านพัก</span>
          <input
            className="input"
            value={type}
            maxLength={60}
            onChange={(e) => {
              setType(e.target.value);
            }}
          />
        </label>
        <label className="field">
          <span>หมายเหตุห้อง</span>
          <textarea
            className="input"
            rows={3}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
          <span className="muted small">
            ห้ามบันทึกข้อมูลสุขภาพหรือข้อมูลส่วนบุคคลในหมายเหตุ · {note.length}/{NOTE_MAX}
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              setChecked(e.target.checked);
            }}
          />
          ตรวจสอบข้อมูลห้องนี้แล้ว
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={submitted}
            onChange={(e) => {
              setSubmitted(e.target.checked);
            }}
          />
          ส่งข้อมูลบุคคลแล้ว
        </label>
      </fieldset>
      {editable ? (
        <div className="row-actions">
          <button
            type="button"
            className="btn"
            disabled={!dirty}
            onClick={() => {
              setStatus(room.status);
              setType(room.type);
              setNote(room.note);
              setChecked(room.checked);
              setSubmitted(room.submitted);
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!dirty}
            onClick={() => {
              const result = updateRoom(room.id, { status, type, note, checked, submitted });
              setMessage(result.ok ? 'บันทึกแล้ว (หน่วยความจำ · ข้อมูลจำลอง)' : result.reason);
            }}
          >
            บันทึก
          </button>
        </div>
      ) : (
        <p className="muted small">อ่านอย่างเดียว — บัญชีนี้ไม่มีสิทธิ์ Update ข้อมูลห้อง</p>
      )}
      {message !== null && (
        <p className="ok-text small" role="status">
          {message}
        </p>
      )}

      <dl className="summary-kv boxed">
        {can(session, 'stays', 'view') && (
          <>
            <dt>ผู้พักปัจจุบัน</dt>
            <dd>{ctx.person ? `${ctx.person.rank} ${ctx.person.fullName}` : '-'}</dd>
          </>
        )}
        <dt>งานซ่อมค้าง</dt>
        <dd>{ctx.openTickets.length}</dd>
        <dt>ผู้พักที่ผ่านมา</dt>
        <dd>{ctx.history.length} ราย</dd>
        <dt>อัปเดตล่าสุด</dt>
        <dd>{room.updatedAt}</dd>
      </dl>
      {canReadAuditLogs(session) && <ProtoAction>ดูบันทึกการแก้ไขห้องนี้</ProtoAction>}
    </div>
  );
}

function OccupantTab({ session, ctx }: { session: MockSession; ctx: Ctx }) {
  const { stay, person } = ctx;
  if (stay === undefined) {
    return (
      <div className="stack">
        <p className="muted">ห้องนี้ไม่มีผู้พัก</p>
        {can(session, 'stays', 'create') && <ProtoAction>บันทึกเข้าพัก</ProtoAction>}
      </div>
    );
  }
  return (
    <div className="stack">
      <dl className="summary-kv boxed">
        <dt>ผู้พักหลัก</dt>
        <dd>
          {can(session, 'personnel', 'view') && person
            ? `${person.rank} ${person.fullName}`
            : 'ไม่มีสิทธิ์ดูข้อมูลกำลังพล'}
        </dd>
        {can(session, 'personnel', 'view') && person && (
          <>
            <dt>สังกัด</dt>
            <dd>{person.unitName}</dd>
          </>
        )}
        <dt>วันที่เข้าพัก</dt>
        <dd>{stay.checkIn}</dd>
        <dt>โทรศัพท์ (stayPrivate)</dt>
        <dd>{stay.phone}</dd>
        <dt>สมาชิกครัวเรือน</dt>
        <dd>{ctx.members.length} คน</dd>
      </dl>
      {can(session, 'stays', 'update') && (
        <div className="row-actions">
          <ProtoAction>แก้ไขการเข้าพัก</ProtoAction>
          <ProtoAction>ย้ายออก</ProtoAction>
        </div>
      )}
    </div>
  );
}

function HouseholdTab({ session, ctx }: { session: MockSession; ctx: Ctx }) {
  return (
    <div className="stack">
      {ctx.members.length === 0 ? (
        <p className="muted">ไม่มีสมาชิกครัวเรือน</p>
      ) : (
        <ul className="list-rows">
          {ctx.members.map((m) => (
            <li key={m.id}>
              <strong>{m.name}</strong>
              <span className="muted small">
                {m.relation} · {age(m.birthYear)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {ctx.stay !== undefined && can(session, 'stays', 'create') && (
        <ProtoAction>เพิ่มสมาชิก</ProtoAction>
      )}
    </div>
  );
}

function HistoryTab({ data, ctx }: { data: MockDataset; ctx: Ctx }) {
  if (ctx.history.length === 0) return <p className="muted">ยังไม่มีประวัติการเข้าพัก</p>;
  return (
    <ul className="list-rows">
      {ctx.history.map((s) => {
        const p = data.people.find((x) => x.id === s.personId);
        return (
          <li key={s.id}>
            <strong>{p ? `${p.rank} ${p.fullName}` : '-'}</strong>
            <span className="muted small">
              {s.checkIn} – {s.checkOut ?? 'ปัจจุบัน'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MaintenanceTab({ session, ctx }: { session: MockSession; ctx: Ctx }) {
  const { deleteTicket } = useMockSession();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const canDelete = can(session, 'maintenance', 'delete');

  return (
    <div className="stack">
      {ctx.tickets.length === 0 ? (
        <p className="muted">ไม่มีงานซ่อม</p>
      ) : (
        <ul className="list-rows">
          {ctx.tickets.map((t) => (
            <li key={t.id}>
              <div className="row-between">
                <strong>{t.title}</strong>
                <TicketStatusBadge status={t.status} />
              </div>
              <span className="muted small">
                {t.category} · {t.openedAt}
              </span>
              {canDelete &&
                (confirmId === t.id ? (
                  <span className="row-actions">
                    <span className="warn-text small">ลบงานนี้? (ข้อมูลจำลอง)</span>
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      onClick={() => {
                        deleteTicket(t.id);
                        setConfirmId(null);
                      }}
                    >
                      ยืนยันลบ
                    </button>
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => {
                        setConfirmId(null);
                      }}
                    >
                      ยกเลิก
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="link-btn danger"
                    onClick={() => {
                      setConfirmId(t.id);
                    }}
                  >
                    ลบ
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
      {canDelete && (
        <p className="warn-text small">⚠ สิทธิ์ Delete ต้องมีมติใหม่ก่อนใช้จริง (มติเดิม: ห้ามลบ)</p>
      )}
      {can(session, 'maintenance', 'create') && <ProtoAction>แจ้งซ่อม</ProtoAction>}
    </div>
  );
}

function HealthTab({ data, session, ctx }: { data: MockDataset; session: MockSession; ctx: Ctx }) {
  const records =
    ctx.stay === undefined ? [] : data.personnelHealth.filter((h) => h.stayId === ctx.stay?.id);
  const editable = canEditHealth(session);
  const subjectName = (subjectType: string, subjectId: string) => {
    if (subjectType === 'occupant') return 'ผู้พักหลัก';
    return data.stayMembers.find((m) => m.id === subjectId)?.name ?? 'สมาชิก';
  };

  return (
    <div className="stack" data-testid="room-health">
      <Notice>
        ข้อมูลสุขภาพ (personnelHealth) · {editable ? 'healthAccess: อ่านและแก้ไขได้' : 'Commander Group: อ่านอย่างเดียว'}
        · รหัสโรคยังเป็นรายการชั่วคราว (TBD)
      </Notice>
      {records.length === 0 ? (
        <p className="muted">ไม่มีข้อมูลสุขภาพที่บันทึกไว้</p>
      ) : (
        <ul className="list-rows">
          {records.map((h) => (
            <li key={h.id}>
              <strong>{subjectName(h.subjectType, h.subjectId)}</strong>
              <span className="small">โรคประจำตัว: {h.conditionCodes.join(', ')}</span>
              <span className="small">
                ข้อจำกัดการดูแล:{' '}
                {h.careLimitations.length === 0
                  ? '-'
                  : h.careLimitations.map((c) => CARE_LIMITATION_LABEL[c]).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editable && ctx.stay !== undefined && <ProtoAction>แก้ไขข้อมูลสุขภาพ</ProtoAction>}
    </div>
  );
}
