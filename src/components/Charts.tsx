import { useEffect, useRef, useState, type ReactNode } from "react";
import { fd, fdShort, num } from "../lib/util";

// Palette catégorielle validée (daltonisme, contraste) — ordre fixe, jamais cyclique.
export const SERIES = ["#047857", "#c81e1e", "#2563eb", "#b45309", "#9333ea"];
const OTHER = "#8a9a93";
const GRID = "#e3e8e5";
const TXT = "#5b6f67";
const short = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const compact = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)} M` : n >= 1e4 ? `${Math.round(n / 1e3)} k` : num(n));
const niceMax = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };

function useWidth(ref: React.RefObject<HTMLElement>) {
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.clientWidth) || 640)); ro.observe(el); setW(Math.round(el.clientWidth) || 640);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function Tip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <div className="tip" style={{ left: x, top: y }} role="status">{children}</div>;
}

export function BarChart({ rows, devise = "" }: { rows: { poste: string; prevu: number; depense: number }[]; devise?: string }) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cw = useWidth(box);
  if (!rows.length) return <div className="empty">Aucun budget ou dépense pour le moment.</div>;
  if (cw < 520) {
    const mx = Math.max(1, ...rows.flatMap((r) => [r.prevu, r.depense]));
    return (
      <div className="chart hbars" ref={box}>
        {rows.map((r) => (
          <div className="hrow" key={r.poste}>
            <div className="hhead"><span>{r.poste}</span><b className="tnum">{compact(r.depense)} <small>/ {compact(r.prevu)}</small></b></div>
            <div className="htrack" title={`Prévu ${num(r.prevu)} ${devise}`}><i style={{ width: `${(r.prevu / mx) * 100}%`, background: "#a7d9c3" }} /></div>
            <div className="htrack" title={`Dépensé ${num(r.depense)} ${devise}`}><i style={{ width: `${(r.depense / mx) * 100}%`, background: r.depense > r.prevu && r.prevu > 0 ? "#c81e1e" : "#047857" }} /></div>
          </div>
        ))}
        <div className="legend"><span><i style={{ background: "#a7d9c3" }} />Prévu</span><span><i style={{ background: "#047857" }} />Dépensé</span><span><i style={{ background: "#c81e1e" }} />Dépassement du prévu</span></div>
      </div>
    );
  }
  const W = 640, H = 290, L = 46, B = 62, T = 14, R = 8;
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => [r.prevu, r.depense])));
  const slot = (W - L - R) / rows.length;
  const bw = Math.min(18, slot * 0.34);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const base = H - B;
  const bar = (x: number, v: number, fill: string) => {
    const h = Math.max(0, base - y(v)); if (h < 1) return null;
    const r = Math.min(4, h, bw / 2);
    return <path d={`M${x} ${base}V${base - h + r}Q${x} ${base - h} ${x + r} ${base - h}H${x + bw - r}Q${x + bw} ${base - h} ${x + bw} ${base - h + r}V${base}Z`} fill={fill} />;
  };
  return (
    <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Budget prévu et dépensé par poste">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} stroke={GRID} /><text x={L - 8} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill={TXT} className="tnum">{compact(max * t)}</text></g>)}
        {rows.map((r, i) => {
          const cx = L + i * slot + slot / 2, over = r.depense > r.prevu && r.prevu > 0;
          return (
            <g key={r.poste} opacity={hover && hover.i !== i ? 0.45 : 1}>
              {bar(cx - bw - 1, r.prevu, "#a7d9c3")}{bar(cx + 1, r.depense, over ? "#c81e1e" : "#047857")}
              <text transform={`translate(${cx},${base + 14}) rotate(28)`} fontSize="11" fill={TXT}>{short(r.poste, 15)}</text>
              <rect x={cx - slot / 2} y={T} width={slot} height={H - T - B + 30} fill="transparent"
                onMouseMove={(e) => { const b = box.current!.getBoundingClientRect(); setHover({ i, x: e.clientX - b.left, y: e.clientY - b.top }); }} onClick={(e) => { const b = box.current!.getBoundingClientRect(); setHover({ i, x: e.clientX - b.left, y: e.clientY - b.top }); }} />
            </g>
          );
        })}
      </svg>
      {hover && <Tip x={hover.x} y={hover.y}><b>{rows[hover.i].poste}</b><span>Prévu <em className="tnum">{num(rows[hover.i].prevu)} {devise}</em></span><span>Dépensé <em className="tnum">{num(rows[hover.i].depense)} {devise}</em></span></Tip>}
      <div className="legend"><span><i style={{ background: "#a7d9c3" }} />Prévu</span><span><i style={{ background: "#047857" }} />Dépensé</span><span><i style={{ background: "#c81e1e" }} />Dépassement du prévu</span></div>
    </div>
  );
}

export function DonutChart({ rows, devise = "" }: { rows: { poste: string; montant: number }[]; devise?: string }) {
  const [on, setOn] = useState<number | null>(null);
  const total = rows.reduce((s, r) => s + r.montant, 0);
  if (!total) return <div className="empty">Aucune dépense enregistrée.</div>;
  const sorted = rows.slice().sort((a, b) => b.montant - a.montant);
  const top = sorted.slice(0, 5), rest = sorted.slice(5).reduce((s, r) => s + r.montant, 0);
  const parts = [...top.map((r, i) => ({ ...r, color: SERIES[i] })), ...(rest > 0 ? [{ poste: "Autres postes", montant: rest, color: OTHER }] : [])];
  const R = 88, r = 56, cx = 100, cy = 100, gap = parts.length > 1 ? 0.035 : 0;
  let a0 = -Math.PI / 2;
  const P = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
  const arcs = parts.map((p, i) => {
    const sweep = (p.montant / total) * Math.PI * 2, s = a0 + gap / 2, e = a0 + sweep - gap / 2; a0 += sweep;
    const large = e - s > Math.PI ? 1 : 0;
    const d = parts.length === 1 ? `M${cx - R} ${cy}A${R} ${R} 0 1 1 ${cx + R} ${cy}A${R} ${R} 0 1 1 ${cx - R} ${cy}M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}` : `M${P(R, s)}A${R} ${R} 0 ${large} 1 ${P(R, e)}L${P(r, e)}A${r} ${r} 0 ${large} 0 ${P(r, s)}Z`;
    return <path key={p.poste} d={d} fill={p.color} fillRule="evenodd" opacity={on !== null && on !== i ? 0.35 : 1} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(null)} onClick={() => setOn(on === i ? null : i)} />;
  });
  const cur = on !== null ? parts[on] : null;
  return (
    <div className="donut">
      <svg viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="Répartition des dépenses par poste">
        {arcs}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill={TXT}>{cur ? short(cur.poste, 18) : "Dépenses"}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="17" fontWeight="700" fill="#0b2a21" className="tnum">{compact(cur ? cur.montant : total)}</text>
        {cur && <text x={cx} y={cy + 30} textAnchor="middle" fontSize="11" fill={TXT} className="tnum">{Math.round((cur.montant / total) * 100)} %</text>}
      </svg>
      <ul className="dlist">{parts.map((p, i) => (
        <li key={p.poste} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(null)} className={on === i ? "on" : ""}>
          <i style={{ background: p.color }} /><span>{p.poste}</span><b className="tnum">{Math.round((p.montant / total) * 100)} %</b><small className="tnum">{num(p.montant)} {devise}</small>
        </li>))}</ul>
    </div>
  );
}

type Curve = { debut: string | null; fin: string | null; aujourdhui: string; reel: [string, number][]; prevu: [string, number][]; budget: number };
export function LineChart({ c, devise = "" }: { c: Curve; devise?: string }) {
  const [hov, setHov] = useState<{ t: number; px: number; py: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cw = useWidth(box);
  if (!c.debut || !c.fin || !c.prevu.length) return <div className="empty">Pas encore de données pour la courbe.</div>;
  const small = cw < 520, W = small ? Math.max(300, cw) : 640, H = small ? 230 : 280, L = small ? 40 : 46, B = 30, T = 16, R = small ? 40 : 56;
  const t0 = Date.parse(c.debut), t1 = Math.max(Date.parse(c.fin), t0 + 86400000);
  const max = niceMax(Math.max(1, c.budget, ...c.reel.map((p) => p[1]), ...c.prevu.map((p) => p[1])));
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const pts = (a: [string, number][]) => a.map((p) => [x(Date.parse(p[0])), y(p[1])] as const);
  const line = (a: [string, number][]) => pts(a).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const reel = c.reel, last = reel[reel.length - 1];
  const nowT = Date.parse(c.aujourdhui);
  const at = (a: [string, number][], t: number) => { let v = 0; for (const p of a) { if (Date.parse(p[0]) <= t) v = p[1]; else break; } return v; };
  const interp = (a: [string, number][], t: number) => { for (let i = 1; i < a.length; i++) { const ta = Date.parse(a[i - 1][0]), tb = Date.parse(a[i][0]); if (t <= tb) return a[i - 1][1] + ((a[i][1] - a[i - 1][1]) * (t - ta)) / Math.max(1, tb - ta); } return a[a.length - 1][1]; };
  const move = (e: React.MouseEvent<SVGRectElement>) => {
    const b = box.current!.getBoundingClientRect(), sv = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const k = W / sv.width, t = t0 + Math.max(0, Math.min(1, ((e.clientX - sv.left) * k - L) / (W - L - R))) * (t1 - t0);
    setHov({ t, px: e.clientX - b.left, py: e.clientY - b.top });
  };
  const ticks = (small ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((f) => t0 + f * (t1 - t0));
  const area = `${line(reel)}L${x(Date.parse(last[0])).toFixed(1)} ${y(0)}L${x(Date.parse(reel[0][0])).toFixed(1)} ${y(0)}Z`;
  return (
    <div className="chart" ref={box} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Courbe des dépenses cumulées, réel et prévu">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke={GRID} /><text x={L - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill={TXT} className="tnum">{compact(max * f)}</text></g>)}
        {ticks.map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill={TXT}>{fdShort(new Date(t).toISOString().slice(0, 10))}</text>)}
        <path d={area} fill="#047857" opacity="0.1" />
        <path d={line(c.prevu)} fill="none" stroke="#8a9a93" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
        <path d={line(reel)} fill="none" stroke="#047857" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {nowT >= t0 && nowT <= t1 && <line x1={x(nowT)} x2={x(nowT)} y1={T} y2={H - B} stroke="#c81e1e" strokeWidth="1" strokeDasharray="2 3" />}
        <circle cx={x(Date.parse(last[0]))} cy={y(last[1])} r="5" fill="#047857" stroke="#fff" strokeWidth="2" />
        <text x={x(Date.parse(last[0])) + 9} y={y(last[1]) + 4} fontSize="12" fontWeight="600" fill="#0b2a21" className="tnum">{compact(last[1])}</text>
        {!small && <text x={W - R + 6} y={y(c.prevu[c.prevu.length - 1][1]) + 4} fontSize="11" fill={TXT}>Prévu</text>}
        {hov && <line x1={x(hov.t)} x2={x(hov.t)} y1={T} y2={H - B} stroke="#0b2a21" strokeWidth="1" opacity="0.35" />}
        <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent" onMouseMove={move} onClick={(e) => move(e as unknown as React.MouseEvent<SVGRectElement>)} />
      </svg>
      {hov && <Tip x={hov.px} y={hov.py}><b>{fd(new Date(hov.t).toISOString().slice(0, 10))}</b><span>Réel <em className="tnum">{num(hov.t <= nowT ? at(reel, hov.t) : last[1])} {devise}</em></span><span>Prévu <em className="tnum">{num(interp(c.prevu, hov.t))} {devise}</em></span></Tip>}
      <div className="legend"><span><i style={{ background: "#047857" }} />Dépenses réelles (cumul)</span><span><i style={{ background: "#8a9a93" }} />Dépenses prévues</span><span><i style={{ background: "#c81e1e" }} />Aujourd’hui</span></div>
    </div>
  );
}
