import { useOrg } from "../state/org";
import { ProjectFilter } from "../components/Shell";
import { Empty, Top } from "../components/ui";
import { fd, fdShort, isoDays, progress, todayIso } from "../lib/util";

export function Plan() {
  const { data, project } = useOrg();
  if (!data) return null;
  const today = todayIso();
  const projects = data.projects.filter((p) => project === "all" || p.id === project);
  return (
    <>
      <Top title="Planning" sub="Phases d’exécution et avancement"><ProjectFilter /></Top>
      {!projects.length && <div className="card"><Empty>Aucun chantier.</Empty></div>}
      {projects.map((p) => {
        const phases = data.phases.filter((x) => x.project_id === p.id);
        const t0 = p.debut, span = Math.max(1, isoDays(p.debut, p.fin));
        const pos = (iso: string) => Math.max(0, Math.min(100, (isoDays(t0, iso) / span) * 100));
        const tx = today >= p.debut && today <= p.fin ? pos(today) : null;
        return (
          <div className="card" key={p.id}><h3>{p.nom} — {progress(phases)} %</h3>
            <div style={{ overflowX: "auto" }}><div className="gantt">
              <div className="grow" style={{ color: "var(--muted)", fontSize: 12 }}><span /><div className="row" style={{ justifyContent: "space-between" }}><span>{fdShort(p.debut)}</span><span>{fdShort(p.fin)}</span></div><span /></div>
              {phases.map((ph) => (
                <div className="grow" key={ph.id}><span title={`${fd(ph.debut)} → ${fd(ph.fin)}`}>{ph.nom}</span>
                  <div className="gtrack">{tx !== null && <i className="today" style={{ left: `${tx}%` }} />}
                    <div className="gbar" style={{ left: `${pos(ph.debut)}%`, width: `${Math.max(1.5, pos(ph.fin) - pos(ph.debut))}%` }}><i style={{ width: `${ph.av}%` }} /></div></div>
                  <span>{ph.av} %</span></div>))}
            </div></div>
          </div>
        );
      })}
    </>
  );
}
