import { getConfig } from '../config/env';

export function HomePage() {
  const config = getConfig();
  const envLabel = config.firebase.useEmulator ? 'Firebase Emulator (demo)' : 'Firebase';

  return (
    <section className="card" aria-labelledby="home-title">
      <h1 id="home-title">W2HMS vNext</h1>
      <p>ระบบบริหารจัดการบ้านพัก กองบิน 2 — Phase 1: Foundation</p>
      <dl className="meta">
        <dt>Environment</dt>
        <dd data-testid="app-env">{config.appEnv}</dd>
        <dt>Backend</dt>
        <dd data-testid="backend">{envLabel}</dd>
      </dl>
      <p className="muted">โครงสร้างพื้นฐานเท่านั้น ยังไม่มีการเข้าสู่ระบบ การเชื่อมต่อฐานข้อมูล หรือโมดูลบ้านพัก</p>
    </section>
  );
}
