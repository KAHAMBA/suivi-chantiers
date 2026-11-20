import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Top, type FieldDef } from "../components/ui";
import { Table, useCrud } from "../components/Crud";
import { ROLES_METIER } from "../lib/util";
import type { TeamMember } from "../lib/types";

export function Team() {
  const { data, project, canWrite, pname } = useOrg();
  const projOpts = (data?.projects ?? []).map((p) => ({ v: p.id, l: p.nom }));
  const fields: FieldDef[] = [
    { name: "project_id", label: "Chantier", type: "select", options: projOpts },
    { name: "nom", label: "Nom", required: true, half: true },
    { name: "role", label: "Fonction", type: "select", options: ROLES_METIER, half: true },
    { name: "tel", label: "Téléphone", type: "tel" },
  ];
  const crud = useCrud<TeamMember>("team", fields, () => ({ project_id: project !== "all" ? project : projOpts[0]?.v, role: ROLES_METIER[4] }));
  if (!data) return null;
  const rows = inProject(data.team, project);
  return (
    <>
      <Top title="Équipe de chantier" sub="Intervenants par chantier"><ProjectFilter />{canWrite && data.projects.length > 0 && <button className="btn" onClick={crud.add}>+ Intervenant</button>}</Top>
      <div className="card"><Table crud={crud} rows={rows} empty="Aucun intervenant."
        cols={[{ h: "Nom", f: (r) => <b>{r.nom}</b> }, { h: "Fonction", f: (r) => r.role }, { h: "Chantier", f: (r) => pname(r.project_id) }, { h: "Téléphone", f: (r) => r.tel ?? "—" }]} /></div>
      {crud.modal}
    </>
  );
}
