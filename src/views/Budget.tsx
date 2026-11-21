import { useOrg } from "../state/org";
import { ProjectFilter, inProject } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Bar, EmptyState, Pill, Top, type FieldDef } from "../components/ui";
import { Table, useCrud } from "../components/Crud";
import { CATS, fd, money, pc, todayIso } from "../lib/util";
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
  const m = (n: number) => money(n, org.devise);
  return (
    <>
      <Top title="Budget et dépenses" sub="Suivi du prévisionnel et des dépenses par poste">{<ProjectFilter />}{canManage && data.projects.length > 0 && <button className="btn" onClick={crud.add}><Icon n="plus" /> Dépense</button>}</Top>
      {!projects.length && <div className="card"><EmptyState title="Aucun chantier" text="Créez un chantier pour suivre son budget." /></div>}
      {projects.map((p) => {
        const rows = CATS.map((c) => ({ c, pr: Number(p.bud?.[c] ?? 0), d: data.expenses.filter((e) => e.project_id === p.id && e.cat === c).reduce((s, e) => s + Number(e.montant), 0) })).filter((r) => r.pr || r.d);
        const tot = data.expenses.filter((e) => e.project_id === p.id).reduce((s, e) => s + Number(e.montant), 0), v = pc(tot, Number(p.budget));
        return (
          <section className="card" key={p.id}>
            <div className="row between"><h2>{p.nom}</h2><Pill kind={v > 100 ? "bad" : v > 85 ? "warn" : ""}>{v} % consommé</Pill></div>
            <div style={{ margin: "10px 0 6px" }}><Bar value={v} red={v > 100} /></div>
            <table className="rt"><thead><tr><th>Poste</th><th className="n">Prévu</th><th className="n">Dépensé</th><th className="n">Reste</th><th>Consommation</th></tr></thead>
              <tbody>{rows.map((r) => { const x = pc(r.d, r.pr); return <tr key={r.c}><td data-label="Poste">{r.c}</td><td data-label="Prévu" className="n tnum">{m(r.pr)}</td><td data-label="Dépensé" className="n tnum">{m(r.d)}</td><td data-label="Reste" className="n tnum" style={r.pr - r.d < 0 ? { color: "var(--bad)" } : undefined}>{m(r.pr - r.d)}</td><td data-label="Consommation" style={{ minWidth: 130 }}><Bar value={x} red={x > 100} /></td></tr>; })}
                <tr className="total"><td data-label="Total"><b>Total</b></td><td data-label="Prévu" className="n tnum"><b>{m(Number(p.budget))}</b></td><td data-label="Dépensé" className="n tnum"><b>{m(tot)}</b></td><td data-label="Reste" className="n tnum"><b>{m(Number(p.budget) - tot)}</b></td><td /></tr></tbody></table>
          </section>
        );
      })}
      <section className="card"><h2>Dépenses enregistrées</h2><Table crud={crud} rows={ex} empty="Aucune dépense enregistrée."
        cols={[{ h: "Date", f: (r) => fd(r.date) }, { h: "Chantier", f: (r) => pname(r.project_id) }, { h: "Poste", f: (r) => r.cat }, { h: "Libellé", f: (r) => r.libelle }, { h: "Montant", n: true, f: (r) => m(r.montant) }]} /></section>
      {crud.modal}
    </>
  );
}
