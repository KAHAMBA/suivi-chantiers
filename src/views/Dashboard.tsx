import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Dashboard as Dash } from "../lib/types";
import { useOrg } from "../state/org";
import { ProjectFilter } from "../components/Shell";
import { BarChart, DonutChart, LineChart } from "../components/Charts";
import { Bar, EmptyState, Pill, Skeleton, Top, useToast } from "../components/ui";
import { Icon } from "../components/Icon";
import { fd, money, pct, todayIso } from "../lib/util";


export function Dashboard({ go }: { go: (v: string) => void }) {
  const { org, data, project, canManage, canWrite, isAdmin, update, pname } = useOrg();
  const toast = useToast();
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
  const k = d.kpi;
  if (!k.chantiers && project === "all") {
    return (<><Top title="Tableau de bord" sub={org.nom} />
      <div className="panel"><EmptyState title="Aucun chantier pour le moment" text={isAdmin ? "Créez votre premier chantier, ou chargez des données d’exemple dans « Accès & abonnement » pour découvrir la plateforme." : "Un conducteur des travaux ou un administrateur peut créer le premier chantier."}
        action={canManage && <button className="btn" onClick={() => go("proj")}><Icon n="plus" /> Créer un chantier</button>} /></div></>);
  }
  const today = todayIso();
  const todayTasks = (data?.tasks ?? []).filter((t) => t.date === today && (project === "all" || t.project_id === project));
  const lastReports = (data?.reports ?? []).filter((r) => project === "all" || r.project_id === project).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const STATS = ["À faire", "En cours", "Terminé"] as const;
  const next = async (id: string, cur: string) => { try { await update("tasks", id, { statut: STATS[(STATS.indexOf(cur as (typeof STATS)[number]) + 1) % 3] }); } catch (e: any) { toast(e.message, true); } };
  const bpKind = k.pct_budget > 100 ? "bad" : k.pct_budget > 85 ? "warn" : "";
  return (
    <>
      <Top title="Tableau de bord" sub={`${org.nom} · ${fd(today)}`}><ProjectFilter /></Top>
      <div className="tiles">
        <div className="tile"><div className="k">Chantiers suivis</div><div className="v tnum">{k.chantiers}</div><div className="s">{k.en_cours} en cours</div></div>
        <div className="tile good"><div className="k">Avancement moyen</div><div className="v tnum">{pct(k.avancement)}</div><div className="s">moyenne des phases</div></div>
        <div className="tile"><div className="k">Tâches du jour</div><div className="v tnum">{k.taches_jour_faites}/{k.taches_jour}</div><div className="s">terminées</div></div>
        <div className={"tile " + (k.taches_retard ? "bad" : "")}><div className="k">Tâches en retard</div><div className="v tnum">{k.taches_retard}</div><div className="s">à replanifier</div></div>
        <div className={"tile " + bpKind}><div className="k">Budget consommé</div><div className="v tnum">{pct(k.pct_budget)}</div><div className="s tnum">{money(k.depense, org.devise)} sur {money(k.budget_total, org.devise)}</div></div>
        <div className={"tile " + (k.incidents_ouverts ? "warn" : "")}><div className="k">Incidents ouverts</div><div className="v tnum">{k.incidents_ouverts}</div><div className="s">{k.defauts_ouverts} défaut(s) qualité ouvert(s)</div></div>
      </div>
      <div className="hero"><div className="hl">Budget consommé (cumulé)</div><div className="hv tnum">{money(k.depense, org.devise)}</div><div className="hs">sur {money(k.budget_total, org.devise)} prévus, soit {pct(k.pct_budget)} du budget</div></div>
      <div className="grid2">
        <section className="panel"><h3>Budget par poste</h3><BarChart rows={d.budget_par_poste} devise={org.devise} /></section>
        <section className="panel"><h3>Répartition des dépenses</h3><DonutChart rows={d.repartition} devise={org.devise} /></section>
      </div>
      <section className="panel"><h3>Courbe des dépenses</h3><p className="small muted">Dépenses réelles cumulées comparées à un rythme de dépense régulier sur la durée du chantier.</p><LineChart c={d.courbe} devise={org.devise} /></section>
      <div className="grid2">
        <section className="panel"><h3>Tâches du jour</h3>
          {!todayTasks.length ? <div className="empty">Aucune tâche prévue aujourd’hui.</div> : todayTasks.map((t) => (
            <div className="item" key={t.id}><div><div className="t">{t.titre}</div><div className="small muted">{pname(t.project_id)} · {t.assigne || "Non assigné"}</div></div>
              {canWrite ? <button className="btn ghost sm" onClick={() => next(t.id, t.statut)}>{t.statut}</button> : <Pill>{t.statut}</Pill>}</div>))}
        </section>
        <section className="panel"><h3>Avancement vs planning</h3>
          {d.projets.map((p) => (
            <div className="blk" key={p.id}><div className="row between"><b>{p.nom}</b><Pill kind={p.statut === "bad" ? "bad" : ""}>{p.libelle}</Pill></div><Bar value={p.avancement} /><div className="small muted">Réalisé {pct(p.avancement)} · prévu {pct(p.prevu)} à ce jour · fin {fd(p.fin)}</div></div>))}
        </section>
        <section className="panel"><h3>Budget par chantier</h3>
          {d.projets.map((p) => (
            <div className="blk" key={p.id}><div className="row between"><b>{p.nom}</b><span className="small tnum">{money(p.depense, org.devise)} / {money(p.budget, org.devise)}</span></div><Bar value={p.pct_budget} red={p.pct_budget > 100} /></div>))}
        </section>
        <section className="panel"><h3>Derniers rapports</h3>
          {!lastReports.length ? <div className="empty">Aucun rapport.</div> : lastReports.map((r) => (
            <div className="item" key={r.id}><div><div className="t">{fd(r.date)} · {pname(r.project_id)}</div><div className="small">{r.travaux}</div>{r.problemes && <div className="small bad">Problème : {r.problemes}</div>}</div>{r.effectif != null && <Pill>{r.effectif} pers.</Pill>}</div>))}
        </section>
      </div>
    </>
  );
}
