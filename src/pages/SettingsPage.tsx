import { canManageUsers } from '../app/permissions';
import { useMockSession } from '../app/sessionContext';
import { PageHeader, ProtoAction } from '../components/ui';
import { getConfig } from '../config/env';
import { mockData } from '../mocks/data';

const LOOKUPS: [string, string][] = [
  ['รหัสโรค (healthConditions)', 'TBD — รออนุมัติ (H-1)'],
  ['ข้อจำกัดการดูแล (careLimitations)', 'ร่าง — รออนุมัติความหมาย (H-2)'],
  ['แท็กผู้พัก (stayTags)', 'TBD — รออนุมัติ (C5)'],
  ['เหตุผลการย้ายออก (endReasonCode)', 'TBD — รออนุมัติ (C6)'],
  ['หมวดงานซ่อม (maintCategories)', 'TBD — รออนุมัติ (C7)'],
];

export function SettingsPage() {
  const { session } = useMockSession();
  const config = getConfig();

  return (
    <section>
      <PageHeader title="ตั้งค่าระบบ" />

      <div className="card">
        <h2>สภาพแวดล้อม</h2>
        <dl className="meta">
          <dt>Environment</dt>
          <dd data-testid="app-env">{config.appEnv}</dd>
          <dt>Backend</dt>
          <dd data-testid="backend">
            {config.firebase.useEmulator ? 'Firebase Emulator (demo)' : 'Firebase'} — ยังไม่เชื่อมต่อ
          </dd>
          <dt>ข้อมูล</dt>
          <dd>ข้อมูลจำลองในเบราว์เซอร์ (ไม่มีการบันทึก)</dd>
        </dl>
      </div>

      <div className="card">
        <h2>เขต</h2>
        <ul>
          {mockData.zones.map((z) => (
            <li key={z.id}>{z.name}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>รายการค่ามาตรฐาน (Lookups)</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              {LOOKUPS.map(([name, state]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="muted">{state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canManageUsers(session) && (
          <div className="page-actions">
            <ProtoAction>แก้ไขรายการ</ProtoAction>
          </div>
        )}
      </div>
    </section>
  );
}
