import { Icon } from "../components/Icon";
import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Pill, Top, type FieldDef } from "../components/ui";
import { Table, useCrud } from "../components/Crud";
import { CTRL, fd, todayIso } from "../lib/util";
import type { Control } from "../lib/types";

export function Quality() {
  const { data, project, canWrite, pname } = useOrg();
  const projOpts = (data?.projects ?? []).map((p) => ({ v: p.id, l: p.nom }));
  const fields: FieldDef[] = [
    { name: "project_id", label: "Chantier", type: "select", options: projOpts },
    { name: "type", label: "Type de contrôle", type: "select", options: CTRL },
    { name: "date", label: "Date", type: "date", required: true, half: true },
    { name: "resultat", label: "Résultat", type: "select", options: ["Conforme", "Défaut ouvert", "Défaut corrigé"], half: true },
    { name: "note", label: "Observations", type: "textarea" },
  ];
  const crud = useCrud<Control>("controls", fields, () => ({ project_id: project !== "all" ? project : projOpts[0]?.v, type: CTRL[0], date: todayIso(), resultat: "Conforme" }));
  if (!data) return null;
  const rows = inProject(data.controls, project).slice().sort((a, b) => b.date.localeCompare(a.date));
  const ok = rows.filter((c) => c.resultat === "Conforme").length, open = rows.filter((c) => c.resultat === "Défaut ouvert").length;
  return (
    <>
      <Top title="Qualité" sub={`${rows.length} contrôle(s) · ${ok} conforme(s) · ${open} défaut(s) ouvert(s)`}><ProjectFilter />{canWrite && data.projects.length > 0 && <button className="btn" onClick={crud.add}><Icon n="plus" /> Contrôle</button>}</Top>
      <div className="card"><Table crud={crud} rows={rows} empty="Aucun contrôle enregistré."
        cols={[{ h: "Date", f: (r) => fd(r.date) }, { h: "Chantier", f: (r) => pname(r.project_id) }, { h: "Contrôle", f: (r) => r.type },
          { h: "Résultat", f: (r) => <Pill kind={r.resultat === "Défaut ouvert" ? "bad" : ""}>{r.resultat}</Pill> }, { h: "Observations", f: (r) => r.note ?? "—" }]} /></div>
      {crud.modal}
    </>
  );
}
