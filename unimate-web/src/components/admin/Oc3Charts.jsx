import React, { useEffect, useRef, useState } from 'react';
import { VIZ } from './vizTokens';

const tooltipStyle = {
  position: 'absolute',
  pointerEvents: 'none',
  backgroundColor: VIZ.surface,
  border: `1px solid ${VIZ.grid}`,
  borderRadius: '10px',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
  padding: '8px 10px',
  fontSize: '12px',
  color: VIZ.textSecondary,
  whiteSpace: 'nowrap',
  zIndex: 5,
};

const formatPct = (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`);

/** Phễu chuyển đổi: thanh ngang, mỗi bước một nấc của cùng tông màu */
export function FunnelChart({ steps }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...steps.map((s) => s.count));
  const first = steps[0]?.count || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {steps.map((s, i) => {
        // Thanh dài nhất chiếm 78% để nhãn số ở đầu thanh luôn đủ chỗ trên một dòng
        const width = (s.count / max) * 78;
        const fromPrevious = i && s.previous ? s.count / s.previous : null;
        return (
          <div
            key={s.step}
            tabIndex={0}
            aria-label={`${s.step}: ${s.count} người`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 34%) 1fr', alignItems: 'center', gap: '12px', position: 'relative', outline: 'none' }}
          >
            <span style={{ fontSize: '13px', color: VIZ.textPrimary }}>{s.step}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '24px' }}>
              <div
                style={{
                  width: `${width}%`,
                  minWidth: s.count ? '4px' : 0,
                  height: '22px',
                  backgroundColor: VIZ.funnelRamp[i % VIZ.funnelRamp.length],
                  borderRadius: '0 4px 4px 0',
                  opacity: active === null || active === i ? 1 : 0.55,
                  transition: 'opacity 0.15s',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: VIZ.textPrimary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {s.count}
                <span style={{ fontWeight: 500, color: VIZ.textSecondary }}> · {formatPct(first ? s.count / first : null)}</span>
              </span>
            </div>
            {active === i && (
              <div style={{ ...tooltipStyle, top: '-46px', left: '34%' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: VIZ.textPrimary }}>{s.count} người</div>
                <div>
                  {i === 0
                    ? s.step
                    : `${formatPct(fromPrevious)} so với bước trước · mất ${s.previous - s.count} người`}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const useWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

/** Mốc trục tung tròn số nguyên: 0, 5, 10... hoặc 0, 50K, 100K... */
const niceTicks = (maxValue) => {
  const max = Math.max(1, maxValue);
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  // Số người / số tiền không có phần lẻ nên bước nhỏ nhất là 1
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) || rough);
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(Math.round(v));
  if (ticks[ticks.length - 1] < max) ticks.push(Math.round(ticks[ticks.length - 1] + step));
  return ticks;
};

const compact = (value) => {
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(value);
};

/**
 * Biểu đồ đường theo tuần (một trục tung). series: [{ label, color, values }]
 * categories: nhãn trục hoành; formatValue: định dạng số trong tooltip
 */
export function LineChart({ categories, series, formatValue = (v) => v, area = false, height = 220 }) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState(null);
  const padding = { top: 12, right: 64, bottom: 28, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values)));
  const yMax = ticks[ticks.length - 1];
  const n = categories.length;
  const x = (i) => padding.left + (n === 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const y = (v) => padding.top + plotHeight - (v / yMax) * plotHeight;
  const labelEvery = Math.ceil(n / Math.max(1, Math.floor(plotWidth / 56)));
  // Ghi giá trị ở cuối đường, trừ khi 2 nhãn sát nhau (khi đó chú thích + tooltip đảm nhận)
  const endYs = series.map((s) => y(s.values[n - 1]));
  const showEndLabels = endYs.every((a, i) => endYs.every((b, j) => i === j || Math.abs(a - b) >= 14));

  const pickIndex = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    const relative = clientX - rect.left - padding.left;
    return Math.min(n - 1, Math.max(0, Math.round(n === 1 ? 0 : (relative / plotWidth) * (n - 1))));
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') setActive((i) => Math.min(n - 1, (i ?? -1) + 1));
    if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? n) - 1));
  };

  return (
    <div>
      {series.length > 1 && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {series.map((s) => (
            <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: VIZ.textSecondary }}>
              <span style={{ width: '14px', height: '2px', backgroundColor: s.color, borderRadius: '1px' }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div
        ref={ref}
        style={{ position: 'relative', outline: 'none' }}
        tabIndex={0}
        aria-label="Biểu đồ theo tuần, dùng phím mũi tên trái phải để xem từng tuần"
        onPointerMove={(e) => setActive(pickIndex(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padding.left} x2={width - padding.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? VIZ.baseline : VIZ.grid} strokeWidth={1} />
              <text x={padding.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={VIZ.textSecondary} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {compact(t)}
              </text>
            </g>
          ))}
          {categories.map((c, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={c} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill={VIZ.textSecondary}>
                {c}
              </text>
            ) : null
          )}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={padding.top} y2={padding.top + plotHeight} stroke={VIZ.baseline} strokeWidth={1} />
          )}
          {series.map((s) => {
            const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
            return (
              <g key={s.label}>
                {area && n > 1 && (
                  <polygon
                    points={`${x(0)},${y(0)} ${points} ${x(n - 1)},${y(0)}`}
                    fill={s.color}
                    opacity={0.1}
                  />
                )}
                <polyline points={points} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(n - 1)} cy={y(s.values[n - 1])} r={4} fill={s.color} stroke={VIZ.surface} strokeWidth={2} />
                {showEndLabels && (
                  <text x={x(n - 1) + 8} y={y(s.values[n - 1])} dy="0.32em" fontSize="11" fontWeight="700" fill={VIZ.textPrimary}>
                    {compact(s.values[n - 1])}
                  </text>
                )}
                {active !== null && (
                  <circle cx={x(active)} cy={y(s.values[active])} r={4} fill={s.color} stroke={VIZ.surface} strokeWidth={2} />
                )}
              </g>
            );
          })}
        </svg>
        {active !== null && (
          <div
            style={{
              ...tooltipStyle,
              top: padding.top,
              left: Math.min(x(active) + 12, width - 170),
            }}
          >
            <div style={{ fontWeight: 700, color: VIZ.textPrimary, marginBottom: '4px' }}>Tuần từ {categories[active]}</div>
            {series.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '2px', backgroundColor: s.color }} />
                <strong style={{ color: VIZ.textPrimary }}>{formatValue(s.values[active])}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
