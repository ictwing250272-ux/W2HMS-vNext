import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="card" aria-labelledby="nf-title">
      <h1 id="nf-title">ไม่พบหน้าที่ต้องการ</h1>
      <p>
        <Link to="/">กลับหน้าแรก</Link>
      </p>
    </section>
  );
}
