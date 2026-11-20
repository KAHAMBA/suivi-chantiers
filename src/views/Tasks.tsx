import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Icon } from "../components/Icon";
import { EmptyState, Pill, Top, useToast, type FieldDef } from "../components/ui";
import { useCrud } from "../components/Crud";
import { PHASES, STAT, fd, todayIso } from "../lib/util";
import type { Task } from "../lib/types";

export function Tasks() {
  const { data, project, update, canWrite, pname } = useOrg();
  const toast = useToast();
  const projOpts = (data?.projects ?? []).map((p) => ({ v: p.id, l: p.nom }));
  const fields: FieldDef[] = [
    { name: "project_id", label: "Chantier", type: "select", options: projOpts },
    { name: "titre", label: "Tâche", required: true },
    { name: "date", label: "Date", type: "date", required: true, half: true },
    { name: "prio", label: "Priorité", type: "select", options: ["haute", "normale", "basse"], half: true },
    { name: "assigne", label: "Assignée à", half: true },
    { name: "statut", label: "Statut", type: "select", options: [...STAT], half: true },
    { name: "phase", label: "Phase", type: "select", options: ["", ...PHASES] },
  ];
  const crud = useCrud<Task>("tasks", fields, () => ({ project_id: project !== "all" ? project : projOpts[0]?.v, date: todayIso(), statut: "À faire", prio: "normale", phase: "" }));
  if (!data) return null;
  const today = todayIso();
  const rows = inProject(data.tasks, project).slice().sort((a, b) => a.date.localeCompare(b.date));
  const move = async (t: Task, statut: string) => { try { await update("tasks", t.id, { statut }); } catch (e: any) { toast(e.message, true); } };
  return (
    <>
      <Top title="Tâches journalières" sub="Planification et suivi de l’exécution"><ProjectFilter />{canWrite && data.projects.length > 0 && <button className="btn" onClick={crud.add}><Icon n="plus" /> Nouvelle tâche</button>}</Top>
      <div className="kanban">{STAT.map((s) => (
        <div className={"col st-" + STAT.indexOf(s)} key={s}><h4><i />{s}<span className="tnum">{rows.filter((t) => t.statut === s).length}</span></h4>{!rows.some((t) => t.statut === s) && <p className="col-empty">Aucune tâche</p>}
          {rows.filter((t) => t.statut === s).map((t) => (
            <div className="kc" key={t.id}><b>{t.titre}</b>
              <small>{fd(t.date)} · {pname(t.project_id)}{t.assigne ? ` · ${t.assigne}` : ""}</small>
              <div className="row">{t.prio === "haute" && <Pill kind="bad">Haute</Pill>}{t.statut !== "Terminé" && t.date < today && <Pill kind="bad">En retard</Pill>}{t.phase && <Pill kind="grey">{t.phase}</Pill>}</div>
              {canWrite && <div className="kc-act"><select className="status-sel" aria-label={`Statut de ${t.titre}`} value={t.statut} onChange={(e) => move(t, e.target.value)}>{STAT.map((x) => <option key={x}>{x}</option>)}</select>
                <button className="icon-btn" onClick={() => crud.editRow(t)} aria-label="Modifier" title="Modifier"><Icon n="edit" /></button><button className="icon-btn danger" onClick={() => crud.del(t)} aria-label="Supprimer" title="Supprimer"><Icon n="trash" /></button></div>}
            </div>))}
        </div>))}</div>
      {crud.modal}
    </>
  );
}
