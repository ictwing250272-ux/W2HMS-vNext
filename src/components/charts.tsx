/**
 * Lightweight HTML bar charts (no chart library, no network).
 *
 * Bar widths are set through React's `style` prop, which React applies via the CSSOM at
 * runtime. That is not an inline style attribute in the served HTML, so the production CSP
 * (`style-src 'self'`) is unaffected.
 */
import type { Tally } from '../mocks/selectors';

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
const fmtPct = (part: number, whole: number) =>
  `${pct(part, whole).toFixed(1).replace(/\.0$/, '')}%`;

/** Single-series horizontal bars: one hue, value + share as text. */
export function BarList({
  title,
  subtitle,
  rows,
  tone = 'primary',
  maxRows,
}: {
  title: string;
  subtitle?: string;
  rows: readonly Tally[];
  tone?: 'primary' | 'secondary' | 'tertiary';
  /** Collapse the tail into an "อื่นๆ (n รายการ)" row. */
  maxRows?: number;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  let shown = [...rows];
  if (maxRows !== undefined && rows.length > maxRows) {
    const tail = rows.slice(maxRows);
    shown = [
      ...rows.slice(0, maxRows),
      {
        key: '__other',
        label: `อื่นๆ (${String(tail.length)} รายการ)`,
        count: tail.reduce((sum, r) => sum + r.count, 0),
      },
    ];
  }
  const max = Math.max(1, ...shown.map((r) => r.count));

  return (
    <figure className="chart card">
      <figcaption>
        <h3>{title}</h3>
        {subtitle !== undefined && <p className="muted small">{subtitle}</p>}
      </figcaption>
      {total === 0 ? (
        <p className="muted small">ไม่มีข้อมูล</p>
      ) : (
        <ul className="bar-list">
          {shown.map((r) => (
            <li key={r.key} title={`${r.label}: ${String(r.count)} (${fmtPct(r.count, total)})`}>
              <span className="bar-label">{r.label}</span>
              <span className="bar-track" aria-hidden="true">
                <span
                  className={`bar-fill tone-${tone}`}
                  style={{ width: `${String(pct(r.count, max))}%` }}
                />
              </span>
              <span className="bar-value">
                {r.count} <span className="muted">({fmtPct(r.count, total)})</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

export interface StackSeries {
  key: string;
  label: string;
  /** CSS class that sets the segment colour (e.g. `tone-primary`, `status-vacant`). */
  className: string;
}

export interface StackRow {
  key: string;
  label: string;
  values: Record<string, number>;
}

/** Stacked horizontal bars sharing one scale; legend always shown (>= 2 series). */
export function StackedBars({
  title,
  subtitle,
  series,
  rows,
}: {
  title: string;
  subtitle?: string;
  series: readonly StackSeries[];
  rows: readonly StackRow[];
}) {
  const totals = rows.map((r) => series.reduce((sum, s) => sum + (r.values[s.key] ?? 0), 0));
  const max = Math.max(1, ...totals);

  return (
    <figure className="chart card">
      <figcaption>
        <h3>{title}</h3>
        {subtitle !== undefined && <p className="muted small">{subtitle}</p>}
        <ul className="chart-legend">
          {series.map((s) => (
            <li key={s.key}>
              <span className={`swatch ${s.className}`} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      </figcaption>
      <ul className="bar-list stacked">
        {rows.map((r, i) => {
          const total = totals[i] ?? 0;
          const detail = series
            .map((s) => `${s.label} ${String(r.values[s.key] ?? 0)}`)
            .join(' · ');
          return (
            <li key={r.key} title={`${r.label}: ${detail}`}>
              <span className="bar-label">{r.label}</span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-stack" style={{ width: `${String(pct(total, max))}%` }}>
                  {series.map((s) => {
                    const v = r.values[s.key] ?? 0;
                    return v === 0 ? null : (
                      <span
                        key={s.key}
                        className={`bar-seg ${s.className}`}
                        style={{ flexGrow: v }}
                      />
                    );
                  })}
                </span>
              </span>
              <span className="bar-value">{total}</span>
              <span className="sr-only">{detail}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/** Thin progress meter (e.g. occupancy). */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <span
      className="meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span className="meter-fill" style={{ width: `${String(pct(value, max))}%` }} />
    </span>
  );
}
