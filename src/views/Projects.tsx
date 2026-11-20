import { useState } from "react";
import { api } from "../lib/api";
import { useOrg } from "../state/org";
import { Bar, Empty, FormModal, Pill, Top, useToast, type FieldDef } from "../components/ui";
import { CHECK, CATS, NATURES, addDays, fd, money, pct, progress, todayIso } from "../lib/util";
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
  const { data, org, canManage, create, update, remove, reload } = useOrg();
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
  const p = data.projects.find((x) => x.id === sel);
  if (p) {
    const phases = data.phases.filter((x) => x.project_id === p.id);
    const checks = data.checks[p.id] ?? {};
    const total = CHECK.reduce((s, g) => s + g.i.length, 0);
    const done = Object.entries(checks).filter(([, v]) => v).length;
    const bud = p.bud ?? {};
    const toggle = async (key: string, value: boolean) => { try { await api.put(`/orgs/${org.id}/checks`, { project_id: p.id, key, value }); await reload(); } catch (e: any) { toast(e.message, true); } };
    const setAv = async (id: string, av: number) => { try { await update("phases", id, { av }); } catch (e: any) { toast(e.message, true); } };
    return (
      <>
        <Top title={p.nom} sub={`${p.nature ?? ""} · ${p.lieu ?? ""}`}>
          <button className="btn ghost" onClick={() => setSel(null)}>← Chantiers</button>
          {canManage && <><button className="btn ghost" onClick={() => setEdit({ row: p })}>Modifier</button>
            <button className="btn danger" onClick={async () => { if (window.confirm("Supprimer ce chantier et toutes ses données ?")) { try { await remove("projects", p.id); setSel(null); toast("Chantier supprimé."); } catch (e: any) { toast(e.message, true); } } }}>Supprimer</button></>}
        </Top>
        <div className="grid2">
          <div className="card"><h3>Fiche</h3>
            <p><b>Maître d’ouvrage :</b> {p.moa || "—"}<br /><b>Maître d’œuvre :</b> {p.moe || "—"}<br /><b>Période :</b> {fd(p.debut)} → {fd(p.fin)}<br /><b>Budget :</b> {money(p.budget, org.devise)}<br /><b>Avancement :</b> {pct(progress(phases))}</p>
            <p><b>Objectifs :</b> {p.objectifs || "—"}</p></div>
          <div className="card"><h3>Budget par poste</h3><table><tbody>{CATS.map((c) => <tr key={c}><td>{c}</td><td className="n">{money(bud[c] ?? 0, org.devise)}</td></tr>)}</tbody></table></div>
        </div>
        <div className="card"><h3>Phases d’exécution</h3>
          <table><thead><tr><th>Phase</th><th>Période</th><th>Avancement</th></tr></thead><tbody>{phases.map((ph) => (
            <tr key={ph.id}><td>{ph.nom}</td><td>{fd(ph.debut)} → {fd(ph.fin)}</td>
              <td style={{ minWidth: 220 }}>{data.role !== "lecteur" ? <div className="row"><input type="range" min={0} max={100} step={5} defaultValue={ph.av} aria-label={`Avancement ${ph.nom}`} onMouseUp={(e) => setAv(ph.id, +(e.target as HTMLInputElement).value)} onKeyUp={(e) => setAv(ph.id, +(e.target as HTMLInputElement).value)} onTouchEnd={(e) => setAv(ph.id, +(e.target as HTMLInputElement).value)} /><span>{ph.av} %</span></div> : <><Bar value={ph.av} /> {ph.av} %</>}</td></tr>))}</tbody></table></div>
        <div className="card"><h3>Dossier du projet — {done}/{total} éléments</h3><Bar value={(done / total) * 100} />
          <div className="grid2" style={{ marginTop: 14 }}>{CHECK.map((g, gi) => <div key={g.g}><b>{g.g}</b>{g.i.map((it, ii) => { const key = `${gi}-${ii}`; return <label className="chk" key={key}><input type="checkbox" disabled={data.role === "lecteur"} checked={!!checks[key]} onChange={(e) => toggle(key, e.target.checked)} />{it}</label>; })}</div>)}</div></div>
        {form}
      </>
    );
  }
  return (
    <>
      <Top title="Chantiers" sub={`${data.projects.length} chantier(s)`}>{canManage && <button className="btn" onClick={() => setEdit({})}>+ Nouveau chantier</button>}</Top>
      {!data.projects.length ? <div className="card"><Empty>Aucun chantier. {canManage ? "Cliquez sur « Nouveau chantier »." : "Un conducteur des travaux ou un administrateur peut en créer."}</Empty></div> :
        <div className="card"><table><thead><tr><th>Chantier</th><th>Lieu</th><th>Période</th><th className="n">Budget</th><th>Avancement</th></tr></thead>
          <tbody>{data.projects.map((x) => { const av = progress(data.phases.filter((ph) => ph.project_id === x.id)); return (
            <tr key={x.id} style={{ cursor: "pointer" }} onClick={() => setSel(x.id)}><td><button className="link" style={{ fontWeight: 600 }}>{x.nom}</button> {x.demo && <Pill kind="warn">exemple</Pill>}</td><td>{x.lieu ?? "—"}</td><td>{fd(x.debut)} → {fd(x.fin)}</td><td className="n">{money(x.budget, org.devise)}</td><td style={{ minWidth: 120 }}><Bar value={av} /> {av} %</td></tr>); })}</tbody></table></div>}
      {form}
    </>
  );
}
