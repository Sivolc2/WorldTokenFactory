import { useRef, useEffect, useState } from 'react';
import { formatUSD } from '../utils/formatting';

export interface ChartPoint {
  tokens: number;
  uncertainty: number; // total USD (sum of range widths across all factors)
}

const PAD = { top: 12, right: 54, bottom: 40, left: 54 };
const SVG_H = 288;

interface Props {
  liveCurve: ChartPoint[];
  forecastCurve: ChartPoint[];
  threshold: number | null;
  onThresholdChange: (v: number) => void;
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return String(v);
}

export default function TokenEfficiencyChart({
  liveCurve,
  forecastCurve,
  threshold,
  onThresholdChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgW, setSvgW] = useState(260);
  const isDragging = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((e) => setSvgW(e[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const chartW = svgW - PAD.left - PAD.right;
  const chartH = SVG_H - PAD.top - PAD.bottom;

  const maxTokens =
    forecastCurve[forecastCurve.length - 1]?.tokens ??
    liveCurve[liveCurve.length - 1]?.tokens ?? 1;
  const maxUnc = liveCurve[0]?.uncertainty ?? forecastCurve[0]?.uncertainty ?? 1;
  const logMax = Math.log10(Math.max(1, maxTokens));

  // Log X scale
  const toX = (tokens: number) => {
    if (tokens <= 0 || logMax <= 0) return 0;
    return (Math.log10(Math.max(1, tokens)) / logMax) * chartW;
  };
  // Linear Y scale (high unc = top = small y)
  const toY = (unc: number) => chartH * (1 - unc / maxUnc);

  const pathOf = (pts: ChartPoint[]) =>
    pts
      .map((p, i) => {
        const x = i === 0 ? 0 : toX(p.tokens);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(p.uncertainty).toFixed(1)}`;
      })
      .join(' ');

  // Powers of 10 that fall in (0, maxTokens]
  const logTicks: number[] = [];
  for (let p = 2; p <= Math.ceil(logMax); p++) {
    const v = Math.pow(10, p);
    if (v <= maxTokens * 1.05) logTicks.push(v);
  }

  // Y grid lines at 0%, 25%, 50%, 75%, 100%
  const yFractions = [0, 0.25, 0.5, 0.75, 1];

  // Pointer drag for threshold
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawY = e.clientY - rect.top - PAD.top;
    const clampedY = Math.max(0, Math.min(chartH, rawY));
    onThresholdChange(Math.max(0, (1 - clampedY / chartH) * maxUnc));
  };
  const handlePointerUp = () => { isDragging.current = false; };

  const threshY = threshold !== null && threshold !== undefined ? toY(threshold) : null;
  const hasForecast = forecastCurve.length >= 2;
  const hasLive = liveCurve.length >= 2;

  return (
    <div className="tec-wrap" ref={containerRef}>
      <div className="tec-header">
        <span className="tec-title">Token Efficiency</span>
        <div className="tec-legend">
          <span className="tec-leg tec-leg--forecast">forecast</span>
          <span className="tec-leg tec-leg--live">actual</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={svgW}
        height={SVG_H}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ display: 'block' }}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>

          {/* Y grid lines */}
          {yFractions.map((f) => {
            const y = toY(f * maxUnc);
            const isEdge = f === 0 || f === 1;
            return (
              <g key={f}>
                <line x1={0} y1={y} x2={chartW} y2={y}
                  stroke={isEdge ? '#cbd5e1' : '#e8edf3'} strokeWidth={1} />
                {(f === 0 || f === 0.5 || f === 1) && (
                  <text x={-6} y={y + 3.5} fontSize={8.5} textAnchor="end" fill="#94a3b8">
                    {formatUSD(f * maxUnc)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Y axis label (rotated) */}
          <text
            x={-(chartH / 2)}
            y={-PAD.left + 10}
            fontSize={8}
            textAnchor="middle"
            fill="#94a3b8"
            transform="rotate(-90)"
          >
            Uncertainty (USD)
          </text>

          {/* Left axis */}
          <line x1={0} y1={0} x2={0} y2={chartH} stroke="#cbd5e1" strokeWidth={1} />

          {/* Log-scale X tick marks + vertical grid lines */}
          {logTicks.map((v) => {
            const x = toX(v);
            return (
              <g key={v}>
                <line x1={x} y1={0} x2={x} y2={chartH} stroke="#e8edf3" strokeWidth={1} />
                <line x1={x} y1={chartH} x2={x} y2={chartH + 5} stroke="#cbd5e1" strokeWidth={1} />
                <text x={x} y={chartH + 15} fontSize={8.5} textAnchor="middle" fill="#64748b">
                  {fmtTokens(v)}
                </text>
              </g>
            );
          })}

          {/* "log scale →" X-axis annotation */}
          <text x={chartW / 2} y={chartH + 30} fontSize={7.5} textAnchor="middle" fill="#94a3b8"
            fontStyle="italic">
            tokens (log scale)
          </text>

          {/* D1/D2/D3 depth-tier flags on forecast waypoints */}
          {forecastCurve.slice(1).map((p, i) => {
            const x = toX(p.tokens);
            const y = toY(p.uncertainty);
            const label = `D${i + 1}`;
            return (
              <g key={i}>
                {/* Vertical dashed guide from X axis up to forecast point */}
                <line x1={x} y1={y} x2={x} y2={chartH}
                  stroke="#94a3b8" strokeWidth={1} strokeDasharray="2,3" opacity={0.5} />
                {/* Flag badge */}
                <rect x={x - 9} y={y - 18} width={18} height={13} rx={3}
                  fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} />
                <text x={x} y={y - 8} fontSize={8} textAnchor="middle" fill="#475569" fontWeight={700}>
                  {label}
                </text>
              </g>
            );
          })}

          {/* Forecast curve */}
          {hasForecast && (
            <path d={pathOf(forecastCurve)} fill="none" stroke="#94a3b8"
              strokeWidth={1.5} strokeDasharray="5,3" />
          )}

          {/* Shaded fill under live curve */}
          {hasLive && (() => {
            const area =
              liveCurve
                .map((p, i) =>
                  `${i === 0 ? 'M' : 'L'}${(i === 0 ? 0 : toX(p.tokens)).toFixed(1)},${toY(p.uncertainty).toFixed(1)}`
                )
                .join(' ') +
              ` L${toX(liveCurve[liveCurve.length - 1].tokens).toFixed(1)},${chartH} L0,${chartH} Z`;
            return <path d={area} fill="var(--color-accent)" opacity={0.08} />;
          })()}

          {/* Live curve */}
          {hasLive && (
            <path d={pathOf(liveCurve)} fill="none" stroke="var(--color-accent)"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Live measurement dots */}
          {liveCurve.slice(1).map((p, i) => (
            <circle key={i}
              cx={toX(p.tokens).toFixed(1)}
              cy={toY(p.uncertainty).toFixed(1)}
              r={4} fill="var(--color-accent)"
            />
          ))}

          {/* Initial point (before any analysis) */}
          {liveCurve.length >= 1 && (
            <circle cx={0} cy={toY(liveCurve[0].uncertainty).toFixed(1)} r={3.5} fill="#94a3b8" />
          )}

          {/* Threshold line */}
          {threshY !== null && (
            <g>
              <line x1={0} y1={threshY} x2={chartW} y2={threshY}
                stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6,3" opacity={0.85} />
              {/* Invisible wide drag target */}
              <rect x={0} y={threshY - 10} width={chartW} height={20}
                fill="transparent" cursor="ns-resize" onPointerDown={handlePointerDown} />
              {/* Handle dot */}
              <circle cx={chartW / 2} cy={threshY} r={6}
                fill="#ef4444" opacity={0.75} cursor="ns-resize"
                onPointerDown={handlePointerDown} />
              {/* Right-side labels */}
              <text x={chartW + 5} y={threshY - 5} fontSize={7} fill="#ef4444" opacity={0.8}>
                target
              </text>
              <text x={chartW + 5} y={threshY + 6} fontSize={8.5} fill="#ef4444" fontWeight={700}>
                {formatUSD(threshold!)}
              </text>
            </g>
          )}

        </g>
      </svg>
    </div>
  );
}
