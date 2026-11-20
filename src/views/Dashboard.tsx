import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Dashboard as Dash } from "../lib/types";
import { useOrg } from "../state/org";
import { ProjectFilter } from "../components/Shell";
import { BarChart, LineChart, PieChart } from "../components/Charts";
import { Bar, Empty, Pill, Top } from "../components/ui";
import { fd, money, pct, todayIso } from "../lib/util";

export function Dashboard({ go }: { go: (v: string) => void }) {
  const { org, data, project, canManage, isAdmin, create } = useOrg();
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  const stamp = data ? `${data.projects.length}-${data.tasks.length}-${data.expenses.length}-${data.phases.map((p) => p.av).join(",")}-${data.incidents.length}-${data.controls.length}` : "";

  useEffect(() => {
    let live = true;
    const q = new URLSearchParams({ today: todayIso() }); if (project !== "all") q.set("project_id", project);
    api.get<Dash>(`/orgs/${org.id}/dashboard?${q}`).then((r) => live && (setD(r), setErr(""))).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [org.id, project, stamp]);

  if (err) return <div className="err-text">{err}</div>;
  if (!d) return <div className="empty">Chargement…</div>;
  const k = d.kpi;
  if (!k.chantiers && project === "all") {
    return (<><Top title="Tableau de bord" sub={org.nom} />
      <div className="card"><Empty><h3>Aucun chantier pour le moment</h3><p>Créez votre premier chantier{isAdmin ? " ou chargez des données d’exemple pour découvrir la plateforme (rubrique « Accès & abonnement »)" : ""}.</p>
        {canManage && <button className="btn" onClick={() => go("proj")}>Créer un chantier</button>}</Empty></div></>);
  }
  return (
    <>
      <Top title="Tableau de bord" sub={`${org.nom} — ${fd(todayIso())}`}><ProjectFilter /></Top>
      <div className="hero">
        <div><div className="big">{pct(k.avancement)}</div><div>Avancement global</div></div>
        <div><div className="big">{k.chantiers}</div><div>Chantier{k.chantiers > 1 ? "s" : ""} · {k.en_cours} en cours</div></div>
        <div style={{ flex: 1, minWidth: 220 }}><div className="big">{pct(k.pct_budget)}</div><div>du budget consommé ({money(k.depense, org.devise)} / {money(k.budget_total, org.devise)})</div></div>
      </div>
      <div className="tiles">
        <div className="tile"><small>Tâches du jour</small><b>{k.taches_jour_faites}/{k.taches_jour}</b></div>
        <div className={"tile" + (k.taches_retard ? " bad" : "")}><small>Tâches en retard</small><b>{k.taches_retard}</b></div>
        <div className={"tile" + (k.incidents_ouverts ? " bad" : "")}><small>Incidents ouverts</small><b>{k.incidents_ouverts}</b></div>
        <div className={"tile" + (k.defauts_ouverts ? " bad" : "")}><small>Défauts qualité ouverts</small><b>{k.defauts_ouverts}</b></div>
      </div>
      <div className="grid2">
        <div className="card"><h3>Budget prévu et dépensé par poste</h3><BarChart rows={d.budget_par_poste} /></div>
        <div className="card"><h3>Répartition des dépenses</h3><PieChart rows={d.repartition} /></div>
      </div>
      <div className="card"><h3>Courbe des dépenses cumulées</h3><LineChart c={d.courbe} /></div>
      <div className="card"><h3>Situation des chantiers</h3>
        <table><thead><tr><th>Chantier</th><th>Avancement</th><th>Prévu</th><th>Situation</th><th>Fin prévue</th><th className="n">Budget consommé</th></tr></thead>
          <tbody>{d.projets.map((p) => <tr key={p.id}><td><b>{p.nom}</b></td><td style={{ minWidth: 120 }}><Bar value={p.avancement} /> {pct(p.avancement)}</td><td>{pct(p.prevu)}</td>
            <td><Pill kind={p.statut === "bad" ? "bad" : ""}>{p.libelle}</Pill></td><td>{fd(p.fin)}</td><td className="n">{pct(p.pct_budget)}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
