import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  GeoJSON,
  ZoomControl,
  useMap,
} from "react-leaflet";
import type { Map as LMap, PathOptions, Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { statesData, type RiskLevel, type District } from "./data";

// ── constants ────────────────────────────────────────────────────────────────

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
};

const STATE_CENTERS: [number, number][] = [
  [30.07, 79.02], // UK – Uttarakhand
  [31.10, 77.17], // HP – Himachal Pradesh
  [28.22, 94.73], // AR – Arunachal Pradesh
  [25.47, 91.37], // ML – Meghalaya
  [27.53, 88.51], // SK – Sikkim
  [24.66, 93.91], // MN – Manipur
  [26.16, 94.56], // NL – Nagaland
  [23.16, 92.94], // MZ – Mizoram
  [23.94, 91.99], // TR – Tripura
  [26.20, 92.94], // AS – Assam
  [33.78, 76.58], // JK – J&K
];

const STATE_CODES = ["UK", "HP", "AR", "ML", "SK", "MN", "NL", "MZ", "TR", "AS", "JK"];

const HILLY: Record<string, number> = {
  "Uttarakhand": 0,   "Himachal Pradesh": 1,  "Arunachal Pradesh": 2,
  "Meghalaya": 3,     "Sikkim": 4,             "Manipur": 5,
  "Nagaland": 6,      "Mizoram": 7,            "Tripura": 8,
  "Assam": 9,         "Jammu & Kashmir": 10,   "Jammu and Kashmir": 10,
  "Ladakh": 10,
};

const INDIA_GEOJSON =
  "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson";

// ── helpers ──────────────────────────────────────────────────────────────────

function featName(f: { properties: Record<string, string> | null }): string {
  const p = f.properties;
  if (!p) return "";
  return p.ST_NM ?? p.NAME_1 ?? p.name ?? p.state_name ?? "";
}

function districtCenter(d: District): [number, number] {
  const vs = d.villages;
  const lat = vs.reduce((s, v) => s + v.lat, 0) / vs.length;
  const lng = vs.reduce((s, v) => s + v.lng, 0) / vs.length;
  return [lat, lng];
}

// ── Leaflet FlyTo controller ──────────────────────────────────────────────────

function FlyCtrl({ selectedStateIdx }: { selectedStateIdx: number }) {
  const map = useMap();
  const mounted = useRef(false);
  const prev = useRef(selectedStateIdx);
  useEffect(() => {
    // Skip the initial mount — map may not be fully sized yet
    if (!mounted.current) { mounted.current = true; return; }
    if (prev.current === selectedStateIdx) return;
    prev.current = selectedStateIdx;
    const c = STATE_CENTERS[selectedStateIdx];
    if (c && isFinite(c[0]) && isFinite(c[1])) {
      map.flyTo(c, 7, { duration: 1.1 });
    }
  }, [selectedStateIdx, map]);
  return null;
}

// ── SVG overlay via portal ────────────────────────────────────────────────────

interface OverlayProps {
  selectedStateIdx: number;
  onSelectState: (i: number) => void;
}

function SVGOverlay({ selectedStateIdx, onSelectState }: OverlayProps) {
  const map = useMap();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const upd = () => setTick((n) => n + 1);
    map.on("move zoom resize moveend zoomend viewreset", upd);
    return () => { map.off("move zoom resize moveend zoomend viewreset", upd); };
  }, [map]);

  const container = map.getContainer();
  const { width, height } = container.getBoundingClientRect();
  const zoom = map.getZoom();
  const stateR = Math.max(9, Math.min(18, zoom * 1.8));
  const showDistricts = zoom >= 6;

  // Convert a [lat, lng] to SVG pixel point
  const px = (lat: number, lng: number) => map.latLngToContainerPoint([lat, lng]);

  // All state pixel centres
  const statePts = STATE_CENTERS.map(([lat, lng]) => px(lat, lng));

  // District data for all 11 hilly states
  const allDistricts = statesData.flatMap((state, si) =>
    state.districts.map((d) => {
      const [dlat, dlng] = districtCenter(d);
      const pt = px(dlat, dlng);
      return { x: pt.x, y: pt.y, risk: d.risk, stateIdx: si, name: d.name };
    })
  );

  const svg = (
    <svg
      style={{
        position: "absolute", top: 0, left: 0,
        width, height,
        pointerEvents: "none",
        zIndex: 600,
        overflow: "visible",
      }}
    >
      <defs>
        <filter id="glow-crit" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-high" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Layer 0: district pulsing rings (critical & high) ── */}
      {showDistricts && allDistricts.map((d, i) => {
        if (d.risk === "critical") {
          return (
            <g key={`dring-${i}`}>
              <circle cx={d.x} cy={d.y} r={6} fill="none" stroke={RISK_COLOR.critical} strokeWidth={1}>
                <animate attributeName="r" from="6" to="26" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.55" to="0" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx={d.x} cy={d.y} r={6} fill="none" stroke={RISK_COLOR.critical} strokeWidth={0.8}>
                <animate attributeName="r" from="6" to="20" dur="2.2s" begin="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.35" to="0" dur="2.2s" begin="0.8s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        }
        if (d.risk === "high") {
          return (
            <circle key={`dring-${i}`} cx={d.x} cy={d.y} r={5} fill="none" stroke={RISK_COLOR.high} strokeWidth={0.8}>
              <animate attributeName="r" from="5" to="18" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.4" to="0" dur="3s" repeatCount="indefinite" />
            </circle>
          );
        }
        return null;
      })}

      {/* ── Layer 1: state pulsing rings (critical & high) ── */}
      {statesData.map((state, idx) => {
        const { x, y } = statePts[idx];
        if (state.risk === "critical") {
          return (
            <g key={`sring-${idx}`}>
              <circle cx={x} cy={y} r={stateR} fill="none" stroke={RISK_COLOR.critical} strokeWidth={2}>
                <animate attributeName="r" from={stateR} to={stateR + 36} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r={stateR} fill="none" stroke={RISK_COLOR.critical} strokeWidth={1.2}>
                <animate attributeName="r" from={stateR} to={stateR + 24} dur="2s" begin="0.65s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.35" to="0" dur="2s" begin="0.65s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        }
        if (state.risk === "high") {
          return (
            <circle key={`sring-${idx}`} cx={x} cy={y} r={stateR} fill="none" stroke={RISK_COLOR.high} strokeWidth={1.2}>
              <animate attributeName="r" from={stateR} to={stateR + 22} dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.4" to="0" dur="3s" repeatCount="indefinite" />
            </circle>
          );
        }
        return null;
      })}

      {/* ── Layer 2: district markers ── */}
      {showDistricts && allDistricts.map((d, i) => (
        <circle
          key={`dm-${i}`}
          cx={d.x} cy={d.y} r={4}
          fill={RISK_COLOR[d.risk as RiskLevel]}
          fillOpacity={0.6}
          stroke={RISK_COLOR[d.risk as RiskLevel]}
          strokeWidth={0.5}
          strokeOpacity={0.8}
        />
      ))}

      {/* ── Layer 3: state markers (interactive) ── */}
      {statesData.map((state, idx) => {
        const { x, y } = statePts[idx];
        const col = RISK_COLOR[state.risk];
        const isSel = idx === selectedStateIdx;
        const r = isSel ? stateR + 5 : stateR;
        const isCrit = state.risk === "critical";

        return (
          <g
            key={`sm-${idx}`}
            style={{ pointerEvents: "all", cursor: "pointer" }}
            onClick={() => onSelectState(idx)}
          >
            {/* Selection halo */}
            {isSel && (
              <circle cx={x} cy={y} r={r + 6} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.4} />
            )}
            {/* Risk fill circle */}
            <circle
              cx={x} cy={y} r={r}
              fill={col}
              fillOpacity={isSel ? 0.92 : 0.7}
              stroke={isSel ? "#ffffff" : col}
              strokeWidth={isSel ? 2 : 1.2}
              filter={isCrit ? "url(#glow-crit)" : state.risk === "high" ? "url(#glow-high)" : undefined}
            />
            {/* Inner ring detail for selected */}
            {isSel && (
              <circle cx={x} cy={y} r={r - 4} fill="none" stroke="#fff" strokeWidth={0.8} opacity={0.35} />
            )}
            {/* State code label — above marker */}
            <text
              x={x} y={y - r - 5}
              textAnchor="middle"
              fontSize={Math.max(8, Math.min(11, zoom * 1.1))}
              fontFamily="Rajdhani, sans-serif"
              fontWeight="700"
              fill={col}
              letterSpacing="0.09em"
              style={{ textShadow: "0 0 6px #07090f" }}
            >
              {STATE_CODES[idx]}
            </text>
            {/* Risk score badge on selected */}
            {isSel && (
              <text
                x={x} y={y + r + 13}
                textAnchor="middle"
                fontSize={8}
                fontFamily="JetBrains Mono, monospace"
                fill={col}
                opacity={0.85}
              >
                {state.risk.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Layer 4: district name labels on selected state ── */}
      {showDistricts && zoom >= 7 &&
        statesData[selectedStateIdx].districts.map((d, i) => {
          const [dlat, dlng] = districtCenter(d);
          const { x, y } = px(dlat, dlng);
          const col = RISK_COLOR[d.risk];
          return (
            <text
              key={`dl-${i}`}
              x={x} y={y - 8}
              textAnchor="middle"
              fontSize={7}
              fontFamily="Rajdhani, sans-serif"
              fontWeight="600"
              fill={col}
              opacity={0.9}
              letterSpacing="0.06em"
            >
              {d.name.toUpperCase()}
            </text>
          );
        })}
    </svg>
  );

  return createPortal(svg, container);
}

// ── GeoJSON styler & interaction ──────────────────────────────────────────────

function styleFeature(selectedIdx: number) {
  return function style(feature?: { properties: Record<string, string> | null }): PathOptions {
    if (!feature) return {};
    const name = featName(feature as { properties: Record<string, string> | null });
    const idx = HILLY[name];
    if (idx === undefined) {
      return { fillColor: "#0c1922", fillOpacity: 0.8, color: "#1e3040", weight: 0.7, opacity: 1 };
    }
    const risk = statesData[idx].risk;
    const col = RISK_COLOR[risk];
    const isSel = idx === selectedIdx;
    return {
      fillColor: col,
      fillOpacity: isSel ? 0.22 : 0.1,
      color: isSel ? col : col,
      weight: isSel ? 1.8 : 0.9,
      opacity: isSel ? 0.9 : 0.55,
      dashArray: isSel ? undefined : "4 3",
    };
  };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  selectedStateIdx: number;
  onSelectState: (idx: number) => void;
}

export default function PoliticalMap({ selectedStateIdx, onSelectState }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geo, setGeo] = useState<any>(null);
  const [fetchErr, setFetchErr] = useState(false);
  const mapRef = useRef<LMap | null>(null);

  useEffect(() => {
    fetch(INDIA_GEOJSON)
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setFetchErr(true));
  }, []);

  function onEachFeature(feature: { properties: Record<string, string> | null }, layer: Layer) {
    const name = featName(feature);
    const idx = HILLY[name];
    const l = layer as unknown as {
      bindTooltip: (s: string, opts: object) => void;
      on: (ev: string, fn: () => void) => void;
      setStyle: (opts: PathOptions) => void;
    };
    if (idx !== undefined) {
      const col = RISK_COLOR[statesData[idx].risk];
      l.bindTooltip(
        `<span style="font-family:Rajdhani,sans-serif;font-weight:700;font-size:11px;color:${col};letter-spacing:.06em">${name.toUpperCase()}</span>`,
        { sticky: true, opacity: 1, className: "giri-tooltip" }
      );
      l.on("click", () => onSelectState(idx));
      l.on("mouseover", () => l.setStyle({ fillOpacity: 0.3 }));
      l.on("mouseout", () => l.setStyle({ fillOpacity: idx === selectedStateIdx ? 0.22 : 0.1 }));
    } else if (name) {
      l.bindTooltip(
        `<span style="font-family:Rajdhani,sans-serif;font-size:10px;color:#334155;letter-spacing:.05em">${name}</span>`,
        { sticky: true, opacity: 1, className: "giri-tooltip" }
      );
    }
  }

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      <MapContainer
        ref={mapRef}
        center={[24, 83]}
        zoom={5}
        zoomControl={false}
        scrollWheelZoom
        style={{ width: "100%", height: "100%", background: "#07090f" }}
        minZoom={4}
        maxZoom={14}
      >
        <ZoomControl position="bottomright" />
        <FlyCtrl selectedStateIdx={selectedStateIdx} />

        {geo && (
          <GeoJSON
            key={selectedStateIdx}
            data={geo as Parameters<typeof GeoJSON>[0]["data"]}
            style={styleFeature(selectedStateIdx) as Parameters<typeof GeoJSON>[0]["style"]}
            onEachFeature={onEachFeature as Parameters<typeof GeoJSON>[0]["onEachFeature"]}
          />
        )}

        {/* SVG overlay portal — must live inside MapContainer to access useMap() */}
        <SVGOverlay selectedStateIdx={selectedStateIdx} onSelectState={onSelectState} />
      </MapContainer>

      {/* ── loading / error ── */}
      {!geo && !fetchErr && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <span className="text-slate-500 font-rajdhani tracking-widest text-xs animate-pulse">
            LOADING MAP DATA…
          </span>
        </div>
      )}
      {fetchErr && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <span className="text-red-400/60 font-rajdhani text-xs tracking-widest">
            MAP UNAVAILABLE — CHECK CONNECTION
          </span>
        </div>
      )}

      {/* ── region jump buttons ── */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
        {[
          { label: "NORTH INDIA",  c: [31.5, 77.5] as [number,number], z: 7 },
          { label: "NORTHEAST",    c: [26.0, 93.0] as [number,number], z: 7 },
          { label: "OVERVIEW",     c: [24.0, 83.0] as [number,number], z: 5 },
        ].map(({ label, c, z }) => (
          <button
            key={label}
            onClick={() => mapRef.current?.flyTo(c, z, { duration: 1.1 })}
            style={{
              background: "rgba(7,9,15,0.88)",
              border: "1px solid rgba(249,115,22,0.3)",
              color: "#f97316",
              fontFamily: "Rajdhani, sans-serif",
              fontSize: 10,
              letterSpacing: "0.08em",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── risk legend ── */}
      <div
        className="absolute bottom-8 left-3 z-[1000] rounded-sm p-2.5 space-y-1"
        style={{ background: "rgba(7,9,15,0.92)", border: "1px solid #1e2d3d" }}
      >
        <div style={{ fontFamily: "Rajdhani,sans-serif", fontSize: 9, letterSpacing: "0.08em", color: "#475569", marginBottom: 5 }}>
          FLOOD RISK
        </div>
        {(["critical","high","medium","low"] as RiskLevel[]).map((r) => (
          <div key={r} className="flex items-center gap-1.5">
            <span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background: RISK_COLOR[r], opacity:0.85 }} />
            <span style={{ fontFamily:"Rajdhani,sans-serif", fontSize:9, letterSpacing:"0.06em", color: RISK_COLOR[r] }}>
              {r.toUpperCase()}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: "1px solid #1e2d3d" }}>
          <span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"#0c1922", border:"1px solid #1e3040" }} />
          <span style={{ fontFamily:"Rajdhani,sans-serif", fontSize:9, color:"#475569", letterSpacing:"0.06em" }}>
            OTHER STATES
          </span>
        </div>
      </div>

      {/* ── hint ── */}
      <div
        className="absolute top-3 right-3 z-[1000]"
        style={{
          fontFamily: "Rajdhani,sans-serif", fontSize: 9, color: "#334155",
          letterSpacing: "0.07em", background: "rgba(7,9,15,0.7)",
          padding: "3px 7px", borderRadius: 3, border: "1px solid #1e2d3d",
        }}
      >
        CLICK STATE TO SELECT · SCROLL TO ZOOM
      </div>
    </div>
  );
}
