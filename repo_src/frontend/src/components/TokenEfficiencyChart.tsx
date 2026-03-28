import { useRef, useEffect, useState } from 'react';
import { formatUSD } from '../utils/formatting';

export interface ChartPoint {
  tokens: number;
  low: number;  // sum of loss_range_low across all factors
  high: number; // sum of loss_range_high across all factors
  label?: string;      // RF name, e.g. "ERCOT Grid Failure Risk"
  sectionId?: string;  // document section to scroll to on click
  depth?: number;      // analysis depth that produced this point
  summary?: string;    // one-line finding summary
  gaps?: string[];     // top key signals / gaps uncovered
}

const PAD = { top: 12, right: 54, bottom: 40, left: 54 };
const SVG_H = 346;

interface Props {
  liveCurve: ChartPoint[];
  forecastCurve: ChartPoint[];
  threshold: number | null;
  onThresholdChange: (v: number) => void;
  onPointClick?: (sectionId: string) => void;
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return String(v);
}

interface TooltipState {
  point: ChartPoint;
  x: number;
  y: number;
}

export default function TokenEfficiencyChart({
  liveCurve,
  forecastCurve,
  threshold,
  onThresholdChange,
  onPointClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgW, setSvgW] = useState(260);
  const isDragging = useRef(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((e) => setSvgW(e[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const chartW = svgW - PAD.left - PAD.right;
  const chartH = SVG_H - PAD.top - PAD.bottom;

  const maxTokens = Math.max(
    forecastCurve[forecastCurve.length - 1]?.tokens ?? 0,
    liveCurve[liveCurve.length - 1]?.tokens ?? 0,
    10_000_000,
  );
  const maxY = Math.max(liveCurve[0]?.high ?? forecastCurve[0]?.high ?? 1, 1);
  const logMax = Math.log10(Math.max(1, maxTokens));

  // Log X scale
  const toX = (tokens: number) => {
    if (tokens <= 0 || logMax <= 0) return 0;
    return (Math.log10(Math.max(1, tokens)) / logMax) * chartW;
  };
  // Linear Y scale (high value = top = small y)
  const toY = (v: number) => chartH * (1 - v / maxY);

  const xOf = (p: ChartPoint, i: number) => i === 0 ? 0 : toX(p.tokens);

  const highPath = (pts: ChartPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p, i).toFixed(1)},${toY(p.high).toFixed(1)}`).join(' ');

  const lowPath = (pts: ChartPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p, i).toFixed(1)},${toY(p.low).toFixed(1)}`).join(' ');

  // Closed band path: high forward, low backward
  const bandPath = (pts: ChartPoint[]) => {
    if (pts.length === 0) return '';
    const fwd = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p, i).toFixed(1)},${toY(p.high).toFixed(1)}`).join(' ');
    const rev = [...pts].reverse().map((p, i, arr) =>
      `L${(i === arr.length - 1 ? 0 : toX(p.tokens)).toFixed(1)},${toY(p.low).toFixed(1)}`
    ).join(' ');
    return fwd + ' ' + rev + ' Z';
  };

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
    onThresholdChange(Math.max(0, (1 - clampedY / chartH) * maxY));
  };
  const handlePointerUp = () => { isDragging.current = false; };

  const threshY = threshold !== null && threshold !== undefined ? toY(threshold) : null;
  const hasForecast = forecastCurve.length >= 2;
  const hasLive = liveCurve.length >= 2;

  return (
    <div className="tec-wrap" ref={containerRef}>
      <div className="tec-header">
        <span className="tec-title">Exposure Range</span>
        <div className="tec-legend">
          <span className="tec-leg tec-leg--forecast">forecast band</span>
          <span className="tec-leg tec-leg--live">actual band</span>
          <span className="tec-leg tec-leg--reduced">reduced</span>
          <span className="tec-leg tec-leg--neutral">neutral</span>
          <span className="tec-leg tec-leg--increased">increased</span>
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
            const y = toY(f * maxY);
            const isEdge = f === 0 || f === 1;
            return (
              <g key={f}>
                <line x1={0} y1={y} x2={chartW} y2={y}
                  stroke={isEdge ? '#cbd5e1' : '#e8edf3'} strokeWidth={1} />
                {(f === 0 || f === 0.5 || f === 1) && (
                  <text x={-6} y={y + 3.5} fontSize={8.5} textAnchor="end" fill="#94a3b8">
                    {formatUSD(f * maxY)}
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
            Exposure (USD)
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

          {/* D1/D2/D3 depth-tier flags on forecast high waypoints */}
          {forecastCurve.slice(1).map((p, i) => {
            const x = toX(p.tokens);
            const y = toY(p.high);
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={x} y2={chartH}
                  stroke="#94a3b8" strokeWidth={1} strokeDasharray="2,3" opacity={0.5} />
                <rect x={x - 9} y={y - 18} width={18} height={13} rx={3}
                  fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} />
                <text x={x} y={y - 8} fontSize={8} textAnchor="middle" fill="#475569" fontWeight={700}>
                  {`D${i + 1}`}
                </text>
              </g>
            );
          })}

          {/* Forecast band fill */}
          {hasForecast && (
            <path d={bandPath(forecastCurve)} fill="#94a3b8" opacity={0.10} />
          )}

          {/* Forecast high + low curves */}
          {hasForecast && (
            <>
              <path d={highPath(forecastCurve)} fill="none" stroke="#94a3b8"
                strokeWidth={1.5} strokeDasharray="5,3" />
              <path d={lowPath(forecastCurve)} fill="none" stroke="#94a3b8"
                strokeWidth={1} strokeDasharray="5,3" opacity={0.6} />
            </>
          )}

          {/* Live band fill */}
          {hasLive && (
            <path d={bandPath(liveCurve)} fill="var(--color-accent)" opacity={0.12} />
          )}

          {/* Live high + low curves */}
          {hasLive && (
            <>
              <path d={highPath(liveCurve)} fill="none" stroke="var(--color-accent)"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d={lowPath(liveCurve)} fill="none" stroke="var(--color-accent)"
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
            </>
          )}

          {/* Live high dots — interactive */}
          {liveCurve.slice(1).map((p, i) => {
            const hasTooltip = !!(p.label || p.summary);
            const prev = liveCurve[i]; // i+1 in full array, i in slice
            const ratio = prev.high > 0 ? p.high / prev.high : 1;
            const dotColor = ratio < 0.97 ? '#22c55e' : ratio > 1.01 ? '#ef4444' : '#3b82f6';
            return (
              <circle key={`h${i}`}
                cx={toX(p.tokens).toFixed(1)}
                cy={toY(p.high).toFixed(1)}
                r={hasTooltip ? 5 : 4}
                fill={dotColor}
                stroke={hasTooltip ? 'rgba(255,255,255,0.6)' : 'none'}
                strokeWidth={hasTooltip ? 1.5 : 0}
                style={{ cursor: hasTooltip ? (p.sectionId ? 'pointer' : 'default') : 'default' }}
                onMouseEnter={(e) => {
                  if (!hasTooltip) return;
                  const rect = containerRef.current!.getBoundingClientRect();
                  setTooltip({ point: p, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => {
                  if (p.sectionId && onPointClick) { onPointClick(p.sectionId); setTooltip(null); }
                }}
              />
            );
          })}

          {/* Live low dots */}
          {liveCurve.slice(1).map((p, i) => {
            const prev = liveCurve[i];
            const ratio = prev.low > 0 ? p.low / prev.low : 1;
            const dotColor = ratio < 0.97 ? '#22c55e' : ratio > 1.01 ? '#ef4444' : '#3b82f6';
            return (
              <circle key={`l${i}`}
                cx={toX(p.tokens).toFixed(1)}
                cy={toY(p.low).toFixed(1)}
                r={3} fill={dotColor} opacity={0.6}
              />
            );
          })}

          {/* Initial point dots */}
          {liveCurve.length >= 1 && (
            <>
              <circle cx={0} cy={toY(liveCurve[0].high).toFixed(1)} r={3.5} fill="#94a3b8" />
              <circle cx={0} cy={toY(liveCurve[0].low).toFixed(1)} r={2.5} fill="#94a3b8" opacity={0.6} />
            </>
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
      {tooltip && (
        <div
          className="tec-tooltip"
          style={{
            left: Math.min(tooltip.x + 14, svgW - 252),
            top: Math.max(tooltip.y - 90, 4),
          }}
        >
          <div className="tec-tooltip__header">
            <span className="tec-tooltip__name">{tooltip.point.label ?? 'Analysis'}</span>
            {tooltip.point.depth && (
              <span className="tec-tooltip__depth">D{tooltip.point.depth}</span>
            )}
          </div>
          <div className="tec-tooltip__range">
            {formatUSD(tooltip.point.low)} – {formatUSD(tooltip.point.high)}
          </div>
          {tooltip.point.summary && (
            <p className="tec-tooltip__summary">{tooltip.point.summary}</p>
          )}
          {tooltip.point.gaps && tooltip.point.gaps.length > 0 && (
            <ul className="tec-tooltip__gaps">
              {tooltip.point.gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          )}
          {tooltip.point.sectionId && (
            <div className="tec-tooltip__cta">Click to view in report ↓</div>
          )}
        </div>
      )}
    </div>
  );
}
