import { fdShort, num } from "../lib/util";

const COL = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)", "var(--c7)", "var(--c8)", "var(--c9)"];
const short = (s: string) => (s.length > 14 ? s.slice(0, 13) + "…" : s);

export function BarChart({ rows }: { rows: { poste: string; prevu: number; depense: number }[] }) {
  const W = 640, H = 280, L = 56, B = 56, T = 12, R = 8;
  const max = Math.max(1, ...rows.flatMap((r) => [r.prevu, r.depense]));
  const bw = (W - L - R) / Math.max(1, rows.length);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Budget prévu et dépensé par poste">
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} stroke="#e3e8e5" /><text x={L - 6} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="#5b6f67">{num(max * t)}</text></g>)}
        {rows.map((r, i) => {
          const x = L + i * bw;
          return (
            <g key={r.poste}>
              <title>{`${r.poste} — prévu ${num(r.prevu)}, dépensé ${num(r.depense)}`}</title>
              <rect x={x + bw * 0.12} width={bw * 0.36} y={y(r.prevu)} height={H - B - y(r.prevu)} fill="var(--c2)" rx="3" />
              <rect x={x + bw * 0.5} width={bw * 0.36} y={y(r.depense)} height={H - B - y(r.depense)} fill={r.depense > r.prevu ? "var(--c3)" : "var(--c1)"} rx="3" />
              <text transform={`translate(${x + bw / 2},${H - B + 14}) rotate(30)`} fontSize="10.5" fill="#5b6f67">{short(r.poste)}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend"><span><i style={{ background: "var(--c2)" }} />Prévu</span><span><i style={{ background: "var(--c1)" }} />Dépensé</span><span><i style={{ background: "var(--c3)" }} />Dépassement</span></div>
    </>
  );
}

export function PieChart({ rows }: { rows: { poste: string; montant: number }[] }) {
  const total = rows.reduce((s, r) => s + r.montant, 0);
  if (!total) return <div className="empty">Aucune dépense enregistrée.</div>;
  const R = 90, r = 52, cx = 110, cy = 110;
  let a0 = -Math.PI / 2;
  const arcs = rows.map((row, i) => {
    const a1 = a0 + (row.montant / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const full = rows.length === 1;
    const p = (rad: number, a: number) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
    const d = full
      ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
      : `M ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`;
    a0 = a1;
    return <path key={row.poste} d={d} fill={COL[i % COL.length]} fillRule="evenodd"><title>{`${row.poste} — ${num(row.montant)} (${Math.round((row.montant / total) * 100)} %)`}</title></path>;
  });
  return (
    <div className="row" style={{ alignItems: "center" }}>
      <svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label="Répartition des dépenses">{arcs}<text x={cx} y={cy - 2} textAnchor="middle" fontSize="12" fill="#5b6f67">Total</text><text x={cx} y={cy + 16} textAnchor="middle" fontSize="15" fontWeight="700">{num(total)}</text></svg>
      <div className="legend" style={{ flexDirection: "column", gap: 6 }}>
        {rows.map((row, i) => <span key={row.poste}><i style={{ background: COL[i % COL.length] }} />{row.poste} — {Math.round((row.montant / total) * 100)} %</span>)}
      </div>
    </div>
  );
}

export function LineChart({ c }: { c: { debut: string | null; fin: string | null; aujourdhui: string; reel: [string, number][]; prevu: [string, number][]; budget: number } }) {
  if (!c.debut || !c.fin || !c.prevu.length) return <div className="empty">Pas encore de données pour la courbe.</div>;
  const W = 640, H = 270, L = 56, B = 30, T = 12, R = 12;
  const t0 = Date.parse(c.debut), t1 = Math.max(Date.parse(c.fin), t0 + 86400000);
  const max = Math.max(1, c.budget, ...c.reel.map((p) => p[1]), ...c.prevu.map((p) => p[1]));
  const x = (iso: string) => L + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const path = (pts: [string, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  const xt = [0, 0.25, 0.5, 0.75, 1].map((f) => new Date(t0 + f * (t1 - t0)).toISOString().slice(0, 10));
  const tx = Date.parse(c.aujourdhui) >= t0 && Date.parse(c.aujourdhui) <= t1 ? x(c.aujourdhui) : null;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Courbe des dépenses cumulées">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="#e3e8e5" /><text x={L - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="#5b6f67">{num(max * f)}</text></g>)}
        {xt.map((d) => <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="11" fill="#5b6f67">{fdShort(d)}</text>)}
        <path d={path(c.prevu)} fill="none" stroke="var(--c7)" strokeWidth="2.5" strokeDasharray="6 5" />
        {c.reel.length > 0 && <path d={path(c.reel)} fill="none" stroke="var(--c1)" strokeWidth="3" />}
        {tx !== null && <g><line x1={tx} x2={tx} y1={T} y2={H - B} stroke="var(--bad)" strokeDasharray="3 3" /><text x={tx + 4} y={T + 10} fontSize="11" fill="var(--bad)">Aujourd’hui</text></g>}
      </svg>
      <div className="legend"><span><i style={{ background: "var(--c1)" }} />Dépenses réelles (cumul)</span><span><i style={{ background: "var(--c7)" }} />Dépenses prévues</span></div>
    </>
  );
}
