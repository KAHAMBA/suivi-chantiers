import { useRef } from "react";
import { useOrg } from "../state/org";
import { ProjectFilter } from "../components/Shell";
import { Icon } from "../components/Icon";
import { EmptyState, Top, useToast, type FieldDef } from "../components/ui";
import { useCrud } from "../components/Crud";
import { fd, isoDays, todayIso } from "../lib/util";
import type { Phase } from "../lib/types";

const FIELDS: FieldDef[] = [
  { name: "nom", label: "Nom de la phase", required: true },
  { name: "debut", label: "Début", type: "date", required: true, half: true },
  { name: "fin", label: "Fin", type: "date", required: true, half: true },
  { name: "av", label: "Avancement (%)", type: "number", half: true },
];

export function Plan() {
  const { data, project, canWrite, update } = useOrg();
  const toast = useToast();
  const target = useRef("");
  const crud = useCrud<Phase>("phases", FIELDS, () => ({ project_id: target.current, debut: todayIso(), fin: todayIso(), av: 0 }));
  if (!data) return null;
  const today = todayIso();
  const projects = data.projects.filter((p) => project === "all" || p.id === project);
  const setAv = async (id: string, av: number) => { try { await update("phases", id, { av }); } catch (e: any) { toast(e.message, true); } };
  return (
    <>
      <Top title="Planning" sub="Phases d’exécution et avancement"><ProjectFilter /></Top>
      {!projects.length && <div className="card"><EmptyState title="Aucun chantier" text="Créez un chantier pour voir son planning." /></div>}
      {projects.map((p) => {
        const phases = data.phases.filter((x) => x.project_id === p.id).sort((a, b) => a.debut.localeCompare(b.debut));
        const span = Math.max(1, isoDays(p.debut, p.fin));
        const pos = (iso: string) => Math.max(0, Math.min(100, (isoDays(p.debut, iso) / span) * 100));
        const tx = pos(today);
        return (
          <section className="card" key={p.id}>
            <div className="row between"><h2>{p.nom}</h2>{canWrite && <button className="btn ghost sm" onClick={() => { target.current = p.id; crud.add(); }}><Icon n="plus" size={16} /> Ajouter une phase</button>}</div>
            <p className="small muted" style={{ margin: "4px 0 10px" }}>Ligne rouge : aujourd’hui. Partie foncée : avancement réel.</p>
            <div style={{ overflowX: "auto" }}><div className="gantt">
              {phases.map((ph) => (
                <div className="g-row" key={ph.id}>
                  <div><div style={{ fontWeight: 600 }}>{ph.nom}</div><div className="small muted">{fd(ph.debut)} au {fd(ph.fin)}</div></div>
                  <div className="gtrack"><div className="gbar" style={{ left: `${pos(ph.debut)}%`, width: `${Math.max(0.8, Math.min(100 - pos(ph.debut), pos(ph.fin) - pos(ph.debut)))}%` }}><i style={{ width: `${ph.av}%` }} /></div><div className="today" style={{ left: `${tx}%` }} title="Aujourd’hui" /></div>
                  <div className="g-ctl"><input type="range" min={0} max={100} step={5} defaultValue={ph.av} key={ph.id + ph.av} disabled={!canWrite} aria-label={`Avancement ${ph.nom}`}
                    onMouseUp={(e) => setAv(ph.id, +(e.target as HTMLInputElement).value)} onTouchEnd={(e) => setAv(ph.id, +(e.target as HTMLInputElement).value)} onKeyUp={(e) => setAv(ph.id, +(e.target as HTMLInputElement).value)} />
                    <b className="tnum" style={{ minWidth: 40, textAlign: "right" }}>{ph.av} %</b>
                    {canWrite && <button className="icon-btn" onClick={() => crud.editRow(ph)} aria-label="Modifier la phase" title="Modifier"><Icon n="edit" /></button>}</div>
                </div>))}
            </div></div>
          </section>
        );
      })}
      {crud.modal}
    </>
  );
}
