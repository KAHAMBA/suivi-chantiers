import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Dashboard as Dash } from "../lib/types";
import { useOrg } from "../state/org";
import { ProjectFilter } from "../components/Shell";
import { BarChart, DonutChart, LineChart } from "../components/Charts";
import { Bar, EmptyState, Pill, Skeleton, Top } from "../components/ui";
import { Icon } from "../components/Icon";
import { fd, money, num, pct, todayIso } from "../lib/util";

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function Dashboard({ go }: { go: (v: string) => void }) {
  const { org, data, project, canManage, isAdmin } = useOrg();
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  const stamp = data ? `${data.projects.length}-${data.tasks.length}-${data.expenses.length}-${data.phases.map((p) => p.av).join(",")}-${data.incidents.length}-${data.controls.length}` : "";

  useEffect(() => {
    let live = true;
    const q = new URLSearchParams({ today: todayIso() }); if (project !== "all") q.set("project_id", project);
    api.get<Dash>(`/orgs/${org.id}/dashboard?${q}`).then((r) => live && (setD(r), setErr(""))).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [org.id, project, stamp]);

  if (err) return <div className="alert" role="alert">{err}</div>;
  if (!d) return <Skeleton rows={3} />;
  const k = d.kpi, late = d.projets.filter((p) => p.statut === "bad").length;
  if (!k.chantiers && project === "all") {
    return (<><Top title="Tableau de bord" sub={org.nom} />
      <div className="panel"><EmptyState title="Aucun chantier pour le moment" text={isAdmin ? "Créez votre premier chantier, ou chargez des données d’exemple dans « Accès & abonnement » pour découvrir la plateforme." : "Un conducteur des travaux ou un administrateur peut créer le premier chantier."}
        action={canManage && <button className="btn" onClick={() => go("proj")}><Icon n="plus" /> Créer un chantier</button>} /></div></>);
  }
  const alerts = [k.taches_retard && plural(k.taches_retard, "tâche en retard", "tâches en retard"), k.incidents_ouverts && plural(k.incidents_ouverts, "incident ouvert", "incidents ouverts"), k.defauts_ouverts && plural(k.defauts_ouverts, "défaut qualité ouvert", "défauts qualité ouverts")].filter(Boolean) as string[];
  return (
    <>
      <Top title="Tableau de bord" sub={`${org.nom} · ${fd(todayIso())}`}><ProjectFilter /></Top>
      <p className="lede">
        {plural(k.chantiers, "chantier", "chantiers")}, avancement moyen de <b className="tnum">{pct(k.avancement)}</b>
        {late ? <>, dont <b className="bad">{plural(late, "en retard", "en retard")}</b></> : <>, tous dans les délais</>}.
        {" "}{alerts.length ? <>À traiter : {alerts.join(", ")}.</> : <>Rien d’urgent à signaler.</>}
      </p>
      <section className="kpis" aria-label="Indicateurs clés">
        <div><span>Avancement global</span><strong className="tnum">{pct(k.avancement)}</strong><Bar value={k.avancement} /><small>{k.en_cours} en cours</small></div>
        <div><span>Budget consommé</span><strong className="tnum">{pct(k.pct_budget)}</strong><Bar value={k.pct_budget} red={k.pct_budget > 100} /><small className="tnum">{money(k.depense, org.devise)} sur {money(k.budget_total, org.devise)}</small></div>
        <div><span>Tâches du jour</span><strong className="tnum">{k.taches_jour_faites}<em>/{k.taches_jour}</em></strong><small>terminées aujourd’hui</small></div>
        <div className={k.taches_retard ? "alert-cell" : ""}><span>Tâches en retard</span><strong className="tnum">{num(k.taches_retard)}</strong><small>{k.taches_retard ? "à replanifier" : "aucune"}</small></div>
        <div className={k.incidents_ouverts + k.defauts_ouverts ? "alert-cell" : ""}><span>Sécurité et qualité</span><strong className="tnum">{k.incidents_ouverts + k.defauts_ouverts}</strong><small>{k.incidents_ouverts} incident(s) · {k.defauts_ouverts} défaut(s)</small></div>
      </section>
      <div className="grid2">
        <section className="panel"><h3>Budget par poste</h3><BarChart rows={d.budget_par_poste} devise={org.devise} /></section>
        <section className="panel"><h3>Répartition des dépenses</h3><DonutChart rows={d.repartition} devise={org.devise} /></section>
      </div>
      <section className="panel"><h3>Dépenses cumulées</h3><LineChart c={d.courbe} devise={org.devise} /></section>
      <section className="panel"><h3>Situation des chantiers</h3>
        <table className="rt"><thead><tr><th>Chantier</th><th>Avancement</th><th>Prévu</th><th>Situation</th><th>Fin prévue</th><th className="n">Budget consommé</th></tr></thead>
          <tbody>{d.projets.map((p) => <tr key={p.id}><td data-label="Chantier"><b>{p.nom}</b></td><td data-label="Avancement" className="prog"><Bar value={p.avancement} /><span className="tnum">{pct(p.avancement)}</span></td><td data-label="Prévu" className="tnum">{pct(p.prevu)}</td>
            <td data-label="Situation"><Pill kind={p.statut === "bad" ? "bad" : ""}>{p.libelle}</Pill></td><td data-label="Fin prévue">{fd(p.fin)}</td><td data-label="Budget consommé" className="n tnum">{pct(p.pct_budget)}</td></tr>)}</tbody></table>
      </section>
    </>
  );
}
