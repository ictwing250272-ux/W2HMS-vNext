import { canManageUsers, ROLE_LABEL } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { Notice, PageHeader, ProtoAction } from '../components/ui';
import { mockData } from '../mocks/data';

const yesNo = (v: boolean) => (v ? 'มี' : '-');

const MATRIX: [string, string, string, string, string][] = [
  ['อ่านข้อมูลทั่วไปทุกเขต', '✓', '✓', '✓', '✓'],
  ['เพิ่ม / แก้ไขข้อมูลทั่วไป', '✓', '✓', '✓', '—'],
  ['ลบข้อมูล', '—', '—', '—', '—'],
  ['จัดการผู้ใช้', '✓', 'officer/viewer', '—', '—'],
  ['ให้ / ถอน healthAccess', '✓', '—', '—', '—'],
  ['ข้อมูลสุขภาพ', 'healthAccess', 'healthAccess', 'healthAccess', '—'],
  ['Export', 'canExport', 'canExport', 'canExport', '—'],
  ['Audit Logs ทั่วไป', '✓', '✓', '—', '✓'],
];

export function UsersPage() {
  const { session } = useMockSession();

  if (!canManageUsers(session)) {
    return (
      <section>
        <PageHeader title="ผู้ใช้งานและสิทธิ์" />
        <Notice>บทบาท {ROLE_LABEL[session.role]} ไม่มีสิทธิ์จัดการผู้ใช้งาน</Notice>
      </section>
    );
  }

  const pending = mockData.accessRequests.filter((r) => r.status === 'pending');

  return (
    <section>
      <PageHeader title="ผู้ใช้งานและสิทธิ์" description="บัญชีรายบุคคล (ข้อมูลจำลอง)" />

      <div className="card">
        <h2>คำขอใช้งานที่รออนุมัติ ({pending.length})</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>บทบาทที่ขอ</th>
                <th>วันที่ขอ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.uid}>
                  <td>{r.fullName}</td>
                  <td>{ROLE_LABEL[r.requestedRole]}</td>
                  <td>{r.createdAt}</td>
                  <td className="row-actions">
                    <ProtoAction>อนุมัติ</ProtoAction>
                    <ProtoAction>ปฏิเสธ</ProtoAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>บัญชีผู้ใช้</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>บทบาท</th>
                <th>สถานะ</th>
                <th>healthAccess</th>
                <th>canExport</th>
              </tr>
            </thead>
            <tbody>
              {mockData.users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.displayName}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.status === 'approved' ? 'ใช้งาน' : 'ระงับ'}</td>
                  <td>{yesNo(u.healthAccess)}</td>
                  <td>{yesNo(u.canExport)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>สรุปสิทธิ์ตามบทบาท</h2>
        <p className="muted small">
          ตามนโยบายที่อนุมัติใน docs/SECURITY-DESIGN.md · การบังคับใช้จริงต้องมาจาก Firestore Rules
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ความสามารถ</th>
                <th>Super Admin</th>
                <th>Admin</th>
                <th>Officer</th>
                <th>Viewer</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([label, ...cells]) => (
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
      </div>
    </section>
  );
}
