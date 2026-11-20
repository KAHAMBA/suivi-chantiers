import { Icon } from "../components/Icon";
import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Top, type FieldDef } from "../components/ui";
import { Table, useCrud } from "../components/Crud";
import { METEO, fd, todayIso } from "../lib/util";
import type { Report } from "../lib/types";

export function Reports() {
  const { data, project, canWrite, pname, names } = useOrg();
  const projOpts = (data?.projects ?? []).map((p) => ({ v: p.id, l: p.nom }));
  const fields: FieldDef[] = [
    { name: "project_id", label: "Chantier", type: "select", options: projOpts },
    { name: "date", label: "Date", type: "date", required: true, half: true },
    { name: "effectif", label: "Effectif présent", type: "number", half: true },
    { name: "meteo", label: "Météo", type: "select", options: METEO },
    { name: "travaux", label: "Travaux réalisés", type: "textarea", required: true },
    { name: "problemes", label: "Problèmes rencontrés", type: "textarea" },
  ];
  const crud = useCrud<Report>("reports", fields, () => ({ project_id: project !== "all" ? project : projOpts[0]?.v, date: todayIso(), meteo: "Ensoleillé" }));
  if (!data) return null;
  const rows = inProject(data.reports, project).slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Top title="Rapports journaliers" sub="Ce qui s’est passé sur le chantier, jour après jour"><ProjectFilter />{canWrite && data.projects.length > 0 && <button className="btn" onClick={crud.add}><Icon n="plus" /> Nouveau rapport</button>}</Top>
      <div className="card"><Table crud={crud} rows={rows} empty="Aucun rapport."
        cols={[{ h: "Date", f: (r) => fd(r.date) }, { h: "Chantier", f: (r) => pname(r.project_id) }, { h: "Météo", f: (r) => r.meteo ?? "—" }, { h: "Effectif", n: true, f: (r) => r.effectif ?? "—" },
          { h: "Travaux réalisés", f: (r) => r.travaux }, { h: "Problèmes", f: (r) => r.problemes ? <span style={{ color: "var(--bad)" }}>{r.problemes}</span> : "—" }, { h: "Saisi par", f: (r) => names(r.created_by) }]} /></div>
      {crud.modal}
    </>
  );
}
