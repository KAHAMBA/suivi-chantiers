import { useState } from "react";
import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Pill, Top, useToast, type FieldDef } from "../components/ui";
import { useCrud } from "../components/Crud";
import { PHASES, STAT, addDays, fd, todayIso } from "../lib/util";
import type { Task } from "../lib/types";

const PER = [["today", "Aujourd’hui"], ["week", "7 jours"], ["late", "En retard"], ["all", "Toutes"]] as const;

export function Tasks() {
  const { data, project, update, canWrite, pname, names } = useOrg();
  const toast = useToast();
  const [per, setPer] = useState<(typeof PER)[number][0]>("today");
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
  const late = (t: Task) => t.statut !== "Terminé" && t.date < today;
  let rows = inProject(data.tasks, project);
  if (per === "today") rows = rows.filter((t) => t.date === today);
  if (per === "week") rows = rows.filter((t) => t.date >= today && t.date <= addDays(today, 7));
  if (per === "late") rows = rows.filter(late);
  rows = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const move = async (t: Task, d: number) => { try { await update("tasks", t.id, { statut: STAT[STAT.indexOf(t.statut) + d] }); } catch (e: any) { toast(e.message, true); } };
  return (
    <>
      <Top title="Tâches journalières" sub="Planification et suivi de l’exécution"><ProjectFilter />{canWrite && data.projects.length > 0 && <button className="btn" onClick={crud.add}><Icon n="plus" /> Nouvelle tâche</button>}</Top>
      <div className="tabs" role="group" aria-label="Période">{PER.map(([k, l]) => <button key={k} className={per === k ? "on" : ""} aria-pressed={per === k} onClick={() => setPer(k)}>{l}</button>)}</div>
      <div className="kanban">{STAT.map((s) => { const c = rows.filter((t) => t.statut === s); return (
        <div className={"col st-" + STAT.indexOf(s)} key={s}><h4><i />{s}<span className="tnum">{c.length}</span></h4>
          {!c.length && <p className="col-empty">Rien ici.</p>}
          {c.map((t) => (
            <div className={`kc task p-${t.prio}${late(t) ? " late" : ""}`} key={t.id}><b>{t.titre}</b>
              <div className="meta"><span>{fd(t.date)}</span><span>{pname(t.project_id)}</span><span>{t.assigne || "Non assigné"}</span>{t.created_by && <span>saisi par {names(t.created_by)}</span>}{t.phase && <span>{t.phase}</span>}</div>
              {late(t) && <div className="row"><Pill kind="bad">En retard</Pill></div>}
              {canWrite && <div className="acts">
                {s !== "À faire" && <button className="btn ghost sm" onClick={() => move(t, -1)} aria-label="Reculer"><Icon n="back" size={16} /></button>}
                {s !== "Terminé" && <button className="btn sm" onClick={() => move(t, 1)} aria-label="Avancer"><Icon n="next" size={16} /></button>}
                <button className="icon-btn" onClick={() => crud.editRow(t)} aria-label="Modifier" title="Modifier"><Icon n="edit" /></button><button className="icon-btn danger" onClick={() => crud.del(t)} aria-label="Supprimer" title="Supprimer"><Icon n="trash" /></button></div>}
            </div>))}
        </div>); })}</div>
      {crud.modal}
    </>
  );
}
