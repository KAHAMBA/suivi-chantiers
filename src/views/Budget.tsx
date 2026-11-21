import { Icon } from "../components/Icon";
import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Bar, Top, type FieldDef } from "../components/ui";
import { Table, useCrud } from "../components/Crud";
import { CATS, fd, money, todayIso } from "../lib/util";
import type { Expense } from "../lib/types";

export function Budget() {
  const { data, project, canManage, pname, org } = useOrg();
  const projOpts = (data?.projects ?? []).map((p) => ({ v: p.id, l: p.nom }));
  const fields: FieldDef[] = [
    { name: "project_id", label: "Chantier", type: "select", options: projOpts },
    { name: "cat", label: "Poste de dépense", type: "select", options: CATS },
    { name: "libelle", label: "Libellé", required: true },
    { name: "montant", label: "Montant", type: "number", required: true, half: true },
    { name: "date", label: "Date", type: "date", required: true, half: true },
  ];
  const crud = useCrud<Expense>("expenses", fields, () => ({ project_id: project !== "all" ? project : projOpts[0]?.v, cat: CATS[3], date: todayIso() }), "manage");
  if (!data) return null;
  const projects = data.projects.filter((p) => project === "all" || p.id === project);
  const ex = inProject(data.expenses, project).slice().sort((a, b) => b.date.localeCompare(a.date));
  const prevu = (c: string) => projects.reduce((s, p) => s + (p.bud?.[c] ?? 0), 0);
  const dep = (c: string) => ex.filter((e) => e.cat === c).reduce((s, e) => s + Number(e.montant), 0);
  const tp = projects.reduce((s, p) => s + Number(p.budget), 0), td = ex.reduce((s, e) => s + Number(e.montant), 0);
  return (
    <>
      <Top title="Budget et dépenses" sub={`${money(td, org.devise)} dépensés sur ${money(tp, org.devise)}`}><ProjectFilter />{canManage && data.projects.length > 0 && <button className="btn" onClick={crud.add}><Icon n="plus" /> Dépense</button>}</Top>
      <div className="card"><h3>Prévu / dépensé par poste</h3>
        <table className="rt"><thead><tr><th>Poste</th><th className="n">Prévu</th><th className="n">Dépensé</th><th>Consommation</th></tr></thead>
          <tbody>{CATS.map((c) => { const pv = prevu(c), d = dep(c), r = pv ? (d / pv) * 100 : d ? 100 : 0; return <tr key={c}><td data-label="Poste">{c}</td><td data-label="Prévu" className="n tnum">{money(pv, org.devise)}</td><td data-label="Dépensé" className="n tnum" style={d > pv && pv > 0 ? { color: "var(--bad)" } : undefined}>{money(d, org.devise)}</td><td data-label="Consommation" style={{ minWidth: 130 }}><Bar value={r} red={d > pv} /></td></tr>; })}</tbody></table></div>
      <div className="card"><h3>Dépenses</h3><Table crud={crud} rows={ex} empty="Aucune dépense enregistrée."
        cols={[{ h: "Date", f: (r) => fd(r.date) }, { h: "Chantier", f: (r) => pname(r.project_id) }, { h: "Poste", f: (r) => r.cat }, { h: "Libellé", f: (r) => r.libelle }, { h: "Montant", n: true, f: (r) => money(r.montant, org.devise) }]} /></div>
      {crud.modal}
    </>
  );
}
