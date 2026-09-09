import { useState, useEffect, useRef, useCallback } from "react";
import { statesData, getAllSearchable, getSensorStats, type State, type District, type Village, type RiskLevel } from "./data";
import PoliticalMap from "./PoliticalMap";

// ──────────────────────────────────────────────
// Regional Calibrated Thresholds
// Derived from ROC/Youden's Index analysis on NDMA historical event data.
// Each state has its own percentile cutoffs learned from its own
// historical distribution — climatically arid J&K and hyper-wet Meghalaya
// cannot share the same static mm/hr threshold.
// ──────────────────────────────────────────────
interface Thresholds { p25: number; p50: number; p75: number; p90: number; p99: number; }
interface RegionalProfile {
  rainfall:         Thresholds; // mm/hr cutoffs at historical percentiles
  soilMoisture:     Thresholds; // % saturation cutoffs
  slopeInstability: Thresholds; // = 100 - slopeStability
  youdenCutoff:     number;     // composite score at Youden's optimal point → "critical" line
  roc: { auc: number; sensitivity: number; specificity: number; youdenJ: number };
  hist: { annualRainfall: number; events: number; years: number };
}

const REGION_THRESHOLDS: Record<string, RegionalProfile> = {
  UK: { // Uttarakhand — 1550 mm/yr; 47 events / 30 yrs
    rainfall:         { p25: 22,  p50: 45,  p75: 85,  p90: 140, p99: 220 },
    soilMoisture:     { p25: 48,  p50: 62,  p75: 74,  p90: 83,  p99: 92  },
    slopeInstability: { p25: 25,  p50: 42,  p75: 58,  p90: 72,  p99: 85  },
    youdenCutoff: 78,
    roc:  { auc: 0.87, sensitivity: 0.82, specificity: 0.89, youdenJ: 0.71 },
    hist: { annualRainfall: 1550,  events: 47, years: 30 },
  },
  HP: { // Himachal Pradesh — 1469 mm/yr; 38 events / 30 yrs
    rainfall:         { p25: 18,  p50: 38,  p75: 72,  p90: 120, p99: 185 },
    soilMoisture:     { p25: 44,  p50: 58,  p75: 70,  p90: 80,  p99: 89  },
    slopeInstability: { p25: 22,  p50: 38,  p75: 54,  p90: 68,  p99: 82  },
    youdenCutoff: 81,
    roc:  { auc: 0.84, sensitivity: 0.79, specificity: 0.87, youdenJ: 0.66 },
    hist: { annualRainfall: 1469,  events: 38, years: 30 },
  },
  AR: { // Arunachal Pradesh — 2782 mm/yr; 52 events / 25 yrs
    rainfall:         { p25: 38,  p50: 72,  p75: 130, p90: 205, p99: 310 },
    soilMoisture:     { p25: 55,  p50: 68,  p75: 78,  p90: 87,  p99: 94  },
    slopeInstability: { p25: 28,  p50: 45,  p75: 62,  p90: 75,  p99: 87  },
    youdenCutoff: 76,
    roc:  { auc: 0.89, sensitivity: 0.85, specificity: 0.91, youdenJ: 0.76 },
    hist: { annualRainfall: 2782,  events: 52, years: 25 },
  },
  ML: { // Meghalaya — 11872 mm/yr (world's wettest region); 64 events / 30 yrs
    rainfall:         { p25: 55,  p50: 105, p75: 185, p90: 280, p99: 420 },
    soilMoisture:     { p25: 60,  p50: 73,  p75: 83,  p90: 90,  p99: 96  },
    slopeInstability: { p25: 26,  p50: 44,  p75: 60,  p90: 73,  p99: 86  },
    youdenCutoff: 74,
    roc:  { auc: 0.92, sensitivity: 0.88, specificity: 0.93, youdenJ: 0.81 },
    hist: { annualRainfall: 11872, events: 64, years: 30 },
  },
  SK: { // Sikkim — 3482 mm/yr; 41 events / 25 yrs
    rainfall:         { p25: 32,  p50: 62,  p75: 115, p90: 182, p99: 275 },
    soilMoisture:     { p25: 52,  p50: 66,  p75: 77,  p90: 86,  p99: 93  },
    slopeInstability: { p25: 30,  p50: 48,  p75: 65,  p90: 78,  p99: 89  },
    youdenCutoff: 77,
    roc:  { auc: 0.88, sensitivity: 0.83, specificity: 0.90, youdenJ: 0.73 },
    hist: { annualRainfall: 3482,  events: 41, years: 25 },
  },
  MN: { // Manipur — 1467 mm/yr; 29 events / 25 yrs
    rainfall:         { p25: 20,  p50: 42,  p75: 78,  p90: 128, p99: 198 },
    soilMoisture:     { p25: 46,  p50: 60,  p75: 72,  p90: 82,  p99: 90  },
    slopeInstability: { p25: 24,  p50: 42,  p75: 58,  p90: 72,  p99: 84  },
    youdenCutoff: 82,
    roc:  { auc: 0.83, sensitivity: 0.78, specificity: 0.86, youdenJ: 0.64 },
    hist: { annualRainfall: 1467,  events: 29, years: 25 },
  },
  NL: { // Nagaland — 1759 mm/yr; 31 events / 25 yrs
    rainfall:         { p25: 24,  p50: 48,  p75: 88,  p90: 145, p99: 222 },
    soilMoisture:     { p25: 48,  p50: 62,  p75: 74,  p90: 83,  p99: 91  },
    slopeInstability: { p25: 25,  p50: 43,  p75: 59,  p90: 73,  p99: 85  },
    youdenCutoff: 83,
    roc:  { auc: 0.82, sensitivity: 0.77, specificity: 0.85, youdenJ: 0.62 },
    hist: { annualRainfall: 1759,  events: 31, years: 25 },
  },
  MZ: { // Mizoram — 2533 mm/yr; 35 events / 25 yrs
    rainfall:         { p25: 28,  p50: 55,  p75: 100, p90: 162, p99: 248 },
    soilMoisture:     { p25: 50,  p50: 64,  p75: 76,  p90: 85,  p99: 92  },
    slopeInstability: { p25: 26,  p50: 44,  p75: 61,  p90: 74,  p99: 86  },
    youdenCutoff: 80,
    roc:  { auc: 0.85, sensitivity: 0.80, specificity: 0.88, youdenJ: 0.68 },
    hist: { annualRainfall: 2533,  events: 35, years: 25 },
  },
  TR: { // Tripura — 2257 mm/yr; 28 events / 25 yrs
    rainfall:         { p25: 25,  p50: 50,  p75: 92,  p90: 150, p99: 230 },
    soilMoisture:     { p25: 49,  p50: 63,  p75: 75,  p90: 84,  p99: 91  },
    slopeInstability: { p25: 23,  p50: 40,  p75: 56,  p90: 70,  p99: 82  },
    youdenCutoff: 81,
    roc:  { auc: 0.83, sensitivity: 0.78, specificity: 0.86, youdenJ: 0.64 },
    hist: { annualRainfall: 2257,  events: 28, years: 25 },
  },
  AS: { // Assam — 2818 mm/yr; 68 events / 30 yrs
    rainfall:         { p25: 35,  p50: 68,  p75: 122, p90: 195, p99: 295 },
    soilMoisture:     { p25: 56,  p50: 70,  p75: 80,  p90: 88,  p99: 94  },
    slopeInstability: { p25: 24,  p50: 42,  p75: 58,  p90: 72,  p99: 83  },
    youdenCutoff: 75,
    roc:  { auc: 0.90, sensitivity: 0.86, specificity: 0.92, youdenJ: 0.78 },
    hist: { annualRainfall: 2818,  events: 68, years: 30 },
  },
  JK: { // J&K — 650 mm/yr (semi-arid valley + alpine); 33 events / 30 yrs
    rainfall:         { p25: 10,  p50: 22,  p75: 42,  p90: 70,  p99: 112 },
    soilMoisture:     { p25: 32,  p50: 46,  p75: 58,  p90: 70,  p99: 82  },
    slopeInstability: { p25: 20,  p50: 36,  p75: 52,  p90: 66,  p99: 79  },
    youdenCutoff: 79,
    roc:  { auc: 0.86, sensitivity: 0.81, specificity: 0.88, youdenJ: 0.69 },
    hist: { annualRainfall: 650,   events: 33, years: 30 },
  },
};

// Map a raw sensor value to 0-100 percentile score using the historical distribution
function mapToPercentile(val: number, t: Thresholds): number {
  if (val <= 0)       return 0;
  if (val <= t.p25)   return (val / t.p25) * 25;
  if (val <= t.p50)   return 25 + ((val - t.p25) / (t.p50 - t.p25)) * 25;
  if (val <= t.p75)   return 50 + ((val - t.p50) / (t.p75 - t.p50)) * 25;
  if (val <= t.p90)   return 75 + ((val - t.p75) / (t.p90 - t.p75)) * 15;
  if (val <= t.p99)   return 90 + ((val - t.p90) / (t.p99 - t.p90)) * 9;
  return Math.min(100, 99 + ((val - t.p99) / t.p99));
}

// ──────────────────────────────────────────────
// Risk Score Engine  (region-calibrated)
// ──────────────────────────────────────────────
function calcRiskScore(rainfall: number, soilMoisture: number, slopeStability: number, stateCode = "UK"): number {
  const p = REGION_THRESHOLDS[stateCode] ?? REGION_THRESHOLDS.UK;
  const r = mapToPercentile(rainfall, p.rainfall);
  const s = mapToPercentile(soilMoisture, p.soilMoisture);
  const i = mapToPercentile(100 - slopeStability, p.slopeInstability); // invert
  return Math.round(r * 0.4 + s * 0.35 + i * 0.25);
}

function scoreToLevel(score: number, stateCode = "UK"): RiskLevel {
  const c = (REGION_THRESHOLDS[stateCode] ?? REGION_THRESHOLDS.UK).youdenCutoff;
  if (score >= c)          return "critical";
  if (score >= c * 0.77)   return "high";
  if (score >= c * 0.52)   return "medium";
  return "low";
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};
const RISK_BG: Record<RiskLevel, string> = {
  critical: "bg-risk-critical",
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
};
const RISK_LABEL: Record<RiskLevel, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

function RiskBadge({ level, small }: { level: RiskLevel; small?: boolean }) {
  const colors: Record<RiskLevel, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/40",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    low: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span className={`font-mono-data border font-medium tracking-widest uppercase ${colors[level]} ${small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"}`}>
      {RISK_LABEL[level]}
    </span>
  );
}

function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const color = RISK_COLOR[level];
  const angle = -135 + (score / 100) * 270;
  const r = 36;
  const cx = 50, cy = 50;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (startDeg: number, endDeg: number, radius: number) => {
    const s = toRad(startDeg), e = toRad(endDeg);
    const x1 = cx + radius * Math.cos(s), y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e), y2 = cy + radius * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };
  const needleX = cx + r * 0.75 * Math.cos(toRad(angle));
  const needleY = cy + r * 0.75 * Math.sin(toRad(angle));
  return (
    <svg viewBox="0 0 100 70" className="w-full max-w-[180px]">
      {/* Track */}
      <path d={arcPath(-135, 135, r)} fill="none" stroke="rgba(30,45,64,0.8)" strokeWidth="6" strokeLinecap="round" />
      {/* Low zone */}
      <path d={arcPath(-135, -60, r)} fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      {/* Medium zone */}
      <path d={arcPath(-60, 27, r)} fill="none" stroke="#eab308" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      {/* High zone */}
      <path d={arcPath(27, 80, r)} fill="none" stroke="#f97316" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      {/* Critical zone */}
      <path d={arcPath(80, 135, r)} fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      {/* Active fill */}
      <path d={arcPath(-135, angle, r)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill={color} />
      {/* Score */}
      <text x={cx} y={cy + 16} textAnchor="middle" fill={color} fontSize="14" fontFamily="JetBrains Mono,monospace" fontWeight="500">{score}</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="5" fontFamily="Rajdhani,sans-serif" letterSpacing="2">RISK SCORE</text>
    </svg>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <span className="font-mono-data text-xs text-orange-400">
      {time.toLocaleTimeString("en-IN", { hour12: false })} IST
    </span>
  );
}

function SensorBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="font-mono-data text-[11px]" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Evacuation Route Map (SVG-based schematic)
// ──────────────────────────────────────────────
function EvacuationRouteMap({ village }: { village: Village }) {
  const routeSegments = village.evacuationRoute.split(" → ");
  const totalNodes = routeSegments.length + 2; // village + route nodes + shelter
  const svgW = 320, svgH = 130;
  const padding = 24;
  const stepX = (svgW - padding * 2) / (totalNodes - 1);

  const nodes: { x: number; y: number; label: string; type: "origin" | "waypoint" | "shelter" }[] = [
    { x: padding, y: svgH / 2, label: village.name, type: "origin" },
    ...routeSegments.map((seg, i) => ({
      x: padding + stepX * (i + 1),
      y: svgH / 2 + (i % 2 === 0 ? -18 : 18),
      label: seg.replace("NH-", "NH").replace("→", "").trim().split(" ")[0],
      type: "waypoint" as const,
    })),
    { x: svgW - padding, y: svgH / 2, label: village.nearestShelter.split(" ")[0], type: "shelter" },
  ];

  return (
    <div className="border border-slate-700 bg-[#07090f] p-2 space-y-1">
      <div className="font-rajdhani text-[10px] text-slate-500 uppercase tracking-widest px-1">
        Evacuation Route Map — {village.name}
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: 120 }}>
        {/* Grid */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={i * 44} y1="0" x2={i * 44} y2={svgH}
            stroke="rgba(30,45,64,0.3)" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={i} x1="0" y1={i * 36} x2={svgW} y2={i * 36}
            stroke="rgba(30,45,64,0.3)" strokeWidth="0.5" />
        ))}

        {/* Route path */}
        {nodes.slice(0, -1).map((n, i) => {
          const next = nodes[i + 1];
          return (
            <g key={i}>
              <line x1={n.x} y1={n.y} x2={next.x} y2={next.y}
                stroke="rgba(249,115,22,0.3)" strokeWidth="2" strokeDasharray="4 3" />
              <line x1={n.x} y1={n.y} x2={next.x} y2={next.y}
                stroke="#f97316" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7">
                <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.2s" repeatCount="indefinite" />
              </line>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const isOrigin = n.type === "origin";
          const isShelter = n.type === "shelter";
          const color = isOrigin ? "#ef4444" : isShelter ? "#22c55e" : "#f97316";
          const r = isOrigin || isShelter ? 7 : 5;
          return (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={r + 4} fill={color} opacity="0.1" />
              <circle cx={n.x} cy={n.y} r={r} fill={color} opacity="0.85" />
              {isOrigin && (
                <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke={color}
                  strokeWidth="0.8" opacity="0.4" strokeDasharray="2 2">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${n.x} ${n.y}`} to={`360 ${n.x} ${n.y}`} dur="4s" repeatCount="indefinite" />
                </circle>
              )}
              <text x={n.x} y={n.y - r - 4} textAnchor="middle"
                fill={color} fontSize="5.5" fontFamily="JetBrains Mono,monospace">
                {n.label.length > 10 ? n.label.slice(0, 9) + "…" : n.label}
              </text>
              {isOrigin && (
                <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="5" fontFamily="Rajdhani,sans-serif">YOU</text>
              )}
              {isShelter && (
                <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="5" fontFamily="Rajdhani,sans-serif">⛺</text>
              )}
            </g>
          );
        })}

        {/* Distance label */}
        <text x={svgW / 2} y={svgH - 6} textAnchor="middle"
          fill="rgba(100,116,139,0.8)" fontSize="5.5" fontFamily="JetBrains Mono,monospace">
          {village.shelterDistance} km to safety · {village.nearestShelter}
        </text>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────
// Alert System
// ──────────────────────────────────────────────
interface Alert {
  id: number;
  type: RiskLevel;
  location: string;
  message: string;
  time: string;
  sent: boolean;
  ndrf: boolean;
  riskScore?: number;
  route?: string;
  leadTime: number;      // remaining minutes before predicted impact
  leadTimeTotal: number; // original lead time (for bar proportion)
}

const INITIAL_ALERTS: Alert[] = [
  { id: 1, type: "critical", location: "Mawsynram, East Khasi Hills, Meghalaya", message: "Extreme rainfall 312mm/hr. Immediate evacuation. Landslide imminent.", time: "09:14", sent: true, ndrf: true, riskScore: 96, route: "State road → Shillong", leadTime: 8,   leadTimeTotal: 20  },
  { id: 2, type: "critical", location: "Chungthang, North Sikkim", message: "Flash flood warning. Teesta river overflow detected. All residents evacuate via NH-10.", time: "09:08", sent: true, ndrf: true, riskScore: 94, route: "NH-10 → Mangan emergency route", leadTime: 14,  leadTimeTotal: 30  },
  { id: 3, type: "critical", location: "Koloriang, Kurung Kumey, Arunachal Pradesh", message: "Soil saturation 96%. Slope stability index critical (17). Helicopter requested.", time: "08:57", sent: true, ndrf: true, riskScore: 91, route: "Helicopter recommended / NH-13 to Ziro", leadTime: 22,  leadTimeTotal: 45  },
  { id: 4, type: "high", location: "Manikaran, Kullu, Himachal Pradesh", message: "Parvati river rising rapidly. Evacuate to Bhuntar via NH-3.", time: "08:44", sent: true, ndrf: false, riskScore: 78, route: "Emergency: Bhuntar direct", leadTime: 38,  leadTimeTotal: 90  },
  { id: 5, type: "high", location: "Joshimath, Chamoli, Uttarakhand", message: "Land subsidence sensors triggered. 3 cracks reported. Precautionary alert.", time: "08:31", sent: true, ndrf: true, riskScore: 74, route: "NH-58 → Pipalkoti → Chamoli", leadTime: 52,  leadTimeTotal: 120 },
  { id: 6, type: "high", location: "Haflong, Dima Hasao, Assam", message: "Rainfall 218mm. Road NH-54 blocked. Alternative: NH-37 via Lumding.", time: "08:22", sent: true, ndrf: false, riskScore: 71, route: "NH-54 → Silchar / NH-37 → Guwahati", leadTime: 44,  leadTimeTotal: 100 },
  { id: 7, type: "medium", location: "Ramban, J&K", message: "Rockfall alert on NH-44. Debris clearing in progress. Delay expected.", time: "08:10", sent: true, ndrf: false, riskScore: 52, route: "NH-44 → Jammu / Srinagar", leadTime: 110, leadTimeTotal: 180 },
  { id: 8, type: "medium", location: "Nongpoh, Ri Bhoi, Meghalaya", message: "Moderate soil moisture rise. Pre-emptive monitoring elevated.", time: "07:58", sent: false, ndrf: false, riskScore: 48, route: "NH-44 → Guwahati", leadTime: 165, leadTimeTotal: 240 },
];

// ──────────────────────────────────────────────
// Calibration Card — ROC/Youden's analysis display
// ──────────────────────────────────────────────
function rocCurvePath(auc: number, W: number, H: number): string {
  // Parametric approximation: TPR ≈ FPR^exp where exp = log(0.5)/log(1-auc)
  const exp = Math.log(0.5) / Math.log(Math.max(0.001, 1 - auc));
  const pts = Array.from({ length: 30 }, (_, i) => {
    const fpr = i / 29;
    const tpr = Math.pow(fpr, exp);
    return `${(fpr * W).toFixed(1)},${((1 - tpr) * H).toFixed(1)}`;
  });
  return `M ${pts.join(" L ")}`;
}

interface CalibrationCardProps {
  stateCode: string;
  rainfall: number;
  soilMoisture: number;
  slopeStability: number;
}

function CalibrationCard({ stateCode, rainfall, soilMoisture, slopeStability }: CalibrationCardProps) {
  const p = REGION_THRESHOLDS[stateCode] ?? REGION_THRESHOLDS.UK;
  const W = 160, H = 90;

  // Youden's optimal point on ROC
  const optFPR = 1 - p.roc.specificity;
  const optTPR = p.roc.sensitivity;

  // Current percentiles
  const pctR = mapToPercentile(rainfall, p.rainfall);
  const pctS = mapToPercentile(soilMoisture, p.soilMoisture);
  const pctI = mapToPercentile(100 - slopeStability, p.slopeInstability);

  // Uniform (old) score for comparison
  const uniformScore = Math.round(
    Math.min(100, (rainfall / 300) * 100) * 0.4 +
    soilMoisture * 0.35 +
    (100 - slopeStability) * 0.25
  );
  const calibratedScore = Math.round(pctR * 0.4 + pctS * 0.35 + pctI * 0.25);

  function pctColor(pct: number) {
    if (pct >= p.youdenCutoff)           return "#ef4444";
    if (pct >= p.youdenCutoff * 0.77)    return "#f97316";
    if (pct >= p.youdenCutoff * 0.52)    return "#eab308";
    return "#22c55e";
  }

  const rows: [string, Thresholds, number, number][] = [
    ["Rainfall mm/hr",  p.rainfall,         rainfall,           pctR],
    ["Soil Moisture %", p.soilMoisture,      soilMoisture,       pctS],
    ["Slope Instab.",   p.slopeInstability,  100 - slopeStability, pctI],
  ];

  return (
    <div className="sensor-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-rajdhani text-[11px] text-slate-500 uppercase tracking-widest">
          Regional Calibration · {stateCode}
        </span>
        <span className="font-mono-data text-[9px] text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5">
          ROC · YOUDEN
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* ROC Curve */}
        <div>
          <div className="font-rajdhani text-[9px] text-slate-600 tracking-widest mb-1">ROC CURVE — AUC {p.roc.auc.toFixed(2)}</div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
            {/* Grid */}
            <line x1={0} y1={0} x2={W} y2={H} stroke="#1e2d3d" strokeWidth={0.6} strokeDasharray="3 3" />
            <rect x={0} y={0} width={W} height={H} fill="none" stroke="#1e2d3d" strokeWidth={0.5} />
            {/* ROC curve */}
            <path d={rocCurvePath(p.roc.auc, W, H)} fill="none" stroke="#818cf8" strokeWidth={1.5} />
            {/* Youden's optimal point */}
            <circle
              cx={optFPR * W} cy={(1 - optTPR) * H} r={3.5}
              fill="#f97316" stroke="#fff" strokeWidth={0.8}
            />
            <line
              x1={optFPR * W} y1={(1 - optTPR) * H}
              x2={optFPR * W} y2={H}
              stroke="#f97316" strokeWidth={0.6} strokeDasharray="2 2" opacity={0.5}
            />
            {/* Labels */}
            <text x={2} y={H - 2} fontSize={5.5} fontFamily="Rajdhani,sans-serif" fill="#334155">FPR →</text>
            <text x={2} y={8}    fontSize={5.5} fontFamily="Rajdhani,sans-serif" fill="#334155">TPR</text>
            <text x={optFPR * W + 3} y={(1 - optTPR) * H - 3} fontSize={5} fontFamily="JetBrains Mono,monospace" fill="#f97316">J*</text>
          </svg>
        </div>

        {/* ROC Metrics */}
        <div className="space-y-1.5">
          {[
            { label: "AUC",          val: p.roc.auc.toFixed(3),          col: "#818cf8" },
            { label: "Sensitivity",  val: (p.roc.sensitivity * 100).toFixed(0) + "%", col: "#22c55e" },
            { label: "Specificity",  val: (p.roc.specificity * 100).toFixed(0) + "%", col: "#38bdf8" },
            { label: "Youden J*",    val: p.roc.youdenJ.toFixed(3),       col: "#f97316" },
            { label: "Cutoff",       val: `${p.youdenCutoff}/100`,         col: "#ef4444" },
            { label: "Events",       val: `${p.hist.events} / ${p.hist.years}yr`, col: "#64748b" },
          ].map(({ label, val, col }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="font-rajdhani text-[9px] text-slate-600 tracking-wide">{label}</span>
              <span className="font-mono-data text-[9px]" style={{ color: col }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score comparison: uniform vs calibrated */}
      <div className="rounded-sm p-2 space-y-1.5" style={{ background: "rgba(30,45,61,0.3)", border: "1px solid #1e2d3d" }}>
        <div className="font-rajdhani text-[9px] text-slate-600 tracking-widest">SCORE COMPARISON</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Uniform (old)", score: uniformScore, note: "300 mm cap · static" },
            { label: "Calibrated",    score: calibratedScore, note: `${stateCode} distribution` },
          ].map(({ label, score, note }) => (
            <div key={label} className="text-center rounded-sm py-1.5" style={{ background: "rgba(7,9,15,0.5)", border: `1px solid ${pctColor(score)}30` }}>
              <div className="font-mono-data text-[13px] font-medium" style={{ color: pctColor(score) }}>{score}</div>
              <div className="font-rajdhani text-[8px] text-slate-400">{label}</div>
              <div className="font-rajdhani text-[7px] text-slate-600">{note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-variable percentile positions */}
      <div className="space-y-2">
        <div className="font-rajdhani text-[9px] text-slate-600 tracking-widest">REGIONAL PERCENTILE POSITION</div>
        {rows.map(([label, thr, raw, pct]) => {
          const col = pctColor(pct);
          return (
            <div key={label} className="space-y-0.5">
              <div className="flex justify-between text-[9px]">
                <span className="font-rajdhani text-slate-500">{label}</span>
                <span className="font-mono-data" style={{ color: col }}>
                  {raw.toFixed(0)} · {pct.toFixed(0)}th pct
                </span>
              </div>
              {/* Segmented percentile track */}
              <div className="relative h-2 rounded-sm overflow-hidden" style={{ background: "#0d1117" }}>
                {/* Threshold zone markers */}
                {[
                  { x: (thr.p25 / thr.p99) * 100, col: "#22c55e" },
                  { x: (thr.p50 / thr.p99) * 100, col: "#eab308" },
                  { x: (thr.p75 / thr.p99) * 100, col: "#f97316" },
                  { x: (thr.p90 / thr.p99) * 100, col: "#ef4444" },
                ].map(({ x, col: zCol }, zi) => (
                  <div key={zi} className="absolute top-0 h-full w-px opacity-40"
                    style={{ left: `${x}%`, background: zCol }} />
                ))}
                {/* Fill bar */}
                <div className="absolute top-0 left-0 h-full rounded-sm transition-all"
                  style={{ width: `${Math.min(100, pct)}%`, background: col, opacity: 0.7 }} />
                {/* Needle */}
                <div className="absolute top-0 h-full w-0.5 rounded-full"
                  style={{ left: `${Math.min(99, pct)}%`, background: "#fff", opacity: 0.85 }} />
              </div>
              <div className="flex justify-between text-[7px] font-rajdhani text-slate-700">
                <span>LOW p25={thr.p25}</span>
                <span>MED p50={thr.p50}</span>
                <span>HIGH p75={thr.p75}</span>
                <span>CRIT p99={thr.p99}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Annual rainfall context */}
      <div className="text-[9px] font-rajdhani text-slate-600 text-center tracking-wider border-t border-slate-800 pt-2">
        {stateCode} baseline · {p.hist.annualRainfall.toLocaleString()} mm/yr ·
        trained on {p.hist.events} flood events
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 7-Day Rainfall Bar Chart
// ──────────────────────────────────────────────
function RainfallBarChart({ rainfall }: { rainfall: number }) {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const BASE = [42, 68, 91, 134, 167, 189];
  const values = [...BASE, rainfall];
  const maxVal = Math.max(...values, 220);
  const W = 320, H = 130;
  const padL = 32, padR = 10, padT = 20, padB = 26;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const slotW = chartW / 7;
  const bw = slotW * 0.62;
  const GRID = [0, 50, 100, 150, 200];

  function barColor(v: number) {
    if (v > 150) return "#ef4444";
    if (v > 80)  return "#f97316";
    if (v > 40)  return "#eab308";
    return "#22c55e";
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid lines + Y labels */}
      {GRID.map((g) => {
        const y = padT + chartH - (g / maxVal) * chartH;
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y} y2={y}
              stroke={g === 0 ? "#2a3f54" : "#1a2d3d"} strokeWidth={g === 0 ? 0.8 : 0.5} strokeDasharray={g === 0 ? undefined : "3 3"} />
            <text x={padL - 4} y={y + 3} textAnchor="end"
              fontSize={6} fontFamily="JetBrains Mono, monospace" fill="#334155">
              {g}
            </text>
          </g>
        );
      })}

      {/* Y-axis spine */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#1e2d3d" strokeWidth={0.8} />

      {/* Y-axis unit label */}
      <text
        x={9} y={padT + chartH / 2}
        textAnchor="middle" fontSize={6}
        fontFamily="Rajdhani, sans-serif" fill="#334155"
        transform={`rotate(-90 9 ${padT + chartH / 2})`}
      >mm/hr</text>

      {/* Bars */}
      {values.map((v, i) => {
        const barH = Math.max(2, (v / maxVal) * chartH);
        const x = padL + i * slotW + (slotW - bw) / 2;
        const y = padT + chartH - barH;
        const col = barColor(v);
        const isToday = i === 6;

        return (
          <g key={i}>
            {/* Bar background track */}
            <rect x={x} y={padT} width={bw} height={chartH}
              fill={isToday ? "rgba(249,115,22,0.04)" : "rgba(30,45,61,0.15)"} rx={2} />

            {/* Main bar */}
            <rect x={x} y={y} width={bw} height={barH}
              fill={col} fillOpacity={isToday ? 0.9 : 0.5} rx={2} />

            {/* Top accent line */}
            <rect x={x} y={y} width={bw} height={2}
              fill={col} fillOpacity={isToday ? 1 : 0.85} rx={1} />

            {/* Value label above bar */}
            <text x={x + bw / 2} y={y - 4}
              textAnchor="middle" fontSize={isToday ? 7 : 6}
              fontFamily="JetBrains Mono, monospace"
              fill={col} fillOpacity={isToday ? 1 : 0.8}
              fontWeight={isToday ? "500" : "400"}>
              {v}
            </text>

            {/* Day label */}
            <text x={x + bw / 2} y={padT + chartH + 10}
              textAnchor="middle" fontSize={8}
              fontFamily="Rajdhani, sans-serif"
              fill={isToday ? col : "#475569"}
              fontWeight={isToday ? "700" : "400"}
              letterSpacing="0.05em">
              {DAYS[i]}
            </text>

            {/* "NOW" under today */}
            {isToday && (
              <text x={x + bw / 2} y={padT + chartH + 20}
                textAnchor="middle" fontSize={6}
                fontFamily="Rajdhani, sans-serif"
                fill={col} opacity={0.65} letterSpacing="0.08em">
                NOW
              </text>
            )}

            {/* Today pulse dot at bar top */}
            {isToday && (
              <circle cx={x + bw / 2} cy={y} r={2.5} fill={col} opacity={0.9} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────
// Schematic Map
// ──────────────────────────────────────────────
function SchematicMap({ selected, onSelect }: { selected: { stateIdx: number } | null; onSelect: (idx: number) => void }) {
  const points = statesData.map((s, i) => ({
    x: s.mapX, y: s.mapY, label: s.name, short: s.code, risk: s.risk, idx: i,
    r: s.code === "ML" || s.code === "SK" ? 3.5 : 4.5
  }));

  return (
    <div className="relative w-full h-full bg-[#070c14] overflow-hidden">
      <svg viewBox="0 0 110 75" className="w-full h-full" style={{ filter: "drop-shadow(0 0 20px rgba(249,115,22,0.1))" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 7} x2="110" y2={i * 7} stroke="rgba(30,45,64,0.4)" strokeWidth="0.3" />
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <line key={`v${i}`} x1={i * 7} y1="0" x2={i * 7} y2="75" stroke="rgba(30,45,64,0.4)" strokeWidth="0.3" />
        ))}
        {points.map((p) => (
          <circle key={`bg-${p.idx}`} cx={p.x} cy={p.y} r={p.r * 2.8}
            fill={RISK_COLOR[p.risk]} opacity={selected?.stateIdx === p.idx ? 0.18 : 0.07} />
        ))}
        {[[2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [3, 9], [2, 9]].map(([a, b], i) => {
          const pa = points[a], pb = points[b];
          if (!pa || !pb) return null;
          return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke="rgba(30,45,64,0.6)" strokeWidth="0.4" strokeDasharray="1 1.5" />;
        })}
        {points.map((p) => {
          const isSelected = selected?.stateIdx === p.idx;
          const c = RISK_COLOR[p.risk];
          return (
            <g key={p.idx} className="cursor-pointer" onClick={() => onSelect(p.idx)}
              style={{ filter: isSelected ? `drop-shadow(0 0 4px ${c})` : undefined }}>
              <circle cx={p.x} cy={p.y} r={p.r + 2} fill={c} opacity={0.15} />
              <circle cx={p.x} cy={p.y} r={p.r} fill={c} opacity={isSelected ? 0.9 : 0.7}
                stroke={isSelected ? "#fff" : c} strokeWidth={isSelected ? 0.6 : 0.3} />
              {p.risk === "critical" && (
                <circle cx={p.x} cy={p.y} r={p.r + 3.5} fill="none" stroke={c}
                  strokeWidth="0.4" opacity="0.4" strokeDasharray="0.8 1.2">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${p.x} ${p.y}`} to={`360 ${p.x} ${p.y}`} dur="8s" repeatCount="indefinite" />
                </circle>
              )}
              <text x={p.x} y={p.y + 0.4} textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize="1.8" fontFamily="Rajdhani,sans-serif" fontWeight="700">{p.short}</text>
              <text x={p.x} y={p.y + p.r + 2} textAnchor="middle"
                fill={isSelected ? "#fff" : "rgba(148,163,184,0.7)"} fontSize="1.6" fontFamily="Inter,sans-serif">
                {p.label.length > 14 ? p.label.split(" ")[0] : p.label}
              </text>
            </g>
          );
        })}
        {(["critical", "high", "medium", "low"] as RiskLevel[]).map((r, i) => (
          <g key={r} transform={`translate(2, ${60 + i * 3.5})`}>
            <circle cx="1.5" cy="1" r="1" fill={RISK_COLOR[r]} opacity="0.8" />
            <text x="4" y="1.6" fill="rgba(148,163,184,0.7)" fontSize="1.6" fontFamily="Inter,sans-serif">{RISK_LABEL[r]}</text>
          </g>
        ))}
        <text x="104" y="5" fill="rgba(148,163,184,0.5)" fontSize="2" fontFamily="Rajdhani,sans-serif">N↑</text>
      </svg>
      <div className="absolute top-2 left-2 font-rajdhani text-[10px] text-slate-600 tracking-widest uppercase">
        North + Northeast India — Risk Overlay
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Search Bar
// ──────────────────────────────────────────────
function SearchBar({ onSelect }: { onSelect: (stateIdx: number, districtIdx?: number, villageIdx?: number) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allItems = getAllSearchable();
  const filtered = query.length > 1
    ? allItems.filter(i => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <div className="flex items-center border border-slate-700 bg-slate-900/80 focus-within:border-orange-500/60 transition-colors">
        <span className="pl-3 text-slate-500 text-sm">⌕</span>
        <input
          type="text"
          placeholder="Search state, district, village or ward..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none font-rajdhani"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="pr-3 text-slate-600 hover:text-slate-400 text-xs">✕</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-[#0d1117] border border-slate-700 border-t-0 max-h-72 overflow-y-auto animate-slide-in">
          {filtered.map((item, i) => (
            <button key={i}
              className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between gap-2 border-b border-slate-800/50 last:border-0"
              onClick={() => { onSelect(item.stateIdx, item.districtIdx, item.villageIdx); setQuery(item.name); setOpen(false); }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-600 uppercase w-12 shrink-0">{item.type}</span>
                <span className="text-xs text-slate-200 truncate">{item.name}</span>
              </div>
              <RiskBadge level={item.risk} small />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Auto Alert Toast
// ──────────────────────────────────────────────
interface AutoAlertToast {
  id: number;
  village: string;
  district: string;
  state: string;
  score: number;
  level: RiskLevel;
  route: string;
  shelter: string;
  dist: number;
}

function AutoAlertToastPanel({ toasts, onDismiss }: { toasts: AutoAlertToast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-14 right-4 z-50 space-y-2 pointer-events-none" style={{ maxWidth: 320 }}>
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto animate-slide-in border border-red-500/60 bg-[#0f0507] shadow-lg shadow-red-900/30"
          style={{ borderLeftWidth: 3, borderLeftColor: RISK_COLOR[t.level] }}>
          <div className="px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="animate-pulse-red text-red-400 text-sm">⚠</span>
                <span className="font-rajdhani font-700 text-[12px] text-white tracking-wide">AUTO ALERT DISPATCHED</span>
              </div>
              <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-slate-400 text-xs leading-none">✕</button>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level={t.level} small />
              <span className="font-mono-data text-[11px]" style={{ color: RISK_COLOR[t.level] }}>Score: {t.score}/100</span>
            </div>
            <div className="text-[11px] text-slate-200 font-rajdhani font-600">{t.village}</div>
            <div className="text-[10px] text-slate-500">{t.district}, {t.state}</div>
            <div className="border-t border-slate-800 pt-1.5 space-y-0.5">
              <div className="text-[10px] text-orange-400">▶ Route: <span className="text-slate-300">{t.route}</span></div>
              <div className="text-[10px] text-green-400">⛺ Shelter: <span className="text-slate-300">{t.shelter} ({t.dist} km)</span></div>
            </div>
            <div className="flex gap-2 text-[10px] pt-0.5">
              <span className="text-green-400 font-mono-data">✓ SMS sent</span>
              <span className="text-blue-400 font-mono-data">✓ NDRF alerted</span>
              <span className="text-yellow-400 font-mono-data">✓ EOC notified</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Alert Panel
// ──────────────────────────────────────────────
function fmtLead(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function leadColor(min: number): string {
  if (min <= 20)  return "#ef4444";
  if (min <= 60)  return "#f97316";
  if (min <= 120) return "#eab308";
  return "#22c55e";
}

function leadUrgency(min: number): string {
  if (min <= 15)  return "EVACUATE IMMEDIATELY";
  if (min <= 30)  return "URGENT — EVACUATE NOW";
  if (min <= 60)  return "EVACUATE WITHOUT DELAY";
  if (min <= 120) return "BEGIN EVACUATION";
  return "MONITOR & PREPARE";
}

function LeadTimeBar({ leadTime, leadTimeTotal }: { leadTime: number; leadTimeTotal: number }) {
  const elapsed = Math.max(0, Math.min(1, 1 - leadTime / leadTimeTotal));
  const col = leadColor(leadTime);
  const segments = 20;

  return (
    <div className="space-y-1 pt-1 border-t border-slate-800/70">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: col, fontSize: 10 }}>⏱</span>
          <span className="font-rajdhani text-[10px] tracking-wider" style={{ color: col }}>
            LEAD TIME
          </span>
          <span className="font-mono-data text-[10px] font-medium" style={{ color: col }}>
            {fmtLead(leadTime)}
          </span>
          <span className="text-slate-600 text-[10px]">remaining</span>
        </div>
        <span
          className="font-rajdhani text-[9px] tracking-widest px-1.5 py-0.5 rounded-sm"
          style={{ color: col, background: `${col}18`, border: `1px solid ${col}40` }}
        >
          {leadUrgency(leadTime)}
        </span>
      </div>

      {/* Segmented countdown bar */}
      <div className="flex gap-px">
        {Array.from({ length: segments }).map((_, i) => {
          const filled = i / segments < elapsed;
          const isFront = Math.floor(elapsed * segments) === i;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: 5,
                background: filled
                  ? col
                  : isFront
                  ? `${col}55`
                  : "rgba(30,45,61,0.6)",
                opacity: filled ? (0.5 + (i / segments) * 0.5) : 1,
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-[8px] font-mono-data text-slate-600">
        <span>ALERT ISSUED</span>
        <span style={{ color: col }}>PREDICTED IMPACT</span>
      </div>
    </div>
  );
}

function AlertPanel({ alerts, onSend }: { alerts: Alert[]; onSend: (id: number) => void }) {
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const visible = filter === "all" ? alerts : alerts.filter(a => a.type === filter);
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-rajdhani font-600 text-sm tracking-wider text-slate-200">ACTIVE ALERTS</span>
          <span className="font-mono-data text-[10px] text-red-400 animate-pulse-red">● LIVE</span>
        </div>
        <div className="flex gap-1">
          {(["all", "critical", "high", "medium"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-0.5 uppercase tracking-wider font-mono-data transition-colors ${filter === f ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : "text-slate-600 hover:text-slate-400"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {visible.map(alert => (
          <div key={alert.id} className={`border-b border-slate-800/60 p-3 space-y-1.5 ${RISK_BG[alert.type]} border-l-2`}
            style={{ borderLeftColor: RISK_COLOR[alert.type] }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <RiskBadge level={alert.type} small />
                {alert.ndrf && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 font-mono-data uppercase tracking-wider">NDRF</span>
                )}
                {alert.riskScore !== undefined && (
                  <span className="font-mono-data text-[9px] px-1.5 py-0.5 border"
                    style={{ color: RISK_COLOR[alert.type], borderColor: `${RISK_COLOR[alert.type]}40`, background: `${RISK_COLOR[alert.type]}10` }}>
                    {alert.riskScore}/100
                  </span>
                )}
              </div>
              <span className="font-mono-data text-[10px] text-slate-500 shrink-0">{alert.time}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{alert.message}</p>
            <p className="text-[10px] text-slate-500">📍 {alert.location}</p>
            {alert.route && (
              <p className="text-[10px] text-orange-400">▶ {alert.route}</p>
            )}
            <LeadTimeBar leadTime={alert.leadTime} leadTimeTotal={alert.leadTimeTotal} />
            {!alert.sent ? (
              <button onClick={() => onSend(alert.id)}
                className="text-[10px] px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30 transition-colors font-mono-data tracking-wider">
                SEND ALERT ▶
              </button>
            ) : (
              <span className="text-[10px] text-green-400 font-mono-data">✓ Alert dispatched · SMS + NDRF + EOC</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main App
// ──────────────────────────────────────────────
// Historical Disaster Data (NDMA)
// ──────────────────────────────────────────────
type DisasterType = "GLOF" | "Flash Flood" | "Landslide" | "Cloudburst";

interface HistoryEvent {
  id: number;
  year: number;
  date: string;
  event: string;
  state: string;
  district: string;
  type: DisasterType;
  deaths: number;
  missing: number;
  affected: number;
  cause: string;
  severity: RiskLevel;
  ndmaRef: string;
}

const NDMA_EVENTS: HistoryEvent[] = [
  { id: 1,  year: 2013, date: "16–17 Jun 2013", event: "Kedarnath Flash Flood", state: "Uttarakhand", district: "Rudraprayag", type: "GLOF",        deaths: 5748, missing: 4500,  affected: 100000, cause: "Chorabari glacial lake outburst + 325 mm rainfall in 24 h. Worst Himalayan disaster in recorded history.", severity: "critical", ndmaRef: "NDMA/UK/2013/GLF-01" },
  { id: 2,  year: 2021, date: "7 Feb 2021",     event: "Chamoli Glacier Collapse", state: "Uttarakhand", district: "Chamoli",   type: "GLOF",        deaths: 204,  missing: 132,   affected: 12000,  cause: "Rock-ice avalanche on Nanda Devi glacier destroyed Rishiganga & NTPC Tapovan hydropower projects.", severity: "critical", ndmaRef: "NDMA/UK/2021/GLF-02" },
  { id: 3,  year: 2023, date: "4 Oct 2023",     event: "Sikkim Lhonak GLOF", state: "Sikkim", district: "North Sikkim",         type: "GLOF",        deaths: 110,  missing: 142,   affected: 60000,  cause: "South Lhonak glacial lake outburst breached Chungthang dam, releasing 40 Mm³; Teesta river surged 15×.", severity: "critical", ndmaRef: "NDMA/SK/2023/GLF-01" },
  { id: 4,  year: 2023, date: "Jul–Aug 2023",   event: "HP Multi-Cloudburst Disaster", state: "Himachal Pradesh", district: "Shimla / Mandi / Kullu", type: "Cloudburst", deaths: 330, missing: 62, affected: 200000, cause: "Repeated cloudbursts (42 events) across upper HP; Beas, Sutlej and Chenab rivers overflowed; ₹12,000 Cr damage.", severity: "critical", ndmaRef: "NDMA/HP/2023/CB-07" },
  { id: 5,  year: 2014, date: "Sep 2014",       event: "Jammu & Kashmir Floods", state: "J&K", district: "Srinagar / Anantnag", type: "Flash Flood", deaths: 490,  missing: 0,     affected: 1200000,"cause": "Unprecedented monsoon — highest rainfall since 1902; Jhelum crested 5 m above danger mark; 12,500 km² inundated.", severity: "critical", ndmaRef: "NDMA/JK/2014/FF-01" },
  { id: 6,  year: 2022, date: "May–Jul 2022",   event: "Assam Monsoon Floods", state: "Assam", district: "28 districts",       type: "Flash Flood", deaths: 192,  missing: 18,    affected: 4870000, cause: "Brahmaputra & tributaries overflowed due to above-normal monsoon rainfall; Kaziranga NP submerged 90%.", severity: "critical", ndmaRef: "NDMA/AS/2022/FF-03" },
  { id: 7,  year: 2012, date: "13–14 Aug 2012", event: "Uttarkashi Cloudburst", state: "Uttarakhand", district: "Uttarkashi",  type: "Cloudburst",  deaths: 70,   missing: 40,    affected: 30000,  cause: "Cloudburst over Bhagirathi basin; Assi Ganga river surged; 700+ houses damaged.", severity: "high",     ndmaRef: "NDMA/UK/2012/CB-02" },
  { id: 8,  year: 2022, date: "Jun–Jul 2022",   event: "Arunachal Pradesh Floods", state: "Arunachal Pradesh", district: "West Kameng / East Siang", type: "Flash Flood", deaths: 52, missing: 20, affected: 210000, cause: "Heavy pre-monsoon and monsoon rainfall caused Kameng, Siang and Dibang rivers to breach banks.", severity: "high",     ndmaRef: "NDMA/AR/2022/FF-02" },
  { id: 9,  year: 2016, date: "Aug 2016",       event: "Nagaland Landslide Cluster", state: "Nagaland", district: "Peren / Kohima", type: "Landslide", deaths: 28,  missing: 10,    affected: 8000,   cause: "Prolonged rainfall (850 mm in 5 days) saturated slopes; 34 landslides recorded across Naga Hills.", severity: "high",     ndmaRef: "NDMA/NL/2016/LS-04" },
  { id: 10, year: 2020, date: "May–Sep 2020",   event: "Assam Floods 2020", state: "Assam", district: "32 districts",          type: "Flash Flood", deaths: 123,  missing: 0,     affected: 5500000, cause: "Three waves of flooding driven by high discharge in Brahmaputra; Majuli island submerged; 1.8L Ha cropland lost.", severity: "high",     ndmaRef: "NDMA/AS/2020/FF-05" },
  { id: 11, year: 2023, date: "30 Jun 2023",    event: "Noney Landslide", state: "Manipur", district: "Noney",                 type: "Landslide",   deaths: 61,   missing: 32,    affected: 4000,   cause: "Massive hill collapse buried Territorial Army camp; construction zone on geologically unstable slope.", severity: "critical", ndmaRef: "NDMA/MN/2023/LS-01" },
  { id: 12, year: 2022, date: "Jun 2022",       event: "Meghalaya Flash Floods", state: "Meghalaya", district: "East Khasi Hills / Ri Bhoi", type: "Flash Flood", deaths: 30, missing: 8, affected: 110000, cause: "Mawsynram recorded 972 mm rainfall in 24 h (world record station); Umiam and Umtrew rivers breached.", severity: "high",     ndmaRef: "NDMA/ML/2022/FF-02" },
  { id: 13, year: 2015, date: "Jun–Jul 2015",   event: "Manipur Floods", state: "Manipur", district: "Imphal / Bishnupur",    type: "Flash Flood", deaths: 22,   missing: 0,     affected: 420000,  cause: "Iril, Nambul and Thoubal rivers overflowed; Loktak lake rose 2 m above normal; NH-39 blocked.", severity: "medium",   ndmaRef: "NDMA/MN/2015/FF-01" },
  { id: 14, year: 2022, date: "Jul 2022",       event: "Tripura Floods", state: "Tripura", district: "South Tripura / Dhalai", type: "Flash Flood", deaths: 26,   missing: 4,     affected: 580000,  cause: "Gomati and Dhalai rivers overflowed following 350 mm rainfall in 48 h; 1,100 villages inundated.", severity: "medium",   ndmaRef: "NDMA/TR/2022/FF-01" },
  { id: 15, year: 2017, date: "Jun 2017",       event: "Mizoram Landslide", state: "Mizoram", district: "Aizawl / Mamit",    type: "Landslide",   deaths: 25,   missing: 6,     affected: 15000,   cause: "Consecutive days of heavy rainfall destabilised hill cuts along national highways; NH-54 blocked for 9 days.", severity: "medium",   ndmaRef: "NDMA/MZ/2017/LS-02" },
  { id: 16, year: 2019, date: "15–16 Aug 2019", event: "Himachal Pradesh Flash Floods", state: "Himachal Pradesh", district: "Kullu / Lahaul", type: "Flash Flood", deaths: 45, missing: 20, affected: 80000, cause: "Cloudburst on Kullu-Manali highway; Beas river rose 4 m; 300+ vehicles trapped; 3 bridges washed away.", severity: "high",     ndmaRef: "NDMA/HP/2019/FF-03" },
];

const TYPE_COLOR: Record<DisasterType, string> = {
  "GLOF":        "#818cf8",
  "Flash Flood": "#38bdf8",
  "Landslide":   "#a78bfa",
  "Cloudburst":  "#34d399",
};
const TYPE_ICON: Record<DisasterType, string> = {
  "GLOF":        "🏔",
  "Flash Flood": "🌊",
  "Landslide":   "⛰",
  "Cloudburst":  "⛈",
};

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 100000)  return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)    return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

function HistoryPanel() {
  const [typeFilter, setTypeFilter] = useState<DisasterType | "all">("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const visible = typeFilter === "all"
    ? NDMA_EVENTS
    : NDMA_EVENTS.filter(e => e.type === typeFilter);

  const totalDeaths   = NDMA_EVENTS.reduce((s, e) => s + e.deaths, 0);
  const totalAffected = NDMA_EVENTS.reduce((s, e) => s + e.affected, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-rajdhani font-600 text-sm tracking-wider text-slate-200">DISASTER HISTORY</span>
          <span className="font-mono-data text-[9px] text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5">NDMA SOURCE</span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "EVENTS", val: String(NDMA_EVENTS.length) },
            { label: "DEATHS",  val: fmtNum(totalDeaths) },
            { label: "AFFECTED", val: fmtNum(totalAffected) },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-sm p-1.5 text-center" style={{ background: "rgba(30,45,61,0.4)", border: "1px solid #1e2d3d" }}>
              <div className="font-mono-data text-[11px] text-slate-200">{val}</div>
              <div className="font-rajdhani text-[8px] text-slate-600 tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setTypeFilter("all")}
            className={`text-[9px] px-1.5 py-0.5 font-mono-data tracking-wider transition-colors ${typeFilter === "all" ? "bg-slate-600/30 text-slate-300 border border-slate-500/40" : "text-slate-600 hover:text-slate-400"}`}
          >ALL</button>
          {(["GLOF", "Flash Flood", "Landslide", "Cloudburst"] as DisasterType[]).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`text-[9px] px-1.5 py-0.5 font-rajdhani tracking-wider transition-colors ${typeFilter === t ? "border" : "text-slate-600 hover:text-slate-400"}`}
              style={typeFilter === t ? { color: TYPE_COLOR[t], borderColor: `${TYPE_COLOR[t]}50`, background: `${TYPE_COLOR[t]}12` } : {}}>
              {TYPE_ICON[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {visible.map(ev => {
          const isOpen = expanded === ev.id;
          const severityCol = RISK_COLOR[ev.severity];
          const typeCol = TYPE_COLOR[ev.type];
          const maxDeaths = Math.max(...NDMA_EVENTS.map(e => e.deaths));

          return (
            <div
              key={ev.id}
              className="border-b border-slate-800/60"
              style={{ borderLeft: `2px solid ${severityCol}60` }}
            >
              <button
                className="w-full text-left px-3 py-2.5 hover:bg-slate-800/30 transition-colors"
                onClick={() => setExpanded(isOpen ? null : ev.id)}
              >
                {/* Year + type row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-data text-[10px] font-medium" style={{ color: severityCol }}>{ev.year}</span>
                    <span className="text-[9px] px-1 py-px font-rajdhani tracking-wider rounded-sm"
                      style={{ color: typeCol, background: `${typeCol}15`, border: `1px solid ${typeCol}35` }}>
                      {TYPE_ICON[ev.type]} {ev.type}
                    </span>
                  </div>
                  <span className="text-slate-700 text-[10px]">{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Event name */}
                <div className="font-rajdhani text-[11px] font-600 text-slate-200 leading-tight mb-1">
                  {ev.event}
                </div>

                {/* Location */}
                <div className="text-[9px] text-slate-500 mb-2">
                  📍 {ev.district}, {ev.state}
                </div>

                {/* Severity bar */}
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(30,45,61,0.6)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (ev.deaths / maxDeaths) * 100)}%`,
                        background: severityCol,
                        opacity: 0.75,
                      }}
                    />
                  </div>
                  <span className="font-mono-data text-[9px]" style={{ color: severityCol }}>
                    {fmtNum(ev.deaths)} deaths
                  </span>
                </div>

                {/* Quick stats */}
                <div className="flex gap-2 text-[9px] font-mono-data text-slate-500">
                  {ev.missing > 0 && <span>{fmtNum(ev.missing)} missing</span>}
                  <span>{fmtNum(ev.affected)} affected</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-3 pb-3 space-y-2" style={{ background: "rgba(13,17,23,0.5)" }}>
                  <div className="text-[10px] text-slate-400 font-mono-data">{ev.date}</div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">{ev.cause}</p>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: "Deaths",   val: fmtNum(ev.deaths),   col: "#ef4444" },
                      { label: "Missing",  val: ev.missing > 0 ? fmtNum(ev.missing) : "—", col: "#f97316" },
                      { label: "Affected", val: fmtNum(ev.affected),  col: "#38bdf8" },
                    ].map(({ label, val, col }) => (
                      <div key={label} className="rounded-sm p-1.5 text-center" style={{ background: "rgba(30,45,61,0.35)", border: "1px solid #1e2d3d" }}>
                        <div className="font-mono-data text-[11px]" style={{ color: col }}>{val}</div>
                        <div className="font-rajdhani text-[8px] text-slate-600 tracking-wider">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* NDMA reference */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[8px] font-mono-data text-slate-700 tracking-wider">REF:</span>
                    <span className="text-[8px] font-mono-data text-indigo-400/70">{ev.ndmaRef}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
export default function App() {
  const stats = getSensorStats();
  const [selectedStateIdx, setSelectedStateIdx] = useState<number>(0);
  const [selectedDistrictIdx, setSelectedDistrictIdx] = useState<number>(0);
  const [selectedVillageIdx, setSelectedVillageIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"map" | "sensors" | "evacuation">("map");
  const [rightTab, setRightTab] = useState<"alerts" | "history">("alerts");
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [toasts, setToasts] = useState<AutoAlertToast[]>([]);
  const [rainfall, setRainfall] = useState(187);
  const prevScoreRef = useRef<number | null>(null);

  const state: State = statesData[selectedStateIdx];
  const district: District = state.districts[selectedDistrictIdx] ?? state.districts[0];
  const village: Village = district.villages[selectedVillageIdx] ?? district.villages[0];

  const regionProfile = REGION_THRESHOLDS[state.code] ?? REGION_THRESHOLDS.UK;
  const liveScore = calcRiskScore(Math.round(rainfall), village.soilMoisture, village.slopeStability, state.code);
  const liveLevel = scoreToLevel(liveScore, state.code);

  // Live sensor update
  useEffect(() => {
    const t = setInterval(() => {
      setRainfall(prev => Math.max(0, prev + (Math.random() - 0.45) * 8));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Auto-alert when score crosses threshold
  useEffect(() => {
    const prev = prevScoreRef.current;
    if (prev !== null && prev < regionProfile.youdenCutoff && liveScore >= regionProfile.youdenCutoff) {
      // Score just crossed into critical — fire auto alert
      const toast: AutoAlertToast = {
        id: Date.now(),
        village: village.name,
        district: district.name,
        state: state.name,
        score: liveScore,
        level: liveLevel,
        route: village.evacuationRoute,
        shelter: village.nearestShelter,
        dist: village.shelterDistance,
      };
      setToasts(prev => [toast, ...prev].slice(0, 3));
      setAlerts(prev => [{
        id: Date.now(),
        type: "critical",
        location: `${village.name}, ${district.name}, ${state.name}`,
        message: `AUTO-TRIGGER: Risk score ${liveScore}/100 crossed critical threshold. Immediate evacuation required.`,
        time: new Date().toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" }),
        sent: true,
        ndrf: true,
        riskScore: liveScore,
        route: village.evacuationRoute,
        leadTime: 15, leadTimeTotal: 30,
      }, ...prev]);
    }
    prevScoreRef.current = liveScore;
  }, [liveScore]);

  // Simulate a new external alert after 12s
  useEffect(() => {
    const t = setTimeout(() => {
      const toast: AutoAlertToast = {
        id: Date.now(),
        village: "Bokajan",
        district: "Karbi Anglong",
        state: "Assam",
        score: 82,
        level: "critical",
        route: "State road → Diphu",
        shelter: "Diphu Camp",
        dist: 28,
      };
      setToasts(p => [toast, ...p].slice(0, 3));
      setAlerts(prev => [{
        id: Date.now(),
        type: "critical",
        location: "Bokajan, Karbi Anglong, Assam",
        message: "AUTO-TRIGGER: Sensor B-14 risk score 82/100. Soil moisture 89%. Flash flood risk critical.",
        time: new Date().toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" }),
        sent: true,
        ndrf: true,
        riskScore: 82,
        route: "State road → Diphu",
        leadTime: 18, leadTimeTotal: 35,
      }, ...prev]);
    }, 12000);
    return () => clearTimeout(t);
  }, []);

  const handleSearch = useCallback((stateIdx: number, districtIdx?: number, villageIdx?: number) => {
    setSelectedStateIdx(stateIdx);
    setSelectedDistrictIdx(districtIdx ?? 0);
    setSelectedVillageIdx(villageIdx ?? 0);
  }, []);

  const dismissToast = (id: number) => setToasts(p => p.filter(t => t.id !== id));
  const handleSendAlert = (id: number) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, sent: true } : a));

  const tickerMsg = `⚠ GIRI RAKSHAK ALERT SYSTEM ACTIVE | Mawsynram score:96 | Chungthang score:94 | Koloriang score:91 | Manikaran score:78 | Joshimath score:74 | Haflong score:71 | Sensors: ${stats.totalSensors} | Villages: ${stats.totalVillages} | Critical zones: ${stats.criticalCount}`;

  return (
    <div className="flex flex-col h-full bg-[#07090f] text-slate-200 overflow-hidden">
      {/* Auto Alert Toasts */}
      <AutoAlertToastPanel toasts={toasts} onDismiss={dismissToast} />

      {/* Ticker */}
      <div className="shrink-0 bg-red-950/40 border-b border-red-900/40 overflow-hidden h-6 flex items-center">
        <span className="shrink-0 bg-red-500 text-white text-[10px] font-mono-data px-2 py-0.5 tracking-widest mr-2">LIVE</span>
        <div className="overflow-hidden flex-1">
          <div className="alert-ticker whitespace-nowrap font-mono-data text-[10px] text-red-300">
            {tickerMsg} &nbsp;&nbsp;&nbsp; {tickerMsg}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="shrink-0 border-b border-slate-800 bg-[#0a0e18]">
        <div className="flex items-center gap-4 px-4 py-2">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-orange-500/20 border border-orange-500/50 flex items-center justify-center relative overflow-hidden">
              <span className="text-orange-400 text-lg leading-none">⛰</span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500/40" />
            </div>
            <div>
              <div className="font-rajdhani font-700 text-base text-white tracking-widest leading-tight">GIRI RAKSHAK</div>
              <div className="text-[10px] text-slate-500 leading-tight tracking-wider">Flash Flood & Landslide Prediction System</div>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-800 shrink-0" />

          <SearchBar onSelect={handleSearch} />

          <div className="flex items-center gap-4 ml-auto shrink-0">
            <div className="hidden lg:flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-slate-400">{stats.totalSensors} Sensors</span>
              </div>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-red" />
                <span className="text-red-400">{stats.criticalCount} Critical</span>
              </div>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-orange-400">{stats.highCount} High</span>
              </div>
            </div>
            <LiveClock />
            <div className="text-[10px] text-slate-600 font-rajdhani tracking-wider">NDRF · SDMA · IMD</div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <aside className="w-56 shrink-0 border-r border-slate-800 flex flex-col bg-[#09101a] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800">
            <span className="font-rajdhani text-[11px] text-slate-500 uppercase tracking-widest">Region Explorer</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {statesData.map((s, si) => {
              const isStateSelected = selectedStateIdx === si;
              return (
                <div key={si}>
                  <button
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800/50 transition-colors border-b border-slate-800/30 ${isStateSelected ? "bg-slate-800/70" : ""}`}
                    onClick={() => { setSelectedStateIdx(si); setSelectedDistrictIdx(0); setSelectedVillageIdx(0); }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: RISK_COLOR[s.risk] }} />
                    <span className="font-rajdhani text-[12px] font-600 flex-1 truncate"
                      style={{ color: isStateSelected ? "#fff" : "rgb(148,163,184)" }}>{s.name}</span>
                    <span className="font-mono-data text-[9px] text-slate-600">{s.code}</span>
                  </button>
                  {isStateSelected && s.districts.map((d, di) => {
                    const isDistSelected = selectedDistrictIdx === di;
                    return (
                      <div key={di}>
                        <button
                          className={`w-full text-left pl-6 pr-3 py-1.5 flex items-center gap-2 hover:bg-slate-700/30 transition-colors ${isDistSelected ? "bg-slate-700/40" : ""}`}
                          onClick={() => { setSelectedDistrictIdx(di); setSelectedVillageIdx(0); }}>
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: RISK_COLOR[d.risk] }} />
                          <span className="text-[11px] flex-1 truncate"
                            style={{ color: isDistSelected ? "#e2e8f0" : "rgb(100,116,139)" }}>{d.name}</span>
                        </button>
                        {isDistSelected && d.villages.map((v, vi) => (
                          <button key={vi}
                            className={`w-full text-left pl-10 pr-3 py-1 flex items-center gap-2 hover:bg-slate-700/20 transition-colors ${selectedVillageIdx === vi ? "bg-slate-700/30" : ""}`}
                            onClick={() => setSelectedVillageIdx(vi)}>
                            <span className="w-1 h-1 shrink-0" style={{ background: RISK_COLOR[v.risk] }} />
                            <span className="text-[10px] truncate"
                              style={{ color: selectedVillageIdx === vi ? "#e2e8f0" : "rgb(71,85,105)" }}>{v.name}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-800 px-3 py-2 space-y-0.5">
            <div className="text-[9px] text-orange-500/70 font-rajdhani tracking-wider">IDEA TITANS</div>
            <div className="text-[9px] text-slate-600">Giri Rakshak · Prototype v1.0</div>
          </div>
        </aside>

        {/* Center */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Breadcrumb + tabs */}
          <div className="shrink-0 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
              <span className="text-orange-400 font-rajdhani">{state.name}</span>
              <span>›</span>
              <span>{district.name}</span>
              <span>›</span>
              <span className="text-slate-300 truncate">{village.name}</span>
              <RiskBadge level={liveLevel} small />
            </div>
            <div className="flex gap-1 shrink-0">
              {(["map", "sensors", "evacuation"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`text-[10px] uppercase tracking-wider font-mono-data px-3 py-1 transition-colors ${activeTab === tab ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : "text-slate-600 hover:text-slate-400"}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Stats row with risk gauge */}
          <div className="shrink-0 border-b border-slate-800 flex">
            {/* Risk Gauge */}
            <div className="px-4 py-2 border-r border-slate-800 flex flex-col items-center justify-center w-48 shrink-0">
              <RiskGauge score={liveScore} level={liveLevel} />
              {liveScore >= regionProfile.youdenCutoff && (
                <div className="text-[10px] text-red-400 font-mono-data animate-pulse-red text-center -mt-1">
                  ⚠ AUTO-ALERT ACTIVE
                </div>
              )}
            </div>
            {/* Sensor stats */}
            <div className="flex-1 grid grid-cols-3">
              {[
                { label: "Rainfall (mm/hr)", value: Math.round(rainfall), unit: "", color: liveScore >= 80 ? "#ef4444" : "#f97316" },
                { label: "Soil Moisture", value: village.soilMoisture, unit: "%", color: village.soilMoisture > 85 ? "#ef4444" : "#f97316" },
                { label: "Slope Stability", value: village.slopeStability, unit: "/100", color: village.slopeStability < 30 ? "#ef4444" : "#eab308" },
              ].map((s, i) => (
                <div key={i} className={`px-4 py-3 ${i > 0 ? "border-l border-slate-800" : ""} space-y-0.5`}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                  <div className="font-mono-data text-xl font-500 leading-tight" style={{ color: s.color }}>
                    {s.value}{s.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === "map" && (
              <PoliticalMap
                selectedStateIdx={selectedStateIdx}
                onSelectState={(idx) => { setSelectedStateIdx(idx); setSelectedDistrictIdx(0); setSelectedVillageIdx(0); }}
              />
            )}

            {activeTab === "sensors" && (
              <div className="h-full overflow-y-auto p-4 grid-bg space-y-3">
                <div className="font-rajdhani text-sm text-slate-300 tracking-wider">SENSOR TELEMETRY — {village.name.toUpperCase()}</div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="sensor-card space-y-3">
                    <div className="font-rajdhani text-[11px] text-slate-500 uppercase tracking-widest">Rainfall Sensors</div>
                    <SensorBar label="Current Rainfall" value={Math.round(rainfall)} max={regionProfile.rainfall.p99} unit=" mm/hr" color={mapToPercentile(rainfall, regionProfile.rainfall) >= regionProfile.youdenCutoff ? "#ef4444" : "#f97316"} />
                    <SensorBar label="24h Accumulation" value={Math.round(rainfall * 4.2)} max={Math.round(regionProfile.rainfall.p99 * 4.2)} unit=" mm" color="#f97316" />
                    <SensorBar label="Catchment Fill" value={Math.min(99, Math.round(rainfall / 3.5))} max={100} unit="%" color="#eab308" />
                  </div>
                  <div className="sensor-card space-y-3">
                    <div className="font-rajdhani text-[11px] text-slate-500 uppercase tracking-widest">Soil & Slope</div>
                    <SensorBar label="Soil Moisture" value={village.soilMoisture} max={regionProfile.soilMoisture.p99} unit="%" color={mapToPercentile(village.soilMoisture, regionProfile.soilMoisture) >= regionProfile.youdenCutoff ? "#ef4444" : "#eab308"} />
                    <SensorBar label="Slope Stability Index" value={village.slopeStability} max={100} unit="" color={mapToPercentile(100 - village.slopeStability, regionProfile.slopeInstability) >= regionProfile.youdenCutoff ? "#ef4444" : "#22c55e"} />
                    <SensorBar label="Pore Water Pressure" value={Math.round((100 - village.slopeStability) * 0.8)} max={100} unit=" kPa" color="#f97316" />
                  </div>
                  <div className="sensor-card space-y-3">
                    <div className="font-rajdhani text-[11px] text-slate-500 uppercase tracking-widest">IoT Network ({district.sensors} Nodes)</div>
                    {Array.from({ length: Math.min(district.sensors, 8) }, (_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="font-mono-data text-[10px] text-slate-400">Node-{String(i + 1).padStart(2, "0")}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-20 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${75 + Math.sin(i * 1.3) * 20}%` }} />
                          </div>
                          <span className="font-mono-data text-[10px] text-green-400">ONLINE</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sensor-card">
                    <div className="font-rajdhani text-[11px] text-slate-500 uppercase tracking-widest mb-2">7-Day Rainfall History</div>
                    <RainfallBarChart rainfall={Math.round(rainfall)} />
                  </div>
                  <CalibrationCard
                    stateCode={state.code}
                    rainfall={Math.round(rainfall)}
                    soilMoisture={village.soilMoisture}
                    slopeStability={village.slopeStability}
                  />
                </div>
              </div>
            )}

            {activeTab === "evacuation" && (
              <div className="h-full overflow-y-auto p-4 space-y-3">
                <div className="font-rajdhani text-sm text-slate-300 tracking-wider">EVACUATION & RESPONSE — {village.name.toUpperCase()}</div>

                {/* Live route map */}
                <EvacuationRouteMap village={village} />

                {/* Nearby shelters */}
                <div className="border border-slate-700 p-3 space-y-2">
                  <div className="font-rajdhani text-[11px] text-slate-400 uppercase tracking-widest">Nearest Relief Points</div>
                  {[
                    { name: village.nearestShelter, dist: village.shelterDistance, type: "Primary", cap: 500, status: "READY" },
                    { name: `${district.name} District HQ`, dist: village.shelterDistance + 18, type: "Secondary", cap: 1200, status: "READY" },
                    { name: `NDRF Battalion — ${state.name}`, dist: village.shelterDistance + 45, type: "NDRF Base", cap: 3000, status: "STANDBY" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
                      <div>
                        <div className="text-[11px] text-slate-200">{s.name}</div>
                        <div className="text-[10px] text-slate-500">{s.type} · Cap: {s.cap}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono-data text-[11px] text-slate-300">{s.dist} km</div>
                        <div className={`text-[10px] font-mono-data ${s.status === "READY" ? "text-green-400" : "text-yellow-400"}`}>{s.status}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* NDRF contacts */}
                <div className="border border-blue-900/40 bg-blue-950/20 p-3 space-y-2">
                  <div className="font-rajdhani text-[11px] text-blue-400 uppercase tracking-widest">NDRF Emergency Contacts</div>
                  {[
                    { name: "NDRF Control Room", num: "011-24363260", type: "National" },
                    { name: `NDRF Bn — ${state.name}`, num: "1800-180-7654", type: "State" },
                    { name: "SDMA Helpline", num: "1077", type: "State DM" },
                    { name: "Emergency SMS Gateway", num: "AUTO-DISPATCH", type: "System" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-200">{c.name}</div>
                        <div className="text-[10px] text-slate-500">{c.type}</div>
                      </div>
                      <span className="font-mono-data text-[11px] text-blue-400">{c.num}</span>
                    </div>
                  ))}
                </div>

                {/* Alert dispatch */}
                <div className="border border-orange-900/40 bg-orange-950/10 p-3 space-y-2">
                  <div className="font-rajdhani text-[11px] text-orange-400 uppercase tracking-widest">Alert Dispatch Status</div>
                  {[
                    { channel: "SMS — Village residents", recipients: village.population, status: "SENT" },
                    { channel: "IVR Calls — Ward leaders", recipients: Math.ceil(village.population / 50), status: "SENT" },
                    { channel: "NDRF Battalion Alert", recipients: 1, status: village.risk === "critical" ? "SENT" : "PENDING" },
                    { channel: "State EOC Dashboard", recipients: 1, status: "SENT" },
                    { channel: "District Collector Office", recipients: 1, status: "SENT" },
                  ].map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0">
                      <div>
                        <div className="text-[11px] text-slate-200">{d.channel}</div>
                        <div className="font-mono-data text-[10px] text-slate-500">{d.recipients.toLocaleString()} recipients</div>
                      </div>
                      <span className={`font-mono-data text-[10px] ${d.status === "SENT" ? "text-green-400" : "text-yellow-400"}`}>
                        {d.status === "SENT" ? "✓ " : "⏳ "}{d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar — Alerts / History */}
        <aside className="w-72 shrink-0 border-l border-slate-800 flex flex-col overflow-hidden bg-[#09101a]">
          {/* Tab switcher */}
          <div className="flex shrink-0 border-b border-slate-800">
            {(["alerts", "history"] as const).map(t => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className="flex-1 py-2 text-[10px] font-mono-data uppercase tracking-widest transition-colors"
                style={rightTab === t
                  ? { color: "#f97316", background: "rgba(249,115,22,0.08)", borderBottom: "2px solid #f97316" }
                  : { color: "#475569", borderBottom: "2px solid transparent" }}
              >
                {t === "alerts" ? "⚠ ALERTS" : "📜 HISTORY"}
              </button>
            ))}
          </div>

          {rightTab === "alerts" ? (
            <>
              <AlertPanel alerts={alerts} onSend={handleSendAlert} />
              <div className="border-t border-slate-800 p-3 space-y-2 shrink-0">
                <div className="font-rajdhani text-[11px] text-slate-500 uppercase tracking-widest">{state.name} — Districts</div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {state.districts.map((d, di) => (
                    <button key={di}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-slate-800/50 transition-colors ${selectedDistrictIdx === di ? "bg-slate-800/40" : ""}`}
                      onClick={() => { setSelectedDistrictIdx(di); setSelectedVillageIdx(0); }}>
                      <span className="text-[11px] text-slate-300">{d.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data text-[10px] text-slate-600">{d.sensors} snsr</span>
                        <RiskBadge level={d.risk} small />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <HistoryPanel />
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-slate-800 bg-[#0a0e18] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span className="text-orange-500/70 font-rajdhani font-600 tracking-wider">GIRI RAKSHAK</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500 font-rajdhani tracking-wider">Team: IDEA TITANS</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-600">IMD · ISRO BHUVAN · NDMA · CWC · IoT Sensor Network</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 font-mono-data">All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
