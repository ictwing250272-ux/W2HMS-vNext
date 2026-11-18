import { useMemo, useState } from 'react';

import {
  ACTION_LABEL,
  ACTIONS,
  canManageUsers,
  checkAccessEdit,
  countGrants,
  isApplicable,
  isRoleLocked,
  MODULE_LABEL,
  MODULES,
  normaliseUser,
  ROLE_HINT,
  ROLE_LABEL,
  sameGrants,
  STAFF_PRESETS,
} from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { Notice, PageHeader } from '../components/ui';
import { matches } from '../mocks/selectors';
import type { AppUser, Grants, PermAction, PermModule, Role } from '../mocks/types';

type RoleFilter = 'all' | Role | 'suspended';

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'superAdmin', label: 'Super Admin' },
  { id: 'staff', label: 'Staff' },
  { id: 'viewer', label: 'Viewer' },
  { id: 'suspended', label: 'ถูกระงับ' },
];

function UserFlags({ user }: { user: AppUser }) {
  return (
    <span className="chip-row">
      <span className={`chip role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
      {user.status === 'suspended' && <span className="chip chip-danger">ระงับ</span>}
      {user.healthAccess && <span className="chip chip-health">healthAccess</span>}
      {user.commanderGroup && <span className="chip chip-health">Commander</span>}
    </span>
  );
}

export function UsersPage() {
  const { session, users, accessRequests, approveRequest, rejectRequest } = useMockSession();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      users.filter((u) => {
        if (!matches(query, u.displayName, u.email, ROLE_LABEL[u.role])) return false;
        if (filter === 'all') return true;
        if (filter === 'suspended') return u.status === 'suspended';
        return u.role === filter;
      }),
    [users, query, filter],
  );

  if (!canManageUsers(session)) {
    return (
      <section>
        <PageHeader title="ผู้ใช้งานและสิทธิ์" />
        <Notice>
          บัญชี {ROLE_LABEL[session.role]} ไม่มีสิทธิ์จัดการผู้ใช้งาน — เฉพาะ Super Admin
          เท่านั้นที่กำหนดหรือเพิกถอนสิทธิ์ได้
        </Notice>
      </section>
    );
  }

  const pending = accessRequests.filter((r) => r.status === 'pending');
  const selected = users.find((u) => u.uid === selectedUid) ?? visible[0];

  return (
    <section>
      <PageHeader
        title="ผู้ใช้งานและสิทธิ์"
        description="ค้นหาผู้ใช้ กำหนดบทบาทและสิทธิ์รายโมดูลได้จากหน้าเดียว · ข้อมูลจำลอง บันทึกในหน่วยความจำเท่านั้น"
      />

      {pending.length > 0 && (
        <div className="card">
          <h2>คำขอใช้งานที่รออนุมัติ ({pending.length})</h2>
          <ul className="request-list">
            {pending.map((r) => (
              <li key={r.uid}>
                <div>
                  <strong>{r.fullName}</strong>
                  <div className="muted small">
                    ขอเป็น {ROLE_LABEL[r.requestedRole]} · {r.createdAt}
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      approveRequest(r.uid, r.requestedRole);
                      setSelectedUid(r.uid);
                    }}
                  >
                    อนุมัติเป็น {ROLE_LABEL[r.requestedRole]}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      rejectRequest(r.uid);
                    }}
                  >
                    ปฏิเสธ
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted small">
            อนุมัติแล้ว Staff เริ่มที่สิทธิ์ “อ่านอย่างเดียว” · Viewer อ่านอย่างเดียวเสมอ
          </p>
        </div>
      )}

      <div className="access-layout">
        <div className="card access-list">
          <input
            type="search"
            className="input"
            aria-label="ค้นหาผู้ใช้"
            placeholder="ค้นหาชื่อ อีเมล หรือบทบาท"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
          <div className="chip-filter" role="group" aria-label="กรองบทบาท">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={filter === f.id ? 'tab active' : 'tab'}
                aria-pressed={filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ul className="user-list" aria-label="รายชื่อผู้ใช้">
            {visible.length === 0 && <li className="muted small">ไม่พบผู้ใช้</li>}
            {visible.map((u) => (
              <li key={u.uid}>
                <button
                  type="button"
                  className={u.uid === selected?.uid ? 'user-item active' : 'user-item'}
                  aria-pressed={u.uid === selected?.uid}
                  onClick={() => {
                    setSelectedUid(u.uid);
                  }}
                >
                  <span className="user-name">
                    {u.displayName}
                    {u.uid === session.uid && <span className="muted small"> (คุณ)</span>}
                  </span>
                  <span className="muted small">{u.email}</span>
                  <UserFlags user={u} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selected === undefined ? (
          <div className="card">
            <p className="muted">เลือกผู้ใช้เพื่อกำหนดสิทธิ์</p>
          </div>
        ) : (
          <AccessEditor key={selected.uid} target={selected} />
        )}
      </div>

      <PolicyReference />
    </section>
  );
}

interface Draft {
  role: Role;
  status: AppUser['status'];
  healthAccess: boolean;
  commanderGroup: boolean;
  grants: Grants;
}

const draftOf = (u: AppUser): Draft => ({
  role: u.role,
  status: u.status,
  healthAccess: u.healthAccess,
  commanderGroup: u.commanderGroup,
  grants: u.grants,
});

function AccessEditor({ target }: { target: AppUser }) {
  const { session, updateUser } = useMockSession();
  const [draft, setDraft] = useState<Draft>(() => draftOf(target));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const check = checkAccessEdit(session, target);
  const locked = !check.ok;
  const roleLocked = isRoleLocked(target);
  // Preview exactly what will be saved (Viewer → view-only, Super Admin → full, etc.).
  const preview = normaliseUser({ ...target, ...draft });
  const changes = [
    preview.role !== target.role,
    preview.status !== target.status,
    preview.healthAccess !== target.healthAccess,
    preview.commanderGroup !== target.commanderGroup,
    !sameGrants(preview.grants, target.grants),
  ].filter(Boolean).length;
  const matrixEditable = !locked && preview.role === 'staff';

  const set = (patch: Partial<Draft>) => {
    setMessage(null);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const toggleCell = (m: PermModule, a: PermAction) => {
    set({ grants: { ...draft.grants, [m]: { ...draft.grants[m], [a]: !draft.grants[m][a] } } });
  };
  const setColumn = (a: PermAction, value: boolean) => {
    const grants = { ...draft.grants };
    for (const m of MODULES) {
      if (isApplicable(m, a)) grants[m] = { ...grants[m], [a]: value };
    }
    set({ grants });
  };

  const save = () => {
    const result = updateUser(target.uid, {
      ...(roleLocked ? {} : { role: preview.role, status: preview.status }),
      healthAccess: preview.healthAccess,
      commanderGroup: preview.commanderGroup,
      grants: preview.grants,
    });
    setMessage(
      result.ok
        ? { ok: true, text: 'บันทึกแล้ว (หน่วยความจำ · ข้อมูลจำลอง)' }
        : { ok: false, text: result.reason },
    );
  };

  return (
    <div className="card access-editor" aria-label={`สิทธิ์ของ ${target.displayName}`}>
      <div className="editor-head">
        <div>
          <h2>{target.displayName}</h2>
          <div className="muted small">{target.email}</div>
        </div>
        <UserFlags user={target} />
      </div>

      {locked && <Notice>{check.reason}</Notice>}
      {!locked && roleLocked && (
        <Notice>
          บทบาทและสถานะของ Super Admin แก้จากหน้าจอไม่ได้ (P-5 / N-6) · Super Admin มีสิทธิ์ทุกโมดูลเสมอ
        </Notice>
      )}

      <fieldset className="field-group" disabled={locked}>
        <legend>บทบาท</legend>
        <div className="segmented" role="radiogroup" aria-label="บทบาท">
          {(['superAdmin', 'staff', 'viewer'] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={preview.role === r}
              className={preview.role === r ? 'seg active' : 'seg'}
              disabled={roleLocked || r === 'superAdmin'}
              title={
                r === 'superAdmin' ? 'สร้าง Super Admin ผ่าน Bootstrap เท่านั้น (P-5)' : ROLE_HINT[r]
              }
              onClick={() => {
                set({ role: r });
              }}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        <p className="muted small">{ROLE_HINT[preview.role]}</p>
      </fieldset>

      <fieldset className="field-group" disabled={locked || roleLocked}>
        <legend>สถานะบัญชี</legend>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.status === 'approved'}
            onChange={(e) => {
              set({ status: e.target.checked ? 'approved' : 'suspended' });
            }}
          />
          <span>{draft.status === 'approved' ? 'ใช้งาน' : 'ระงับ'}</span>
        </label>
      </fieldset>

      <fieldset className="field-group" disabled={locked}>
        <legend>ข้อมูลสุขภาพ</legend>
        <label className="switch">
          <input
            type="checkbox"
            checked={preview.healthAccess}
            disabled={preview.role === 'viewer'}
            onChange={(e) => {
              set({ healthAccess: e.target.checked });
            }}
          />
          <span>healthAccess — อ่านและแก้ไขข้อมูลสุขภาพรายบุคคล</span>
        </label>
        {preview.role === 'viewer' && (
          <p className="muted small">Viewer ไม่ได้รับ healthAccess (D2) · ใช้ Commander Group แทน</p>
        )}
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.commanderGroup}
            onChange={(e) => {
              set({ commanderGroup: e.target.checked });
            }}
          />
          <span>Commander Group — อ่านข้อมูลสุขภาพรายบุคคลอย่างเดียว</span>
        </label>
        {preview.role === 'viewer' && draft.commanderGroup && (
          <p className="warn-text small">
            ⚠ Viewer + Commander Group ขัดมติ D2 ปัจจุบัน — ต้องมีมติใหม่ก่อนทำ Firestore Rules จริง
          </p>
        )}
      </fieldset>

      <fieldset className="field-group" disabled={!matrixEditable}>
        <legend>สิทธิ์รายโมดูล</legend>
        {preview.role === 'staff' ? (
          <div className="preset-row">
            <span className="muted small">แม่แบบ:</span>
            {STAFF_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn btn-small"
                title={p.description}
                onClick={() => {
                  set({ grants: p.grants() });
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">
            {preview.role === 'viewer'
              ? 'Viewer: View อย่างเดียวทุกโมดูล — แก้ไขไม่ได้'
              : 'Super Admin: ทุกสิทธิ์ทุกโมดูล — แก้ไขไม่ได้'}
          </p>
        )}
        <div className="table-wrap">
          <table className="grant-matrix">
            <thead>
              <tr>
                <th>โมดูล</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="center">
                    {ACTION_LABEL[a]}
                    {a === 'delete' && (
                      <span className="warn-text" title="ต้องมีมติใหม่ก่อนใช้จริง (มติเดิม: ห้ามลบ)">
                        {' '}
                        ⚠
                      </span>
                    )}
                    {matrixEditable && (
                      <span className="col-toggle">
                        <button
                          type="button"
                          className="link-btn"
                          aria-label={`เลือก ${ACTION_LABEL[a]} ทั้งหมด`}
                          onClick={() => {
                            setColumn(a, true);
                          }}
                        >
                          ทั้งหมด
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          aria-label={`ล้าง ${ACTION_LABEL[a]} ทั้งหมด`}
                          onClick={() => {
                            setColumn(a, false);
                          }}
                        >
                          ล้าง
                        </button>
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m}>
                  <td>{MODULE_LABEL[m]}</td>
                  {ACTIONS.map((a) => (
                    <td key={a} className="center">
                      {isApplicable(m, a) ? (
                        <input
                          type="checkbox"
                          aria-label={`${MODULE_LABEL[m]} ${ACTION_LABEL[a]}`}
                          checked={preview.grants[m][a]}
                          onChange={() => {
                            toggleCell(m, a);
                          }}
                        />
                      ) : (
                        <span className="muted" aria-label="ไม่เกี่ยวข้อง">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.role === 'staff' && MODULES.some((m) => preview.grants[m].delete) && (
          <p className="warn-text small">
            ⚠ สิทธิ์ Delete ใช้ได้กับข้อมูลจำลองเท่านั้น — มติเดิมกำหนด “ห้ามลบ” ต้องมีมติใหม่ก่อนใช้จริง
          </p>
        )}
      </fieldset>

      <div className="editor-foot">
        <span className="muted small">
          {changes === 0 ? 'ไม่มีการเปลี่ยนแปลง' : `เปลี่ยน ${String(changes)} หัวข้อ`} · สิทธิ์ที่มีผล{' '}
          {countGrants(preview.grants)} รายการ
        </span>
        <div className="row-actions">
          <button
            type="button"
            className="btn"
            disabled={locked || changes === 0}
            onClick={() => {
              setDraft(draftOf(target));
              setMessage(null);
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={locked || changes === 0}
            onClick={save}
          >
            บันทึกสิทธิ์
          </button>
        </div>
      </div>
      {message !== null && (
        <p className={message.ok ? 'ok-text small' : 'warn-text small'} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}

const POLICY: [string, string, string, string][] = [
  ['View ข้อมูลทั่วไป', '✓', 'ตามสิทธิ์', '✓ ทุกโมดูล'],
  ['Create / Update', '✓', 'ตามสิทธิ์', '—'],
  ['Delete', '✓', 'ตามสิทธิ์ ⚠', '—'],
  ['Export', '✓', 'ตามสิทธิ์', '—'],
  ['กำหนด / เพิกถอนสิทธิ์', '✓', '—', '—'],
  ['ข้อมูลสุขภาพ (อ่าน+แก้)', 'healthAccess', 'healthAccess', '—'],
  ['ข้อมูลสุขภาพ (อ่านอย่างเดียว)', 'Commander', 'Commander', 'Commander ⚠ D2'],
];

function PolicyReference() {
  return (
    <details className="card">
      <summary>
        <strong>สรุปนโยบายสิทธิ์ (ต้นแบบ)</strong>
      </summary>
      <p className="muted small">
        Admin และ Officer รวมเป็น Staff ตามคำสั่งเจ้าของโครงการ — ยังไม่บันทึกใน SECURITY-DECISIONS
        · การบังคับใช้จริงต้องมาจาก Firebase Auth + Firestore Rules
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ความสามารถ</th>
              <th>Super Admin</th>
              <th>Staff</th>
              <th>Viewer</th>
            </tr>
          </thead>
          <tbody>
            {POLICY.map(([label, ...cells]) => (
              <tr key={label}>
                <td>{label}</td>
                {cells.map((c, i) => (
                  <td key={i} className="center">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
