import { useState } from "react";
import { api } from "../lib/api";
import { useOrg } from "../state/org";
import { Icon } from "../components/Icon";
import { Bar, EmptyState, FormModal, Pill, Top, useToast, type FieldDef } from "../components/ui";
import { CHECK, NATURES, addDays, fd, money, pc, planned, progress, schedule, todayIso } from "../lib/util";
import type { Project } from "../lib/types";

const FIELDS: FieldDef[] = [
  { name: "nom", label: "Nom du chantier", required: true },
  { name: "nature", label: "Nature", type: "select", options: NATURES, half: true },
  { name: "lieu", label: "Lieu", half: true },
  { name: "moa", label: "Maître d’ouvrage", half: true },
  { name: "moe", label: "Maître d’œuvre", half: true },
  { name: "budget", label: "Budget total", type: "number", required: true, half: true },
  { name: "debut", label: "Début", type: "date", required: true, half: true },
  { name: "fin", label: "Fin prévue", type: "date", required: true, half: true },
  { name: "objectifs", label: "Objectifs", type: "textarea" },
];

export function Projects() {
  const { data, org, canManage, canWrite, create, update, remove, reload } = useOrg();
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ row?: Project } | null>(null);
  if (!data) return null;
  const clean = (v: Record<string, any>) => ({ nom: v.nom, nature: v.nature || null, lieu: v.lieu || null, moa: v.moa || null, moe: v.moe || null, objectifs: v.objectifs || null, budget: Number(v.budget), debut: v.debut, fin: v.fin });
  const form = edit && (
    <FormModal title={edit.row ? "Modifier le chantier" : "Nouveau chantier"} fields={FIELDS} onClose={() => setEdit(null)}
      initial={edit.row ?? { nature: "Maison", debut: todayIso(), fin: addDays(todayIso(), 180), budget: "" }}
      onSubmit={async (v) => { if (edit.row) await update("projects", edit.row.id, clean(v)); else await create("projects", clean(v)); toast("Chantier enregistré."); }} />
  );
  const del = async (p: Project) => { if (window.confirm("Supprimer ce chantier et toutes ses données ?")) { try { await remove("projects", p.id); setSel(null); toast("Chantier supprimé."); } catch (e: any) { toast(e.message, true); } } };
  const spent = (id: string) => data.expenses.filter((e) => e.project_id === id).reduce((s, e) => s + Number(e.montant), 0);
  const p = data.projects.find((x) => x.id === sel);

  if (p) {
    const checks = data.checks[p.id] ?? {};
    const total = CHECK.reduce((s, g) => s + g.i.length, 0);
    const done = Object.values(checks).filter(Boolean).length;
    const toggle = async (key: string, value: boolean) => { try { await api.put(`/orgs/${org.id}/checks`, { project_id: p.id, key, value }); await reload(); } catch (e: any) { toast(e.message, true); } };
    return (
      <>
        <button className="btn ghost sm back" onClick={() => setSel(null)}><Icon n="back" /> Tous les chantiers</button>
        <div className="grid2">
          <section className="card"><h2>Identification</h2>
            <dl className="kv"><dt>Nom</dt><dd>{p.nom}</dd><dt>Nature</dt><dd>{p.nature || "—"}</dd><dt>Lieu</dt><dd>{p.lieu || "—"}</dd><dt>Maître d’ouvrage</dt><dd>{p.moa || "—"}</dd><dt>Maître d’œuvre</dt><dd>{p.moe || "—"}</dd><dt>Objectifs</dt><dd>{p.objectifs || "—"}</dd><dt>Budget prévisionnel</dt><dd className="tnum">{money(p.budget, org.devise)}</dd><dt>Période</dt><dd>{fd(p.debut)} au {fd(p.fin)}</dd></dl>
            {canManage && <div className="acts"><button className="btn ghost sm" onClick={() => setEdit({ row: p })}><Icon n="edit" /> Modifier</button><button className="btn ghost sm danger-t" onClick={() => del(p)}><Icon n="trash" /> Supprimer</button></div>}
          </section>
          <section className="card"><div className="row between"><h2>Dossier du projet</h2><Pill kind={done === total ? "" : "grey"}>{done}/{total}</Pill></div><Bar value={pc(done, total)} />
            <div style={{ marginTop: 14 }}>{CHECK.map((g, gi) => <div className="check-group" key={g.g}><h3>{g.g}</h3>{g.i.map((it, ii) => { const key = `${gi}-${ii}`; return <label className="chk" key={key}><input type="checkbox" disabled={!canWrite} checked={!!checks[key]} onChange={(e) => toggle(key, e.target.checked)} />{it}</label>; })}</div>)}</div>
          </section>
        </div>
        {form}
      </>
    );
  }
  return (
    <>
      <Top title="Chantiers" sub={`${data.projects.length} chantier(s)`}>{canManage && <button className="btn" onClick={() => setEdit({})}><Icon n="plus" /> Nouveau chantier</button>}</Top>
      {!data.projects.length ? <div className="card"><EmptyState title="Aucun chantier" text={canManage ? "Cliquez sur « Nouveau chantier » pour démarrer." : "Un conducteur des travaux ou un administrateur peut en créer."} /></div> :
        <div className="grid2 cards">{data.projects.map((x) => {
          const av = progress(data.phases.filter((ph) => ph.project_id === x.id)), [c, l] = schedule(av, planned(x));
          return (
            <article className="card" key={x.id}>
              <div className="row between"><h3>{x.nom}</h3><Pill kind={c === "bad" ? "bad" : ""}>{l}</Pill></div>
              <div className="small muted" style={{ margin: "2px 0 12px" }}>{[x.nature, x.lieu].filter(Boolean).join(" · ")} {x.demo && <Pill kind="warn">exemple</Pill>}</div>
              <Bar value={av} />
              <div className="small muted" style={{ margin: "6px 0 10px" }}>Avancement {av} % · {fd(x.debut)} au {fd(x.fin)}</div>
              <div className="small tnum">Budget {money(x.budget, org.devise)} · dépensé {money(spent(x.id), org.devise)}</div>
              <div className="acts"><button className="btn sm" onClick={() => setSel(x.id)}>Ouvrir la fiche</button>
                {canManage && <><button className="icon-btn" onClick={() => setEdit({ row: x })} aria-label="Modifier" title="Modifier"><Icon n="edit" /></button><button className="icon-btn danger" onClick={() => del(x)} aria-label="Supprimer" title="Supprimer"><Icon n="trash" /></button></>}</div>
            </article>);
        })}</div>}
      {form}
    </>
  );
}
