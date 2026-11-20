import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Pill, Top, type FieldDef } from "../components/ui";
import { Table, useCrud } from "../components/Crud";
import { fd, todayIso } from "../lib/util";
import type { Incident } from "../lib/types";

const TYPES = ["Non-port des EPI", "Presque-accident", "Accident", "Chute de hauteur", "Incident matériel", "Autre"];

export function Safety() {
  const { data, project, canWrite, pname } = useOrg();
  const projOpts = (data?.projects ?? []).map((p) => ({ v: p.id, l: p.nom }));
  const fields: FieldDef[] = [
    { name: "project_id", label: "Chantier", type: "select", options: projOpts },
    { name: "date", label: "Date", type: "date", required: true, half: true },
    { name: "type", label: "Type", type: "select", options: TYPES, half: true },
    { name: "gravite", label: "Gravité", type: "select", options: ["Mineur", "Modéré", "Grave"], half: true },
    { name: "statut", label: "Statut", type: "select", options: ["Ouvert", "Clos"], half: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "mesure", label: "Mesure corrective", type: "textarea" },
  ];
  const crud = useCrud<Incident>("incidents", fields, () => ({ project_id: project !== "all" ? project : projOpts[0]?.v, date: todayIso(), type: TYPES[0], gravite: "Mineur", statut: "Ouvert" }));
  if (!data) return null;
  const rows = inProject(data.incidents, project).slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Top title="Sécurité" sub={`${rows.filter((r) => r.statut === "Ouvert").length} incident(s) ouvert(s) sur ${rows.length}`}><ProjectFilter />{canWrite && data.projects.length > 0 && <button className="btn" onClick={crud.add}>+ Incident</button>}</Top>
      <div className="card"><Table crud={crud} rows={rows} empty="Aucun incident enregistré."
        cols={[{ h: "Date", f: (r) => fd(r.date) }, { h: "Chantier", f: (r) => pname(r.project_id) }, { h: "Type", f: (r) => r.type },
          { h: "Gravité", f: (r) => <Pill kind={r.gravite === "Grave" ? "bad" : r.gravite === "Modéré" ? "warn" : ""}>{r.gravite}</Pill> },
          { h: "Description", f: (r) => r.description ?? "—" }, { h: "Mesure", f: (r) => r.mesure ?? "—" }, { h: "Statut", f: (r) => <Pill kind={r.statut === "Ouvert" ? "bad" : ""}>{r.statut}</Pill> }]} /></div>
      {crud.modal}
    </>
  );
}
